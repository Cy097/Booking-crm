import { NextResponse } from 'next/server';
import { findUserByEmail, createUser } from '@/lib/db';
import { hashPassword, signToken } from '@/lib/auth';

export async function POST(request) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: 'User account already exists with this email' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const newUser = await createUser({ email, passwordHash, name });

    const token = await signToken({ userId: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role });

    const response = NextResponse.json({
      success: true,
      user: { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role }
    });

    const TEN_YEARS_IN_SECONDS = 10 * 365 * 24 * 60 * 60;
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: TEN_YEARS_IN_SECONDS,
      expires: new Date(Date.now() + TEN_YEARS_IN_SECONDS * 1000)
    });

    return response;
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
