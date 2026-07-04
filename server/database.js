
const initSqlJs = require('sql.js');
const fs        = require('fs');
const path      = require('path');

const DB_PATH = path.join(__dirname, 'dolisync.db');
let db = null;

async function init() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
    console.log(` Base SQLite chargée : ${DB_PATH}`);
  } else {
    db = new SQL.Database();
    console.log(` Nouvelle base SQLite créée : ${DB_PATH}`);
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS holiday_public (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      dateHoliday TEXT    NOT NULL,
      label       TEXT    NOT NULL DEFAULT '',
      fkUser      INTEGER,
      typePeriode TEXT    NOT NULL DEFAULT 'JOURNEE_ENTIERE'
    )
  `);

  save(); 
}

function save() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function query(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function run(sql, params = []) {
  db.run(sql, params);
  save(); 
}

function lastInsertId() {
  return db.exec('SELECT last_insert_rowid()')[0].values[0][0];
}

module.exports = { init, query, run, lastInsertId };
