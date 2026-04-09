import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();

async function clean() {
  await mongoose.connect(process.env.MONGO_URI);
  const find = await User.find({ email: /basith/i });
  console.log('FOUND TO DELETE:', find.map(u => u.email));
  const result = await User.deleteMany({ email: /basith/i });
  console.log('DELETE RESULT:', result);
  await mongoose.disconnect();
}

clean().catch(console.error);
