// frontend/pages/dashboard.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

type User = { id: number; name: string; email: string; role: string };

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch(`${API}/api/auth/me`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        router.replace('/login');
      }
      setLoading(false);
    })();
  }, [router]);

  async function logout() {
    await fetch(`${API}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    router.push('/login');
  }

  if (loading) return <p style={{ padding: 24 }}>Loading…</p>;

  return (
    <main style={{ maxWidth: 800, margin: '40px auto', fontFamily: 'system-ui' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Consultant Dashboard</h1>
        <button onClick={logout}>Logout</button>
      </header>

      <section style={{ marginTop: 20 }}>
        <p>Welcome, <strong>{user?.name}</strong> ({user?.email})</p>
        <p>Role: {user?.role}</p>
      </section>

      <section style={{ marginTop: 30 }}>
        <h2>Your Workspace</h2>
        <ul>
          <li>Profile and credentials</li>
          <li>Engagements with sellers</li>
          <li>Templates, SOPs, and proposal generator</li>
        </ul>
      </section>
    </main>
  );
}
<section style={{ marginTop: 40 }}>
  <h2>Intro Requests</h2>
  <ul>
    {requests.map((r) => (
      <li key={r.id} style={{ marginBottom: 12 }}>
        <strong>{r.sender_name}</strong> ({r.sender_email})<br />
        <em>{r.message}</em><br />
        Status: {r.status}
        {r.status === 'pending' && (
          <>
            <button onClick={() => respond(r.id, 'accepted')}>Accept</button>
            <button onClick={() => respond(r.id, 'declined')}>Decline</button>
          </>
        )}
      </li>
    ))}
  </ul>
</section>
