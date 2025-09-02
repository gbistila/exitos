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
const [requests, setRequests] = useState<any[]>([]);

useEffect(() => {
  (async () => {
    const res = await fetch(`${API}/api/consultants/requests`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setRequests(data.requests);
    }
  })();
}, []);

async function respond(id: number, status: 'accepted' | 'declined') {
  await fetch(`${API}/api/consultants/requests/${id}/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ status })
  });
  setRequests((prev) =>
    prev.map((r) => (r.id === id ? { ...r, status } : r))
  );
}
// frontend/pages/dashboard.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

type User = { id: number; name: string; email: string; role: string };
type Workspace = { id: number; seller_name: string; seller_email: string; status: string; created_at: string };
type IntroReq = { id: number; sender_name: string; sender_email: string; message: string; status: string; created_at: string };

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<IntroReq[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  useEffect(() => {
    (async () => {
      const u = await fetch(`${API}/api/auth/me`, { credentials: 'include' });
      if (!u.ok) return router.replace('/login');
      const { user } = await u.json();
      setUser(user);

      const [r1, r2] = await Promise.all([
        fetch(`${API}/api/consultants/requests`, { credentials: 'include' }),
        fetch(`${API}/api/workspaces`, { credentials: 'include' })
      ]);
      if (r1.ok) setRequests((await r1.json()).requests);
      if (r2.ok) setWorkspaces((await r2.json()).items);
      setLoading(false);
    })();
  }, [router]);

  async function respond(id: number, status: 'accepted' | 'declined') {
    const res = await fetch(`${API}/api/consultants/requests/${id}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (res.ok) {
      setRequests(prev => prev.map(r => (r.id === id ? { ...r, status } : r)));
      if (status === 'accepted' && data.workspace_id) {
        // refresh workspaces and go to the new one
        const wres = await fetch(`${API}/api/workspaces`, { credentials: 'include' });
        if (wres.ok) setWorkspaces((await wres.json()).items);
        router.push(`/workspace/${data.workspace_id}`);
      }
    } else {
      alert(data.error || 'Failed to respond');
    }
  }

  if (loading) return <p style={{ padding: 24 }}>Loading…</p>;

  return (
    <main style={{ maxWidth: 1000, margin: '40px auto', fontFamily: 'system-ui' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Consultant Dashboard</h1>
        <div>Hi, <strong>{user?.name}</strong></div>
      </header>

      <section style={{ marginTop: 24 }}>
        <h2>Intro Requests</h2>
        {requests.length === 0 ? (
          <p>No requests yet.</p>
        ) : (
          <ul>
            {requests.map(r => (
              <li key={r.id} style={{ marginBottom: 12, borderBottom: '1px solid #eee', paddingBottom: 12 }}>
                <strong>{r.sender_name}</strong> ({r.sender_email}) — <em>{r.message || 'No message'}</em>
                <div style={{ marginTop: 8 }}>
                  Status: <strong>{r.status}</strong>
                  {r.status === 'pending' && (
                    <>
                      <button style={{ marginLeft: 12 }} onClick={() => respond(r.id, 'accepted')}>Accept</button>
                      <button style={{ marginLeft: 8 }} onClick={() => respond(r.id, 'declined')}>Decline</button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Your Workspaces</h2>
        {workspaces.length === 0 ? (
          <p>No active workspaces.</p>
        ) : (
          <ul>
            {workspaces.map(w => (
              <li key={w.id} style={{ marginBottom: 10 }}>
                <Link href={`/workspace/${w.id}`}>
                  Workspace #{w.id} — {w.seller_name} ({w.seller_email}) — {w.status}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
