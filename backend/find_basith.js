import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();

async function findOne() {
  await mongoose.connect(process.env.MONGO_URI);
  const found = await User.findOne({ email: { $regex: /basith/i } });
  if (found) {
    console.log('FOUND:', { id: found._id, email: found.email, role: found.role });
  } else {
    console.log('NOT FOUND');
  }
  await mongoose.disconnect();
}

findOne().catch(console.error);
