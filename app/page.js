'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          router.replace('/dashboard');
        } else {
          router.replace('/login');
        }
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  return (
    <div className="boot">
      <div>
        <div className="boot-spin"></div>
        Loading Master Booking Control Hub...
      </div>
    </div>
  );
}
