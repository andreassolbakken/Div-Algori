'use strict';

const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || '/data';
const DB_PATH = path.join(DATA_DIR, 'state.db');

let _db = null;

async function initDb() {
  if (_db) return;

  fs.mkdirSync(DATA_DIR, { recursive: true });

  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    _db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    _db = new SQL.Database();
  }

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
}

function _persist() {
  const data = _db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
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

module.exports = { initDb, getSignature, hasSigned, saveSignature, getAllForAudit };
