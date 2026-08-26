import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
let cachedClient = null;
let cachedDb = null;

const DB_PATH = path.join(process.cwd(), '.data', 'master_db.json');

let inMemoryDb = {
  users: [],
  bookings: []
};

async function connectToMongoDB() {
  if (!MONGODB_URI) return null;
  if (cachedClient && cachedDb) return { client: cachedClient, db: cachedDb };

  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db('booking_crm_db');
    cachedClient = client;
    cachedDb = db;
    return { client, db };
  } catch (err) {
    console.error("MongoDB Atlas connection error:", err);
    return null;
  }
}

export async function readDB() {
  // 1. Try MongoDB Atlas Connection
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
      console.error("MongoDB collection read error:", e);
    }
  }

  // 2. Fallback to Local File / Memory Storage
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      inMemoryDb = JSON.parse(data);
    }
  } catch (err) {
    // Memory fallback
  }

  return inMemoryDb;
}

export async function findUserByEmail(email) {
  const mongo = await connectToMongoDB();
  if (mongo) {
    const user = await mongo.db.collection('users').findOne({ email: email.toLowerCase() });
    if (user) return user;
  }
  const db = await readDB();
  return db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

export async function createUser({ email, passwordHash, name, role }) {
  const db = await readDB();
  const isFirstUser = db.users.length === 0;
  const newUser = {
    id: `usr_${Date.now()}_${Math.floor(Math.random()*1000)}`,
    email: email.toLowerCase(),
    passwordHash,
    name: name || email.split('@')[0],
    role: role || (isFirstUser ? 'admin' : 'user'),
    createdAt: new Date().toISOString()
  };

  const mongo = await connectToMongoDB();
  if (mongo) {
    await mongo.db.collection('users').insertOne(newUser);
  } else {
    db.users.push(newUser);
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
    } catch (e) {}
  }

  return newUser;
}

export async function getUserBookings(userId) {
  const mongo = await connectToMongoDB();
  if (mongo) {
    return await mongo.db.collection('bookings').find({ userId }).sort({ createdAt: -1 }).toArray();
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
    bookings = await mongo.db.collection('bookings').find({}).sort({ createdAt: -1 }).toArray();
    users = await mongo.db.collection('users').find({}).toArray();
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
    notes: bookingData.notes || "",
    createdAt: new Date().toISOString()
  };

  const mongo = await connectToMongoDB();
  if (mongo) {
    await mongo.db.collection('bookings').insertOne(newBooking);
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
    const result = await mongo.db.collection('bookings').findOneAndUpdate(
      query,
      { $set: updateData },
      { returnDocument: 'after' }
    );
    return result;
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
    const res = await mongo.db.collection('bookings').deleteOne(query);
    return res.deletedCount > 0;
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
