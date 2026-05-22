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
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'For mange forsøk. Prøv igjen om en time.' },
});

function timingSafeCompare(a, b) {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // still do comparison to avoid timing leak on length
    crypto.timingSafeEqual(bufA, Buffer.alloc(bufA.length));
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function checkToken(provided, envToken) {
  return timingSafeCompare(provided, envToken);
}

function getClientIp(req) {
  return req.ip || req.connection.remoteAddress || 'unknown';
}

// ── Status page ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'status.html'));
});

app.get('/api/status', (req, res) => {
  const evelynSigned = hasSigned('evelyn');
  const saraSigned = hasSigned('sara');
  const evelynSig = getSignature('evelyn');
  const saraSig = getSignature('sara');
  res.json({
    evelyn: { signed: evelynSigned, signed_at: evelynSig?.signed_at || null },
    sara: { signed: saraSigned, signed_at: saraSig?.signed_at || null },
    both_signed: evelynSigned && saraSigned,
  });
});

// ── Contract HTML ─────────────────────────────────────────────────────────────
app.get('/api/contract-html', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderContractHtml(blocks));
});

// ── Preview ──────────────────────────────────────────────────────────────────
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

// ── Sign pages ────────────────────────────────────────────────────────────────
app.get('/sign/:party', (req, res) => {
  const party = req.params.party;
  if (!['evelyn', 'sara'].includes(party)) return res.status(404).send('Ikke funnet.');

  const token = req.query.token;
  const envToken = party === 'evelyn' ? process.env.EVELYN_TOKEN : process.env.SARA_TOKEN;
  if (!checkToken(token, envToken)) return res.status(404).send('Ikke funnet.');

  const evelynSig = getSignature('evelyn');
  const saraSig = getSignature('sara');
  const evelynSigned = hasSigned('evelyn');
  const saraSigned = hasSigned('sara');
  const currentSig = party === 'evelyn' ? evelynSig : saraSig;
  const alreadySigned = party === 'evelyn' ? evelynSigned : saraSigned;
  const mustWait = party === 'sara' && !evelynSigned;
  const contractHtml = renderContractHtml(blocks);

  function sigBox(p, sig, signed) {
    if (signed && sig && sig.signature_dataurl) {
      return `<img src="${sig.signature_dataurl}" alt="Signatur" class="ct-sig-img">`;
    }
    if (signed) {
      return `<div class="ct-sig-done"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#27ae60" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Signert</div>`;
    }
    if (p === party && !alreadySigned && !mustWait) {
      return `<span class="ct-sig-placeholder" id="sig-preview-placeholder">Din signatur vises her</span>`;
    }
    return `<span class="ct-sig-placeholder">Signatur</span>`;
  }

  function sigMeta(sig, signed) {
    if (!signed || !sig || !sig.signed_at) return '';
    const d = new Date(sig.signed_at);
    return d.toLocaleString('no-NO', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  const activeClass = !alreadySigned && !mustWait ? 'ct-sig-col--active' : '';

  const html = `<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Signer konsulentavtale</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body class="sign-page">

<header class="sign-header">
  <div class="sign-header-inner">
    <div class="sign-header-brand">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      Konsulentavtale
    </div>
    <div class="sign-header-party">${currentSig ? currentSig.full_name : ''}</div>
  </div>
</header>

<main class="sign-main">
  ${mustWait ? `<div class="wait-banner"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Venter på Evelyns signatur — du kan lese kontrakten, men kan ikke signere ennå.</div>` : ''}
  ${alreadySigned ? `<div class="already-banner"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Du har allerede signert denne avtalen (${sigMeta(currentSig, true)}).${hasSigned('evelyn') && hasSigned('sara') ? ' <a href="/download">Last ned signert kontrakt →</a>' : ''}</div>` : ''}

  <div class="contract-paper">
    ${contractHtml}

    <section class="ct-sig-section">
      <h2 class="ct-h2">20. Signaturer</h2>
      <p class="ct-para">Avtalen er signert elektronisk. Begge parter bekrefter å ha lest og godkjent innholdet.</p>
      <div class="ct-sig-columns">
        <div class="ct-sig-col ${party === 'evelyn' ? activeClass : ''}">
          <div class="ct-sig-role">For Oppdragsgiver</div>
          <div class="ct-sig-box" id="evelyn-sig-box">${sigBox('evelyn', evelynSig, evelynSigned)}</div>
          <div class="ct-sig-underline"></div>
          <div class="ct-sig-name">Evelyn Floan</div>
          <div class="ct-sig-company">EVELYN FLOAN · orgnr 917 013 101</div>
          <div class="ct-sig-meta">${sigMeta(evelynSig, evelynSigned)}</div>
        </div>
        <div class="ct-sig-col ${party === 'sara' ? activeClass : ''}">
          <div class="ct-sig-role">For Oppdragstaker</div>
          <div class="ct-sig-box" id="sara-sig-box">${sigBox('sara', saraSig, saraSigned)}</div>
          <div class="ct-sig-underline"></div>
          <div class="ct-sig-name">Sara Katarina Petru Endestad</div>
          <div class="ct-sig-company">ENDESTAD · orgnr 924 590 904</div>
          <div class="ct-sig-meta">${sigMeta(saraSig, saraSigned)}</div>
        </div>
      </div>
    </section>
  </div>
</main>

${!alreadySigned && !mustWait ? `
<div class="action-bar" id="action-bar">
  <label class="action-bar-check">
    <input type="checkbox" id="read-check">
    <span>Jeg har lest og godkjent avtalen</span>
  </label>
  <button class="btn btn-sign" id="sign-btn" disabled>
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
    Signer avtalen
  </button>
</div>

<div class="action-bar action-bar--signed" id="submit-bar" style="display:none">
  <div class="submit-status">
    <span class="submit-check-icon">✓</span>
    <span>Signatur klar</span>
  </div>
  <div style="display:flex;align-items:center;gap:0.75rem;">
    <button class="btn btn-ghost-small" id="redo-btn">Tegn på nytt</button>
    <div class="spinner" id="spinner"></div>
    <button class="btn btn-sign" id="submit-btn">Send inn og bekreft</button>
  </div>
</div>
<div class="form-error" id="error-msg" style="display:none"></div>

<div class="modal-overlay" id="modal" style="display:none">
  <div class="modal-box">
    <button class="modal-close" id="modal-close" aria-label="Lukk">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
    <div class="modal-header">
      <h2>Tegn din signatur</h2>
      <p class="modal-sub">${currentSig ? currentSig.full_name : ''}</p>
    </div>
    <div class="modal-canvas-wrap" id="canvas-wrap">
      <canvas id="sig-canvas"></canvas>
      <div class="canvas-hint" id="canvas-hint">Tegn signaturen din her</div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="clear-btn">Tøm</button>
      <button class="btn btn-confirm" id="confirm-btn" disabled>Bekreft signatur</button>
    </div>
  </div>
</div>

<script src="https://unpkg.com/signature_pad@4/dist/signature_pad.umd.min.js"></script>
<script>
const party = ${JSON.stringify(party)};
const token = ${JSON.stringify(token)};
let signaturePad, capturedDataUrl;

const checkbox = document.getElementById('read-check');
const signBtn = document.getElementById('sign-btn');
checkbox.addEventListener('change', () => { signBtn.disabled = !checkbox.checked; });
signBtn.addEventListener('click', openModal);

document.getElementById('redo-btn').addEventListener('click', () => {
  capturedDataUrl = null;
  document.getElementById(party + '-sig-box').innerHTML = '<span class="ct-sig-placeholder">Din signatur vises her</span>';
  document.getElementById('submit-bar').style.display = 'none';
  document.getElementById('action-bar').style.display = '';
  signBtn.disabled = !checkbox.checked;
});

document.getElementById('submit-btn').addEventListener('click', submitSignature);

function openModal() {
  document.getElementById('modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  if (!signaturePad) initPad();
  else { signaturePad.clear(); document.getElementById('confirm-btn').disabled = true; document.getElementById('canvas-hint').style.opacity = '1'; }
}

function initPad() {
  const canvas = document.getElementById('sig-canvas');
  resizeCanvas(canvas);
  signaturePad = new SignaturePad(canvas, { backgroundColor: 'rgb(255,255,255)', penColor: '#0f1e40', minWidth: 1.5, maxWidth: 3.5 });
  signaturePad.addEventListener('beginStroke', () => { document.getElementById('canvas-hint').style.opacity = '0'; });
  signaturePad.addEventListener('endStroke', () => { document.getElementById('confirm-btn').disabled = signaturePad.isEmpty(); });
  document.getElementById('clear-btn').addEventListener('click', () => { signaturePad.clear(); document.getElementById('confirm-btn').disabled = true; document.getElementById('canvas-hint').style.opacity = '1'; });
  document.getElementById('confirm-btn').addEventListener('click', confirmSignature);
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
  window.addEventListener('resize', () => { const d = signaturePad.toData(); resizeCanvas(canvas); signaturePad.clear(); if (d && d.length) signaturePad.fromData(d); document.getElementById('confirm-btn').disabled = signaturePad.isEmpty(); });
}

function confirmSignature() {
  capturedDataUrl = signaturePad.toDataURL('image/png');
  document.getElementById(party + '-sig-box').innerHTML = '<img src="' + capturedDataUrl + '" alt="Signatur" class="ct-sig-img">';
  closeModal();
  document.getElementById('sig-section').scrollIntoView({ behavior: 'smooth', block: 'center' });
  document.getElementById('action-bar').style.display = 'none';
  document.getElementById('submit-bar').style.display = '';
}

async function submitSignature() {
  if (!capturedDataUrl) return;
  const submitBtn = document.getElementById('submit-btn');
  const spinner = document.getElementById('spinner');
  const errorMsg = document.getElementById('error-msg');
  submitBtn.disabled = true; spinner.style.display = 'inline-block'; errorMsg.style.display = 'none';
  try {
    const res = await fetch('/sign/' + party + '?token=' + encodeURIComponent(token), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signature_dataurl: capturedDataUrl }),
    });
    const data = await res.json();
    if (data.ok && data.redirect) { window.location.href = data.redirect; return; }
    errorMsg.textContent = data.error || 'Noe gikk galt. Prøv igjen.';
    errorMsg.style.display = 'block';
    submitBtn.disabled = false;
  } catch { errorMsg.textContent = 'Nettverksfeil. Prøv igjen.'; errorMsg.style.display = 'block'; submitBtn.disabled = false; }
  spinner.style.display = 'none';
}

function closeModal() { document.getElementById('modal').style.display = 'none'; document.body.style.overflow = ''; }

function resizeCanvas(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const w = canvas.parentElement.clientWidth;
  const h = Math.max(150, Math.round(w * 0.33));
  canvas.width = w * ratio; canvas.height = h * ratio;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  canvas.getContext('2d').scale(ratio, ratio);
}
</script>
` : ''}

</body>
</html>`;

  res.send(html);
});

app.get('/api/sign-info/:party', (req, res) => {
  const party = req.params.party;
  if (!['evelyn', 'sara'].includes(party)) return res.status(404).json({ error: 'Ikke funnet.' });

  const token = req.query.token;
  const envToken = party === 'evelyn' ? process.env.EVELYN_TOKEN : process.env.SARA_TOKEN;
  if (!checkToken(token, envToken)) return res.status(404).json({ error: 'Ikke funnet.' });

  if (party === 'sara' && !hasSigned('evelyn')) {
    return res.json({ error: 'evelyn_must_sign_first' });
  }

  const signed = hasSigned(party);
  const sig = getSignature(party);
  res.json({
    party,
    full_name: sig?.full_name,
    already_signed: signed,
    signed_at: sig?.signed_at || null,
  });
});

// ── POST sign ────────────────────────────────────────────────────────────────
app.post('/sign/:party', signLimiter, async (req, res) => {
  const party = req.params.party;
  if (!['evelyn', 'sara'].includes(party)) return res.status(404).json({ error: 'Ikke funnet.' });

  const token = req.query.token;
  const envToken = party === 'evelyn' ? process.env.EVELYN_TOKEN : process.env.SARA_TOKEN;
  if (!checkToken(token, envToken)) return res.status(404).json({ error: 'Ikke funnet.' });

  if (hasSigned(party)) return res.status(409).json({ error: 'already_signed' });

  if (party === 'sara' && !hasSigned('evelyn')) {
    return res.status(403).json({ error: 'evelyn_must_sign_first' });
  }

  const { signature_dataurl } = req.body;
  if (!signature_dataurl || typeof signature_dataurl !== 'string') {
    return res.status(400).json({ error: 'Mangler signatur.' });
  }

  // Validate it's a PNG dataurl
  if (!signature_dataurl.startsWith('data:image/png;base64,')) {
    return res.status(400).json({ error: 'Ugyldig signaturformat.' });
  }

  // Validate non-trivial (>500 bytes decoded)
  const base64Part = signature_dataurl.replace('data:image/png;base64,', '');
  const decoded = Buffer.from(base64Part, 'base64');
  if (decoded.length < 500) {
    return res.status(400).json({ error: 'Signaturen er for liten. Vennligst tegn en tydelig signatur.' });
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

    res.json({ ok: true, redirect: `/signed/${party}` });
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

// ── Download ─────────────────────────────────────────────────────────────────
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

// ── Audit ─────────────────────────────────────────────────────────────────────
app.get('/audit', (req, res) => {
  const token = req.query.token;
  if (!checkToken(token, process.env.ADMIN_TOKEN)) return res.status(404).send('Ikke funnet.');
  const rows = getAllForAudit();
  res.json(rows);
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).send('Ikke funnet.');
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server kjører på port ${PORT}`);
  });
}).catch(err => {
  console.error('DB init failed:', err);
  process.exit(1);
});

module.exports = app;
