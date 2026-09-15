import './globals.css';
import Script from 'next/script';

export const metadata = {
  title: 'Master Booking Control Hub (Netlify Edition)',
  description: 'Multi-User Booking CRM & Token Ledger on Netlify',
  icons: {
    icon: [
      { url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/bookkeeping-zmQLx5LrsSmFy2MeoyPLyznm7OsAqg.png', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('crm-theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.classList.add('theme-switching');document.documentElement.dataset.theme=t;requestAnimationFrame(function(){document.documentElement.classList.remove('theme-switching')});}catch(e){}})()` }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body>
        {children}
        <Script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
