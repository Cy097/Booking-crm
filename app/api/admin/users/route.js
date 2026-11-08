import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { listUsers } from '@/lib/db';

export async function GET(request) {
  const token = request.cookies.get('auth_token')?.value;
  const session = token ? await verifyToken(token) : null;

  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  const users = await listUsers();
  return NextResponse.json({ users });
}
