import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI?.trim().replace(/^['"]|['"]$/g, '');
let cachedClient = null;
let cachedDb = null;

const DB_PATH = path.join(process.cwd(), '.data', 'master_db.json');

let inMemoryDb = {
  users: [],
  bookings: []
};

async function connectToMongoDB() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured. Add it in the project environment variables.');
  }
  if (cachedClient && cachedDb) return { client: cachedClient, db: cachedDb };

  const client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    maxPoolSize: 10,
    tls: true,
    family: 4,
    retryWrites: true,
    retryReads: true
  });
  await client.connect();
  cachedClient = client;
  cachedDb = client.db('booking_crm_db');
  return { client, db: cachedDb };
}

export async function readDB() {
  const mongo = await connectToMongoDB();
  if (mongo) {
    try {
      const usersCollection = mongo.db.collection('users');
      const bookingsCollection = mongo.db.collection('bookings');
      const users = await usersCollection.find({}).toArray();
      const bookings = await bookingsCollection.find({}).sort({ createdAt: -1 }).toArray();
      inMemoryDb = { users, bookings };
      return inMemoryDb;
    } catch (e) {
      console.error("MongoDB collection read error:", e.message);
    }
  }

  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      inMemoryDb = JSON.parse(data);
    }
  } catch (err) {}

  return inMemoryDb;
}

export async function findUserByEmail(email) {
  const mongo = await connectToMongoDB();
  if (mongo) {
    try {
      const user = await mongo.db.collection('users').findOne({ email: email.toLowerCase() });
      if (user) return user;
    } catch (e) {}
  }
  const db = await readDB();
  return db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

export async function createUser({ email, passwordHash, name, role }) {
  const mongo = await connectToMongoDB();
  const users = mongo.db.collection('users');
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await users.findOne({ email: normalizedEmail });
  if (existingUser) {
    const error = new Error('An account with this email already exists.');
    error.code = 'USER_EXISTS';
    throw error;
  }

  const isFirstUser = (await users.countDocuments()) === 0;
  const newUser = {
    id: `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    email: normalizedEmail,
    passwordHash,
    name: name?.trim() || normalizedEmail.split('@')[0],
    role: isFirstUser ? 'admin' : 'user',
    createdAt: new Date().toISOString()
  };

  await users.insertOne(newUser);
  return newUser;
}

export async function getUserBookings(userId) {
  const mongo = await connectToMongoDB();
  if (mongo) {
    try {
      return await mongo.db.collection('bookings').find({ userId }).sort({ createdAt: -1 }).toArray();
    } catch (e) {}
  }
  const db = await readDB();
  return db.bookings.filter(b => b.userId === userId);
}

export async function getAllBookingsAdmin() {
  const db = await readDB();
  const mongo = await connectToMongoDB();

  let bookings = db.bookings;
  let users = db.users;

  if (mongo) {
    try {
      bookings = await mongo.db.collection('bookings').find({}).sort({ createdAt: -1 }).toArray();
      users = await mongo.db.collection('users').find({}).toArray();
    } catch (e) {}
  }

  return bookings.map(b => {
    const creator = users.find(u => u.id === b.userId);
    return {
      ...b,
      creatorName: creator ? creator.name : 'Unknown User',
      creatorEmail: creator ? creator.email : 'N/A'
    };
  });
}

export async function createBooking(userId, bookingData) {
  const newBooking = {
    id: `bk_${Date.now()}_${Math.floor(Math.random()*1000)}`,
    userId,
    customId: bookingData.customId || "",
    phone: bookingData.phone,
    bookingDate: bookingData.bookingDate,
    bookingDetails: bookingData.bookingDetails,
    discountType: bookingData.discountType || "None",
    tokenStatus: bookingData.tokenStatus || "Token Paid",
    tokenAmount: parseFloat(bookingData.tokenAmount) || 0,
    bookingStatus: bookingData.bookingStatus || "Confirmed",
    bookingType: bookingData.bookingType || "confirmed",
    callbackDate: bookingData.callbackDate || "",
    callbackTime: bookingData.callbackTime || "",
    callbackReminder: Boolean(bookingData.callbackReminder),
    notes: bookingData.notes || "",
    createdAt: new Date().toISOString()
  };

  const mongo = await connectToMongoDB();
  if (mongo) {
    try {
      await mongo.db.collection('bookings').insertOne(newBooking);
    } catch (e) {}
  } else {
    const db = await readDB();
    db.bookings.unshift(newBooking);
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
    } catch (e) {}
  }

  return newBooking;
}

export async function updateBooking(userId, bookingId, updateData, isAdmin = false) {
  const mongo = await connectToMongoDB();
  const query = isAdmin ? { id: bookingId } : { id: bookingId, userId };

  if (mongo) {
    try {
      const result = await mongo.db.collection('bookings').findOneAndUpdate(
        query,
        { $set: updateData },
        { returnDocument: 'after' }
      );
      return result;
    } catch (e) {}
  }

  const db = await readDB();
  const index = db.bookings.findIndex(b => (b.id === bookingId || b.customId === bookingId || b.phone === bookingId) && (isAdmin || b.userId === userId));
  if (index === -1) return null;

  db.bookings[index] = { ...db.bookings[index], ...updateData };
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (e) {}
  return db.bookings[index];
}

export async function deleteBooking(userId, bookingId, isAdmin = false) {
  const mongo = await connectToMongoDB();
  const query = isAdmin ? { id: bookingId } : { id: bookingId, userId };

  if (mongo) {
    try {
      const res = await mongo.db.collection('bookings').deleteOne(query);
      return res.deletedCount > 0;
    } catch (e) {}
  }

  const db = await readDB();
  const initialCount = db.bookings.length;
  db.bookings = db.bookings.filter(b => !( (b.id === bookingId || b.customId === bookingId || b.phone === bookingId) && (isAdmin || b.userId === userId) ));
  const deleted = db.bookings.length < initialCount;
  if (deleted) {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
    } catch (e) {}
  }
  return deleted;
}
