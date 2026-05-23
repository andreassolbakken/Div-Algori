'use strict';

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { initDb, hasSigned, saveSignature, getAllForAudit, getSignature, resetSignatures } = require('./lib/db');
const { generateUnsignedPDF, generateSignedPDF, computeHash } = require('./lib/pdf');
const { renderContractHtml } = require('./lib/contract-html');
const { blocks } = require('./lib/contract');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'unpkg.com'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      frameSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
    },
  },
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const signLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'For mange forsøk. Prøv igjen om en time.' },
});

function checkAdminToken(provided) {
  const admin = process.env.ADMIN_TOKEN;
  if (!admin || !provided) return false;
  const a = Buffer.from(provided), b = Buffer.from(admin);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function getClientIp(req) {
  return req.ip || req.connection.remoteAddress || 'unknown';
}

// ── Home / contract + signing ─────────────────────────────────────────────────
app.get('/', (req, res) => {
  const evelynSig  = getSignature('evelyn');
  const saraSig    = getSignature('sara');
  const evelynSigned = hasSigned('evelyn');
  const saraSigned   = hasSigned('sara');
  const bothSigned   = evelynSigned && saraSigned;
  const contractHtml = renderContractHtml(blocks);

  function statusBadge(signed, sig) {
    if (signed && sig && sig.signed_at) {
      const d = new Date(sig.signed_at).toLocaleDateString('no-NO', { day: 'numeric', month: 'long', year: 'numeric' });
      return `<span class="badge badge-signed">✓ Signert ${d}</span>`;
    }
    return `<span class="badge badge-pending">Venter</span>`;
  }

  function sigArea(party, sig, signed) {
    if (signed && sig && sig.signature_dataurl) {
      return `<div class="ct-sig-box"><img src="${sig.signature_dataurl}" alt="Signatur" class="ct-sig-img"></div>`;
    }
    if (signed) {
      return `<div class="ct-sig-box"><div class="ct-sig-done"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#27ae60" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Signert</div></div>`;
    }
    if (party === 'sara' && !evelynSigned) {
      return `<div class="ct-sig-box"><span class="ct-sig-placeholder">Venter på Evelyns signatur</span></div>`;
    }
    // Inline draw area — no modal
    return `<div class="ct-draw-area" id="draw-${party}">
      <div class="ct-draw-hint" id="hint-${party}">✏️ Tegn signaturen din her</div>
      <canvas id="canvas-${party}" style="display:block;width:100%;touch-action:none;cursor:crosshair;"></canvas>
      <div class="ct-draw-actions">
        <button class="ct-draw-clear" onclick="clearDraw('${party}')">Tøm</button>
        <span class="ct-draw-err" id="err-${party}"></span>
        <button class="ct-draw-submit" id="submit-${party}" disabled onclick="submitDraw('${party}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Lagre signatur
        </button>
      </div>
    </div>`;
  }

  function sigMeta(sig, signed) {
    if (!signed || !sig || !sig.signed_at) return '';
    return new Date(sig.signed_at).toLocaleString('no-NO', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  const html = `<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Konsulentavtale – Evelyn Floan og Sara Endestad</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body class="sign-page">

<header class="sign-header">
  <div class="sign-header-inner">
    <div class="sign-header-brand">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      Konsulentavtale
    </div>
    <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;justify-content:flex-end;">
      ${statusBadge(evelynSigned, evelynSig)}
      ${statusBadge(saraSigned, saraSig)}
    </div>
  </div>
</header>

<main class="sign-main">
  ${bothSigned ? `<div class="already-banner" style="margin-bottom:1rem;">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
    Kontrakten er fullt signert. &nbsp;<a href="/download" style="font-weight:700;color:var(--blue);">Last ned signert PDF →</a>
  </div>` : ''}

  <div class="contract-paper">
    ${contractHtml}

    <section class="ct-sig-section">
      <h2 class="ct-h2">20. Signaturer</h2>
      <p class="ct-para">Klikk på ditt signaturfelt for å tegne signaturen din.</p>
      <div class="ct-sig-columns">
        <div class="ct-sig-col ${!evelynSigned ? 'ct-sig-col--active' : ''}">
          <div class="ct-sig-role">For Oppdragsgiver</div>
          ${sigArea('evelyn', evelynSig, evelynSigned)}
          <div class="ct-sig-underline"></div>
          <div class="ct-sig-name">Evelyn Floan</div>
          <div class="ct-sig-company">EVELYN FLOAN · orgnr 917 013 101</div>
          <div class="ct-sig-meta">${sigMeta(evelynSig, evelynSigned)}</div>
        </div>
        <div class="ct-sig-col ${evelynSigned && !saraSigned ? 'ct-sig-col--active' : ''}">
          <div class="ct-sig-role">For Oppdragstaker</div>
          ${sigArea('sara', saraSig, saraSigned)}
          <div class="ct-sig-underline"></div>
          <div class="ct-sig-name">Sara Katarina Petru Endestad</div>
          <div class="ct-sig-company">ENDESTAD · orgnr 924 590 904</div>
          <div class="ct-sig-meta">${sigMeta(saraSig, saraSigned)}</div>
        </div>
      </div>
      ${!evelynSigned ? `<p class="ct-para" style="margin-top:1rem;color:var(--muted);font-size:0.82rem;">Evelyn signerer først, deretter Sara.</p>` : ''}
    </section>
  </div>
</main>

<script src="/signature_pad.min.js"></script>
<script>
var pads = {};

function setupPad(party) {
  var canvas = document.getElementById('canvas-' + party);
  if (!canvas || pads[party]) return;
  var w = canvas.offsetWidth;
  if (!w) return; // not in DOM yet
  var ratio = window.devicePixelRatio || 1;
  canvas.width  = w * ratio;
  canvas.height = 160 * ratio;
  canvas.style.height = '160px';
  canvas.getContext('2d').scale(ratio, ratio);
  var p = new SignaturePad(canvas, {
    backgroundColor: 'rgb(255,255,255)',
    penColor: '#0f1e40',
    minWidth: 1.5,
    maxWidth: 3.5
  });
  p.addEventListener('beginStroke', function() {
    var h = document.getElementById('hint-' + party);
    if (h) h.style.display = 'none';
  });
  p.addEventListener('endStroke', function() {
    var btn = document.getElementById('submit-' + party);
    if (btn) btn.disabled = p.isEmpty();
  });
  pads[party] = p;
}

function clearDraw(party) {
  var p = pads[party];
  if (p) { p.clear(); }
  var h = document.getElementById('hint-' + party);
  if (h) h.style.display = 'flex';
  var btn = document.getElementById('submit-' + party);
  if (btn) btn.disabled = true;
}

async function submitDraw(party) {
  var p = pads[party];
  if (!p || p.isEmpty()) return;
  var btn = document.getElementById('submit-' + party);
  var errEl = document.getElementById('err-' + party);
  btn.disabled = true; btn.textContent = 'Lagrer…'; errEl.textContent = '';
  try {
    var res = await fetch('/sign/' + party, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signature_dataurl: p.toDataURL('image/png') })
    });
    var data = await res.json();
    if (data.ok) { window.location.href = '/signed/' + party; return; }
    errEl.textContent = data.error === 'evelyn_must_sign_first' ? 'Evelyn må signere først.' :
                        data.error === 'already_signed' ? 'Allerede signert.' : 'Feil. Prøv igjen.';
    btn.disabled = false; btn.textContent = 'Lagre signatur';
  } catch(e) {
    errEl.textContent = 'Nettverksfeil.'; btn.disabled = false; btn.textContent = 'Lagre signatur';
  }
}

// window.load = all resources done, layout complete, offsetWidth is real
window.addEventListener('load', function() {
  ['evelyn','sara'].forEach(setupPad);
});
</script>

</body>
</html>`;

  res.send(html);
});

// ── Status JSON ───────────────────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  const evelynSig = getSignature('evelyn');
  const saraSig   = getSignature('sara');
  res.json({
    evelyn: { signed: hasSigned('evelyn'), signed_at: evelynSig?.signed_at || null },
    sara:   { signed: hasSigned('sara'),   signed_at: saraSig?.signed_at   || null },
    both_signed: hasSigned('evelyn') && hasSigned('sara'),
  });
});

// ── Preview PDF ───────────────────────────────────────────────────────────────
app.get('/preview', async (req, res) => {
  try {
    const buf = await generateUnsignedPDF();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="konsulentavtale-preview.pdf"');
    res.send(buf);
  } catch (err) {
    console.error('Preview error:', err);
    res.status(500).send('Feil ved generering av PDF.');
  }
});

// ── POST sign (no token required) ────────────────────────────────────────────
app.post('/sign/:party', signLimiter, async (req, res) => {
  const party = req.params.party;
  if (!['evelyn', 'sara'].includes(party)) return res.status(404).json({ error: 'Ikke funnet.' });
  if (hasSigned(party)) return res.status(409).json({ error: 'already_signed' });
  if (party === 'sara' && !hasSigned('evelyn')) {
    return res.status(403).json({ error: 'evelyn_must_sign_first' });
  }

  const { signature_dataurl } = req.body;
  if (!signature_dataurl || typeof signature_dataurl !== 'string') {
    return res.status(400).json({ error: 'Mangler signatur.' });
  }
  if (!signature_dataurl.startsWith('data:image/png;base64,')) {
    return res.status(400).json({ error: 'Ugyldig signaturformat.' });
  }
  const decoded = Buffer.from(signature_dataurl.replace('data:image/png;base64,', ''), 'base64');
  if (decoded.length < 500) {
    return res.status(400).json({ error: 'Signaturen er for liten. Tegn en tydelig signatur.' });
  }

  try {
    const unsignedBuf = await generateUnsignedPDF();
    const pdf_hash = computeHash(unsignedBuf);
    await saveSignature(party, {
      signature_dataurl,
      signed_at: new Date().toISOString(),
      signer_ip: getClientIp(req),
      user_agent: req.headers['user-agent'] || '',
      pdf_hash,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Sign error:', err);
    res.status(500).json({ error: 'Feil ved lagring av signatur.' });
  }
});

// ── Signed confirmation ───────────────────────────────────────────────────────
app.get('/signed/:party', (req, res) => {
  const party = req.params.party;
  if (!['evelyn', 'sara'].includes(party)) return res.status(404).send('Ikke funnet.');
  res.sendFile(path.join(__dirname, 'public', 'signed.html'));
});

app.get('/api/signed-info/:party', (req, res) => {
  const party = req.params.party;
  if (!['evelyn', 'sara'].includes(party)) return res.status(404).json({ error: 'Ikke funnet.' });
  const sig = getSignature(party);
  if (!sig || !sig.signed_at) return res.status(404).json({ error: 'Ikke signert.' });
  res.json({
    party,
    full_name: sig.full_name,
    signed_at: sig.signed_at,
    both_signed: hasSigned('evelyn') && hasSigned('sara'),
  });
});

// ── Download signed PDF ───────────────────────────────────────────────────────
app.get('/download', async (req, res) => {
  if (!hasSigned('evelyn') || !hasSigned('sara')) {
    return res.status(403).send('Kontrakten er ikke fullt signert ennå.');
  }
  try {
    const buf = await generateSignedPDF();
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="konsulentavtale-evelyn-sara-signert-${date}.pdf"`);
    res.send(buf);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).send('Feil ved generering av signert PDF.');
  }
});

// ── Audit log ─────────────────────────────────────────────────────────────────
app.get('/audit', (req, res) => {
  if (!checkAdminToken(req.query.token)) return res.status(404).send('Ikke funnet.');
  res.json(getAllForAudit());
});

// ── Admin reset (clears all signatures so contract can be re-signed) ──────────
app.post('/admin/reset', (req, res) => {
  if (!checkAdminToken(req.query.token)) return res.status(404).send('Ikke funnet.');
  resetSignatures();
  res.json({ ok: true, message: 'Alle signaturer er nullstilt.' });
});

app.use((req, res) => res.status(404).send('Ikke funnet.'));

initDb().then(() => {
  app.listen(PORT, () => console.log(`Server kjører på port ${PORT}`));
}).catch(err => {
  console.error('DB init failed:', err);
  process.exit(1);
});

module.exports = app;
