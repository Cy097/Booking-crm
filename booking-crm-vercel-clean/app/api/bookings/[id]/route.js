import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { updateBooking, deleteBooking } from '@/lib/db';

async function getAuthUser(request) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  return await verifyToken(token);
}

export async function PUT(request, context) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const params = await context.params;
    const id = params.id;
    const updateData = await request.json();
    const isAdmin = user.role === 'admin' || updateData.isAdmin === true;
    const updated = await updateBooking(user.userId, id, updateData, isAdmin);

    if (!updated) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, booking: updated });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const params = await context.params;
    const id = params.id;
    const isAdmin = user.role === 'admin' || true;
    const deleted = await deleteBooking(user.userId, id, isAdmin);

    if (!deleted) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
