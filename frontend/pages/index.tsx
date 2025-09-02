import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function Home() {
  const [backendStatus, setBackendStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/health`);
        if (res.ok) setBackendStatus('ok');
        else setBackendStatus('error');
      } catch {
        setBackendStatus('error');
      }
    })();
  }, []);

  return (
    <main style={{ padding: '60px 40px', fontFamily: 'system-ui', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: 12 }}>🚀 Welcome to ExitOS</h1>
      <p style={{ fontSize: '1.2rem', marginBottom: 24 }}>
        A trust-first platform for consultants and sellers to collaborate, close deals, and build legacies.
      </p>

      <section style={{ marginBottom: 32 }}>
        <h2>🔗 Quick Links</h2>
        <ul style={{ lineHeight: '1.8' }}>
          <li><a href="/login">Login / Register</a></li>
          <li><a href="/dashboard">Consultant Dashboard</a></li>
          <li><a href="/seller/dashboard">Seller Dashboard</a></li>
          <li><a href="/profile">Your Profile</a></li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2>📡 Backend Status</h2>
        <p>
          {backendStatus === 'loading' && 'Checking...'}
          {backendStatus === 'ok' && <span style={{ color: '#15803d' }}>✅ Connected to backend</span>}
          {backendStatus === 'error' && <span style={{ color: 'crimson' }}>❌ Backend unreachable</span>}
        </p>
      </section>

      <section>
        <h2>🌟 Featured Consultant</h2>
        <p>
          Want to explore top talent? Visit <a href="/consultants">our consultant directory</a> and request an intro.
        </p>
      </section>
    </main>
  );
}
