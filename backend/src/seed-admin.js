// backend/src/seed-admin.js
// Run with: node src/seed-admin.js
// This script creates (or updates) the admin user in MongoDB.

import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.js';

const ADMIN = {
  name:     'Basith',
  email:    'basith@adscroll360.com',
  password: 'AAAAAAAAAA@123456789',
  role:     'admin',
};

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const existing = await User.findOne({ email: ADMIN.email });

    if (existing) {
      // Update password/role in case it changed
      existing.password = ADMIN.password;
      existing.role     = ADMIN.role;
      existing.name     = ADMIN.name;
      await existing.save();
      console.log(`✅ Admin user updated: ${ADMIN.email}`);
    } else {
      await User.create(ADMIN);
      console.log(`✅ Admin user created: ${ADMIN.email}`);
    }

    console.log('');
    console.log('─────────────────────────────────────');
    console.log('  Admin Credentials');
    console.log('─────────────────────────────────────');
    console.log(`  Email    : ${ADMIN.email}`);
    console.log(`  Password : ${ADMIN.password}`);
    console.log(`  Role     : ${ADMIN.role}`);
    console.log('─────────────────────────────────────');

    await mongoose.disconnect();
    console.log('✅ Done.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

seed();
