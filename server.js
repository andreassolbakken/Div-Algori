'use strict';

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { initDb, hasSigned, saveSignature, getAllForAudit, getSignature } = require('./lib/db');
const { generateUnsignedPDF, generateSignedPDF, computeHash } = require('./lib/pdf');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'unpkg.com'],
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

  res.sendFile(path.join(__dirname, 'public', 'sign.html'));
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
