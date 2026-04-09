import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();

async function list() {
  await mongoose.connect(process.env.MONGO_URI);
  const users = await User.find({}, 'email role');
  console.log('---BEGIN-USERS---');
  for (const u of users) {
    console.log(`|${u.email}|${u.role}|`);
  }
  console.log('---END-USERS---');
  await mongoose.disconnect();
}

list().catch(console.error);
