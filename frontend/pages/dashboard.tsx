import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);

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
        router.push(`/workspace/${data.workspace_id}`);
      }
    }
  }

  return (
    <main style={{ maxWidth: 1000, margin: '40px auto', fontFamily: 'system-ui' }}>
      <h1>Consultant Dashboard</h1>
      <section>
        <h2>Intro Requests</h2>
        <ul>
          {requests.map(r => (
            <li key={r.id}>
              <strong>{r.sender_name}</strong> ({r.sender_email}) — {r.message}
              <div>
                Status: {r.status}
                {r.status === 'pending' && (
                  <>
                    <button onClick={() => respond(r.id, 'accepted')}>Accept</button>
                    <button onClick={() => respond(r.id, 'declined')}>Decline</button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Your Workspaces</h2>
        <ul>
          {workspaces.map(w => (
            <li key={w.id}>
              <Link href={`/workspace/${w.id}`}>Workspace #{w.id} — {w.seller_name}</Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
