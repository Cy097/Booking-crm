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
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#5f6368', fontFamily: 'Roboto, sans-serif' }}>
        <i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: '8px', color: '#0f9d58' }}></i>
        Redirecting to Master Booking Control Hub...
      </p>
    </div>
  );
}
