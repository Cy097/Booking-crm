import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getUserBookings, getAllBookingsAdmin, createBooking } from '@/lib/db';

async function getAuthUser(request) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  return await verifyToken(token);
}

export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestedAdminView = searchParams.get('admin') === 'true';
  if (requestedAdminView && user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  const isAdminView = requestedAdminView;

  const bookings = isAdminView ? await getAllBookingsAdmin() : await getUserBookings(user.userId);
  const isCloudConnected = Boolean(process.env.MONGODB_URI);

  return NextResponse.json({ bookings, isAdminView, isCloudConnected });
}

export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const bookingData = await request.json();
    if (!bookingData.phone || !bookingData.bookingDate || !bookingData.bookingDetails) {
      return NextResponse.json({ error: 'Phone number, date, and details are required' }, { status: 400 });
    }

    const newBooking = await createBooking(user.userId, bookingData);
    return NextResponse.json({ success: true, booking: newBooking }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
