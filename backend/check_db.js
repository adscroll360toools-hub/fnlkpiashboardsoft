import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import Company from './src/models/Company.js';

dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const u = await User.findOne({ email: 'basith@adscroll360.com' });
  const c = await Company.findOne({ adminEmail: 'basith@adscroll360.com' });
  console.log('USER:', u ? { email: u.email, role: u.role, companyId: u.companyId } : 'NOT FOUND');
  console.log('COMPANY:', c ? { name: c.name, adminEmail: c.adminEmail } : 'NOT FOUND');
  await mongoose.disconnect();
}

check().catch(console.error);
