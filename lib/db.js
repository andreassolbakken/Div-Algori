'use strict';

const path = require('path');
const fs = require('fs');

let _dbPath = null;
let _db = null;

function resolveDataDir() {
  const preferred = process.env.DATA_DIR || '/data';
  try {
    fs.mkdirSync(preferred, { recursive: true });
    fs.accessSync(preferred, fs.constants.W_OK);
    return preferred;
  } catch {
    const fallback = path.join(__dirname, '..', 'data');
    fs.mkdirSync(fallback, { recursive: true });
    console.warn(`[db] /data not writable, using fallback: ${fallback}`);
    return fallback;
  }
}

async function initDb() {
  if (_db) return;

  const dataDir = resolveDataDir();
  _dbPath = path.join(dataDir, 'state.db');

  const initSqlJs = require('sql.js');
  const sqlJsDist = path.dirname(require.resolve('sql.js'));
  const SQL = await initSqlJs({
    locateFile: file => path.join(sqlJsDist, file),
  });

  _db = fs.existsSync(_dbPath)
    ? new SQL.Database(fs.readFileSync(_dbPath))
    : new SQL.Database();

  _db.run(`
    CREATE TABLE IF NOT EXISTS signatures (
      party TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      signature_dataurl TEXT,
      signed_at TEXT,
      signer_ip TEXT,
      user_agent TEXT,
      pdf_hash TEXT
    )
  `);
  _db.run(`INSERT OR IGNORE INTO signatures (party, full_name) VALUES ('evelyn', 'Evelyn Floan')`);
  _db.run(`INSERT OR IGNORE INTO signatures (party, full_name) VALUES ('sara', 'Sara Katarina Petru Endestad')`);

  _persist();
  console.log(`[db] ready at ${_dbPath}`);
}

function _persist() {
  fs.writeFileSync(_dbPath, Buffer.from(_db.export()));
}

function _queryOne(sql, params) {
  const stmt = _db.prepare(sql);
  stmt.bind(params);
  const result = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return result;
}

function _queryAll(sql, params) {
  const stmt = _db.prepare(sql);
  if (params) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function getSignature(party) {
  return _queryOne('SELECT * FROM signatures WHERE party = ?', [party]);
}

function hasSigned(party) {
  const row = getSignature(party);
  return !!(row && row.signed_at);
}

function saveSignature(party, { signature_dataurl, signed_at, signer_ip, user_agent, pdf_hash }) {
  _db.run(
    `UPDATE signatures SET signature_dataurl=?, signed_at=?, signer_ip=?, user_agent=?, pdf_hash=? WHERE party=?`,
    [signature_dataurl, signed_at, signer_ip, user_agent, pdf_hash, party]
  );
  _persist();
}

function getAllForAudit() {
  return _queryAll('SELECT party, full_name, signed_at, signer_ip, user_agent, pdf_hash FROM signatures');
}

function resetSignatures() {
  _db.run(`UPDATE signatures SET signature_dataurl=NULL, signed_at=NULL, signer_ip=NULL, user_agent=NULL, pdf_hash=NULL`);
  _persist();
}

module.exports = { initDb, getSignature, hasSigned, saveSignature, getAllForAudit, resetSignatures };
