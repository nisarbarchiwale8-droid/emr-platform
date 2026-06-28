/**
 * Start embedded PostgreSQL, run migrations, seed, then keep the process alive.
 * Usage: node scripts/start-db.mjs
 */
import EmbeddedPostgres from 'embedded-postgres';
import { execSync, spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, '.pgdata');

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'emr',
  password: 'emr',
  port: 5433,
  persistent: true,
  initdbFlags: [],
});

console.log('🗄  Starting embedded PostgreSQL on port 5433...');
const alreadyInitialised = fs.existsSync(path.join(dataDir, 'PG_VERSION'));
if (!alreadyInitialised) {
  await pg.initialise();
}
await pg.start();

// Create DB if it doesn't exist
try {
  await pg.createDatabase('emr_db');
  console.log('✅ Database emr_db created');
} catch {
  console.log('ℹ️  Database emr_db already exists');
}

const env = {
  ...process.env,
  DATABASE_URL: 'postgresql://emr:emr@localhost:5433/emr_db?schema=public',
};

// Run migrations
console.log('📦 Running Prisma migrations...');
try {
  execSync('npx prisma migrate deploy', { cwd: root, env, stdio: 'inherit' });
} catch {
  // First time: use dev migrate
  execSync('npx prisma migrate dev --name init', { cwd: root, env, stdio: 'inherit' });
}
console.log('✅ Migrations done');

// Seed
console.log('🌱 Seeding database...');
try {
  execSync('node prisma/seed.js', { cwd: root, env, stdio: 'inherit' });
} catch (e) {
  console.log('ℹ️  Seed skipped (already seeded or error):', e.message);
}

// Start the Express server
console.log('\n🚀 Starting Express server...');
const server = spawn('node', ['src/server.js'], {
  cwd: root,
  env: { ...env, PORT: '5001', NODE_ENV: 'development' },
  stdio: 'inherit',
});

// Graceful shutdown
const shutdown = async () => {
  console.log('\n🛑 Shutting down...');
  server.kill();
  await pg.stop();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.on('exit', async (code) => {
  console.log(`Server exited with code ${code}`);
  await pg.stop();
  process.exit(code);
});
