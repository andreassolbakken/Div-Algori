'use strict';

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { initDb, hasSigned, saveSignature, getAllForAudit, getSignature } = require('./lib/db');
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
    return `<div class="ct-sig-box ct-sig-box--clickable" onclick="openSigModal('${party}')" role="button" tabindex="0">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
      <span style="font-size:0.82rem;font-weight:600;">Klikk for å signere</span>
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

<!-- Signature modal -->
<div class="modal-overlay" id="sig-modal" style="display:none">
  <div class="modal-box">
    <button class="modal-close" onclick="closeModal()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
    <div class="modal-header">
      <h2>Tegn din signatur</h2>
      <p class="modal-sub" id="modal-name"></p>
    </div>
    <div class="modal-canvas-wrap">
      <canvas id="sig-canvas"></canvas>
      <div class="canvas-hint" id="canvas-hint">Tegn signaturen din her</div>
    </div>
    <div class="modal-footer" style="margin-top:1rem;">
      <button class="btn btn-ghost" onclick="clearPad()">Tøm</button>
      <div style="display:flex;align-items:center;gap:0.75rem;">
        <div class="spinner" id="sig-spinner"></div>
        <button class="btn btn-confirm" id="confirm-btn" disabled onclick="submitSig()">Bekreft signatur</button>
      </div>
    </div>
    <div style="font-size:0.78rem;color:var(--muted);margin-top:0.75rem;text-align:center;" id="sig-err"></div>
  </div>
</div>

<script src="https://unpkg.com/signature_pad@4/dist/signature_pad.umd.min.js"></script>
<script>
let pad = null, activeParty = null;

function openSigModal(party) {
  activeParty = party;
  const names = { evelyn: 'Evelyn Floan', sara: 'Sara Katarina Petru Endestad' };
  document.getElementById('modal-name').textContent = names[party];
  document.getElementById('confirm-btn').disabled = true;
  document.getElementById('sig-err').textContent = '';
  document.getElementById('sig-spinner').style.display = 'none';
  document.getElementById('sig-modal').style.display = 'flex';
  initPad();
}

function initPad() {
  const canvas = document.getElementById('sig-canvas');
  resizeCanvas(canvas);
  if (pad) {
    pad.clear();
    document.getElementById('canvas-hint').style.opacity = '1';
  } else {
    pad = new SignaturePad(canvas, { backgroundColor: 'rgb(255,255,255)', penColor: '#0f1e40', minWidth: 1.5, maxWidth: 3.5 });
    pad.addEventListener('beginStroke', () => { document.getElementById('canvas-hint').style.opacity = '0'; });
    pad.addEventListener('endStroke', () => { document.getElementById('confirm-btn').disabled = pad.isEmpty(); });
    window.addEventListener('resize', () => {
      const d = pad.toData(); resizeCanvas(canvas); pad.clear();
      if (d && d.length) pad.fromData(d);
      document.getElementById('confirm-btn').disabled = pad.isEmpty();
    });
  }
}

function clearPad() {
  if (pad) pad.clear();
  document.getElementById('canvas-hint').style.opacity = '1';
  document.getElementById('confirm-btn').disabled = true;
}

function closeModal() {
  document.getElementById('sig-modal').style.display = 'none';
}

async function submitSig() {
  const dataUrl = pad.toDataURL('image/png');
  const btn = document.getElementById('confirm-btn');
  const spinner = document.getElementById('sig-spinner');
  const errEl = document.getElementById('sig-err');
  btn.disabled = true;
  spinner.style.display = 'inline-block';
  errEl.textContent = '';
  try {
    const res = await fetch('/sign/' + activeParty, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signature_dataurl: dataUrl })
    });
    const data = await res.json();
    if (data.ok) {
      window.location.href = '/signed/' + activeParty;
      return;
    }
    const msg = data.error === 'evelyn_must_sign_first' ? 'Evelyn må signere før Sara.' :
                data.error === 'already_signed' ? 'Allerede signert.' : 'Noe gikk galt. Prøv igjen.';
    errEl.textContent = msg;
    btn.disabled = false;
  } catch(e) {
    errEl.textContent = 'Nettverksfeil. Prøv igjen.';
    btn.disabled = false;
  }
  spinner.style.display = 'none';
}

document.getElementById('sig-modal').addEventListener('click', e => {
  if (e.target.id === 'sig-modal') closeModal();
});

function resizeCanvas(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const w = canvas.parentElement.clientWidth;
  const h = Math.max(160, Math.round(w * 0.38));
  canvas.width = w * ratio; canvas.height = h * ratio;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  canvas.getContext('2d').scale(ratio, ratio);
}
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

app.use((req, res) => res.status(404).send('Ikke funnet.'));

initDb().then(() => {
  app.listen(PORT, () => console.log(`Server kjører på port ${PORT}`));
}).catch(err => {
  console.error('DB init failed:', err);
  process.exit(1);
});

module.exports = app;
