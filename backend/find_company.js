import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Company from './src/models/Company.js';

dotenv.config();

async function findC() {
  await mongoose.connect(process.env.MONGO_URI);
  const found = await Company.findOne({ adminEmail: { $regex: /basith/i } });
  if (found) {
    console.log('COMPANY FOUND:', { id: found._id, name: found.name, adminEmail: found.adminEmail });
  } else {
    console.log('COMPANY NOT FOUND');
  }
  await mongoose.disconnect();
}

findC().catch(console.error);
