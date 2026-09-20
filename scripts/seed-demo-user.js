#!/usr/bin/env node
/**
 * Create (or refresh) verified demo accounts.
 *
 *   Learner: learner@demo.eduelderly / Demo1234!
 *   Admin:   admin@demo.eduelderly   / Demo1234!
 *
 * Writes directly to the auth and user databases so it works before any
 * service is running. Idempotent: re-running resets passwords and roles.
 */

const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', 'services', 'auth', '.env') });

const DEMO_USERS = [
  {
    email: 'learner@demo.eduelderly',
    password: 'Demo1234!',
    name: 'Margaret Demo',
    userId: 'demo-learner-user-id',
    role: 'learner',
  },
  {
    email: 'admin@demo.eduelderly',
    password: 'Demo1234!',
    name: 'Demo Admin',
    userId: 'demo-admin-user-id',
    role: 'admin',
  },
];

const AuthUserSchema = new mongoose.Schema({
  userId: String,
  name: String,
  email: String,
  passHash: String,
  role: String,
  isVerified: Boolean,
  isActive: Boolean,
  is2FAEnabled: Boolean,
  failedLoginAttempts: Number,
  lockedUntil: Date,
}, { timestamps: true });

const UserProfileSchema = new mongoose.Schema({
  userId: String,
  name: String,
  email: String,
  role: String,
  isActive: Boolean,
  fontSizePref: String,
  highContrast: Boolean,
  lang: String,
  totalXP: Number,
  bio: String,
}, { timestamps: true });

const upsertDemoUser = async (AuthUser, UserProfile, demo) => {
  const passHash = await bcrypt.hash(demo.password, 10);

  await AuthUser.updateOne(
    { email: demo.email },
    {
      $set: {
        userId: demo.userId,
        name: demo.name,
        email: demo.email,
        passHash,
        role: demo.role,
        isVerified: true,
        isActive: true,
        is2FAEnabled: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    },
    { upsert: true },
  );

  await UserProfile.updateOne(
    { userId: demo.userId },
    {
      $set: { name: demo.name, email: demo.email, role: demo.role, isActive: true },
      $setOnInsert: { fontSizePref: 'large', highContrast: false, lang: 'en', totalXP: 0, bio: '' },
    },
    { upsert: true },
  );

  console.log(`[demo-user] ${demo.role.padEnd(7)} ${demo.email}`);
};

const run = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';

  await mongoose.connect(uri, { dbName: 'eduelderly-auth' });
  const AuthUser = mongoose.model('User', AuthUserSchema);
  const UserProfile = mongoose.connection.useDb('eduelderly-user').model('UserProfile', UserProfileSchema);

  for (const demo of DEMO_USERS) {
    await upsertDemoUser(AuthUser, UserProfile, demo);
  }

  await mongoose.disconnect();
};

if (require.main === module) {
  run().catch((err) => {
    console.error('[demo-user] Failed:', err.message);
    process.exit(1);
  });
}

module.exports = { DEMO_USERS };
