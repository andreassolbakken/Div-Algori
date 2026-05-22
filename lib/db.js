const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || '/data';
const DB_PATH = path.join(DATA_DIR, 'state.db');

let _db;

function getDb() {
  if (_db) return _db;

  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {}

  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');

  _db.exec(`
    CREATE TABLE IF NOT EXISTS signatures (
      party TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      signature_dataurl TEXT,
      signed_at TEXT,
      signer_ip TEXT,
      user_agent TEXT,
      pdf_hash TEXT
    );

    INSERT OR IGNORE INTO signatures (party, full_name) VALUES
      ('evelyn', 'Evelyn Floan'),
      ('sara', 'Sara Katarina Petru Endestad');
  `);

  return _db;
}

function getSignature(party) {
  return getDb().prepare('SELECT * FROM signatures WHERE party = ?').get(party);
}

function hasSigned(party) {
  const row = getSignature(party);
  return !!(row && row.signed_at);
}

function saveSignature(party, { signature_dataurl, signed_at, signer_ip, user_agent, pdf_hash }) {
  getDb().prepare(`
    UPDATE signatures
    SET signature_dataurl = ?, signed_at = ?, signer_ip = ?, user_agent = ?, pdf_hash = ?
    WHERE party = ?
  `).run(signature_dataurl, signed_at, signer_ip, user_agent, pdf_hash, party);
}

function getAllForAudit() {
  return getDb().prepare(`
    SELECT party, full_name, signed_at, signer_ip, user_agent, pdf_hash
    FROM signatures
  `).all();
}

module.exports = { getSignature, hasSigned, saveSignature, getAllForAudit };
