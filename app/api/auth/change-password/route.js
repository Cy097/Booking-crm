import { NextResponse } from 'next/server';
import { findUserById, updateUserPassword } from '@/lib/db';
import { comparePassword, hashPassword, verifyToken } from '@/lib/auth';

export async function POST(request) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session?.userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { currentPassword, newPassword } = await request.json();
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json({ error: 'Use a new password with at least 8 characters.' }, { status: 400 });
    }

    const user = await findUserById(session.userId);
    if (!user || !(await comparePassword(currentPassword, user.passwordHash))) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
    }

    await updateUserPassword(session.userId, await hashPassword(newPassword));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] Password change failed:', error);
    return NextResponse.json({ error: 'Unable to change password right now.' }, { status: 500 });
  }
}
