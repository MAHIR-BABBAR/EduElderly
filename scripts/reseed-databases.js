#!/usr/bin/env node
/**
 * Wipe and reseed course + quiz sample data (run with MongoDB up).
 *
 *   npm run reseed
 */

const path = require('path');
const { spawnSync } = require('child_process');
const dotenv = require('dotenv');

const root = path.join(__dirname, '..');

dotenv.config({ path: path.join(root, 'services', 'course', '.env') });
if (!process.env.MONGO_URI) {
  process.env.MONGO_URI = 'mongodb://127.0.0.1:27017';
}

const run = (cwd, script, args = []) => {
  const result = spawnSync('node', [script, ...args], {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
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

console.log('[reseed] All sample data loaded.');
