import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), '.data', 'master_db.json');

// Global memory snapshot across lambdas
let inMemoryDb = {
  users: [],
  bookings: []
};

// Check for Vercel KV / Upstash Redis REST API environment variables
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function fetchKV(method, command, ...args) {
  if (!KV_URL || !KV_TOKEN) return null;
  try {
    const res = await fetch(`${KV_URL}/${command}/${args.map(encodeURIComponent).join('/')}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      return data.result;
    }
  } catch (err) {
    console.error("Vercel KV Cloud fetch error:", err);
  }
  return null;
}

export async function readDB() {
  // 1. Try Vercel Cloud KV Store if configured
  if (KV_URL && KV_TOKEN) {
    const cloudData = await fetchKV('GET', 'get', 'master_crm_db');
    if (cloudData) {
      try {
        inMemoryDb = typeof cloudData === 'string' ? JSON.parse(cloudData) : cloudData;
        return inMemoryDb;
      } catch (e) {
        console.error("Cloud DB parse error", e);
      }
    }
  }

  // 2. Fallback to Local File storage in local dev
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

export async function writeDB(dbData) {
  inMemoryDb = dbData;

  // 1. Persist to Vercel Cloud KV Store
  if (KV_URL && KV_TOKEN) {
    await fetchKV('POST', 'set', 'master_crm_db', JSON.stringify(dbData));
  }

  // 2. Local File storage
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(dbData, null, 2), 'utf-8');
  } catch (err) {
    // Ignore write error on Vercel read-only filesystem
  }
}

// User Helpers (Async for Vercel Cloud Database)
export async function findUserByEmail(email) {
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
  db.users.push(newUser);
  await writeDB(db);
  return newUser;
}

export async function getUserBookings(userId) {
  const db = await readDB();
  return db.bookings.filter(b => b.userId === userId);
}

export async function getAllBookingsAdmin() {
  const db = await readDB();
  return db.bookings.map(b => {
    const creator = db.users.find(u => u.id === b.userId);
    return {
      ...b,
      creatorName: creator ? creator.name : 'Unknown User',
      creatorEmail: creator ? creator.email : 'N/A'
    };
  });
}

export async function createBooking(userId, bookingData) {
  const db = await readDB();
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
  db.bookings.unshift(newBooking);
  await writeDB(db);
  return newBooking;
}

export async function updateBooking(userId, bookingId, updateData, isAdmin = false) {
  const db = await readDB();
  const index = db.bookings.findIndex(b => (b.id === bookingId || b.customId === bookingId || b.phone === bookingId) && (isAdmin || b.userId === userId));
  if (index === -1) return null;

  db.bookings[index] = {
    ...db.bookings[index],
    ...updateData
  };
  await writeDB(db);
  return db.bookings[index];
}

export async function deleteBooking(userId, bookingId, isAdmin = false) {
  const db = await readDB();
  const initialCount = db.bookings.length;
  db.bookings = db.bookings.filter(b => !( (b.id === bookingId || b.customId === bookingId || b.phone === bookingId) && (isAdmin || b.userId === userId) ));
  const deleted = db.bookings.length < initialCount;
  if (deleted) await writeDB(db);
  return deleted;
}
