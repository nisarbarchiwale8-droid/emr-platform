// Boots a local embedded PostgreSQL instance for development.
// Real PostgreSQL — data persisted under backend/.pgdata, listening on 5433.
import EmbeddedPostgres from 'embedded-postgres';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '..', '.pgdata');

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'emr',
  password: 'emr',
  port: 5433,
  persistent: true,
});

const command = process.argv[2];

async function start() {
  const fresh = !fs.existsSync(dataDir);
  if (fresh) {
    console.log('Initializing PostgreSQL cluster...');
    await pg.initialise();
  }
  await pg.start();
  console.log('PostgreSQL started on port 5433');

  if (fresh) {
    await pg.createDatabase('emr_db');
    console.log('Database emr_db created');
  }
  // Keep process alive
  process.stdin.resume();
  const shutdown = async () => { await pg.stop(); process.exit(0); };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (command === 'start') {
  start().catch((e) => { console.error(e); process.exit(1); });
} else {
  console.error('Usage: node scripts/db.mjs start');
  process.exit(1);
}
