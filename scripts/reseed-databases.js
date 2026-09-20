#!/usr/bin/env node
/**
 * Wipe and reseed everything a demo needs (run with MongoDB up):
 * course catalog, quizzes, demo learner + admin accounts, demo progress.
 *
 *   npm run demo:seed
 */

const path = require('path');
const { spawnSync } = require('child_process');
const dotenv = require('dotenv');

const root = path.join(__dirname, '..');

dotenv.config({ path: path.join(root, 'services', 'course', '.env') });
if (!process.env.MONGO_URI) {
  process.env.MONGO_URI = 'mongodb://127.0.0.1:27017';
}
// The service .env names the Docker host ("mongo"), which only resolves inside
// the compose network. This script runs on the host, where the published port
// is on localhost. Pass SEED_MONGO_URI to point elsewhere.
process.env.MONGO_URI = process.env.SEED_MONGO_URI || process.env.MONGO_URI.replace(/\/\/mongo(:|\/)/, '//127.0.0.1$1');

const run = (cwd, script, args = []) => {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

console.log('[reseed] Resetting course catalog...');
run(path.join(root, 'services', 'course'), 'scripts/seed-courses.js', ['--reset']);

console.log('[reseed] Resetting quiz questions...');
run(path.join(root, 'services', 'quiz'), 'scripts/seed-quizzes.js', ['--reset']);

console.log('[reseed] Creating demo learner and admin accounts...');
run(path.join(root, 'scripts'), 'seed-demo-user.js');

console.log('[reseed] Seeding demo learner progress...');
run(path.join(root, 'scripts'), 'seed-demo-progress.js');

console.log('');
console.log('[reseed] All sample data loaded. Sign in at http://localhost:5173/login');
console.log('  learner  learner@demo.eduelderly / Demo1234!');
console.log('  admin    admin@demo.eduelderly   / Demo1234!');
