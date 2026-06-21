#!/usr/bin/env node

/**

 * Create verified demo users for the sample site.

 *

 *   Learner: learner@demo.eduelderly / Demo1234!

 *   Admin:   admin@demo.eduelderly / Demo1234!

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

    name: 'Demo Learner',

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

});



const UserProfileSchema = new mongoose.Schema({

  userId: String,

  name: String,

  email: String,

  role: String,

  isActive: Boolean,

});



const upsertDemoUser = async (AuthUser, UserProfile, demo) => {

  const passHash = await bcrypt.hash(demo.password, 10);



  let user = await AuthUser.findOne({ email: demo.email });

  if (!user) {

    user = await AuthUser.create({

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

    });

    console.log(`[demo-user] Created auth user: ${demo.email}`);

  } else {

    user.passHash = passHash;

    user.role = demo.role;

    user.isVerified = true;

    user.isActive = true;

    user.is2FAEnabled = false;

    user.failedLoginAttempts = 0;

    user.lockedUntil = null;

    await user.save();

    console.log(`[demo-user] Updated auth user: ${demo.email}`);

  }



  const profile = await UserProfile.findOne({ userId: user.userId });

  if (!profile) {

    await UserProfile.create({

      userId: user.userId,

      name: user.name,

      email: user.email,

      role: user.role,

      isActive: true,

    });

    console.log(`[demo-user] Created profile: ${demo.email}`);

  } else {

    profile.role = demo.role;

    await profile.save();

    console.log(`[demo-user] Profile already exists: ${demo.email}`);

  }

};



const run = async () => {

  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';



  await mongoose.connect(uri, { dbName: 'eduelderly-auth' });

  const AuthUser = mongoose.model('User', AuthUserSchema);



  const userDb = mongoose.connection.useDb('eduelderly-user');

  const UserProfile = userDb.model('UserProfile', UserProfileSchema);



  for (const demo of DEMO_USERS) {

    await upsertDemoUser(AuthUser, UserProfile, demo);

  }



  console.log('[demo-user] Ready for sample site:');

  for (const demo of DEMO_USERS) {

    console.log(`  ${demo.role}: ${demo.email} / ${demo.password}`);

  }



  await mongoose.disconnect();

};



run().catch((err) => {

  console.error('[demo-user] Failed:', err.message);

  process.exit(1);

});

