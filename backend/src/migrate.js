const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('./db');

async function migrate() {
  const migsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migsDir).sort();
  await pool.query(`CREATE TABLE IF NOT EXISTS _migrations (name VARCHAR(100) PRIMARY KEY, ran_at TIMESTAMPTZ DEFAULT NOW())`);
  for (const file of files) {
    const { rows } = await pool.query('SELECT name FROM _migrations WHERE name=$1', [file]);
    if (rows.length) continue;
    let sql = fs.readFileSync(path.join(migsDir, file), 'utf8');
    if (file === '002_seed.sql') {
      const hash = await bcrypt.hash('Admin2026!', 10);
      sql = sql.replace('$2b$10$PLACEHOLDER_REPLACED_AT_MIGRATE', hash);
    }
    await pool.query(sql);
    await pool.query('INSERT INTO _migrations(name) VALUES($1)', [file]);
    console.log('✅ Migration ran:', file);
  }
  console.log('✅ All migrations done');
}

if (require.main === module) {
  migrate().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}

module.exports = migrate;
