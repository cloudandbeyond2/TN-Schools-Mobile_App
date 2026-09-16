import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { CounsellorSlot } from './src/models/mongo/index';

dotenv.config();

async function seed() {
  if (!process.env.MONGODB_URI) {
    console.error('Missing MONGODB_URI');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  await CounsellorSlot.deleteMany({});
  console.log('Cleared existing slots');

  const slotsToInsert = [
    { schoolId: 'default', dayEn: 'Monday', dayTa: 'திங்கள்', time: '10:00 AM', isBooked: false },
    { schoolId: 'default', dayEn: 'Monday', dayTa: 'திங்கள்', time: '2:00 PM', isBooked: false },
    { schoolId: 'default', dayEn: 'Wednesday', dayTa: 'புதன்', time: '11:00 AM', isBooked: true }, // Already booked
    { schoolId: 'default', dayEn: 'Wednesday', dayTa: 'புதன்', time: '3:00 PM', isBooked: false },
    { schoolId: 'default', dayEn: 'Friday', dayTa: 'வெள்ளி', time: '10:30 AM', isBooked: false },
    { schoolId: 'default', dayEn: 'Friday', dayTa: 'வெள்ளி', time: '1:30 PM', isBooked: false }
  ];

  await CounsellorSlot.insertMany(slotsToInsert);
  console.log('Inserted seed slots');

  await mongoose.disconnect();
  console.log('Disconnected');
}

seed().catch(console.error);
