// frontend/pages/seller/dashboard.tsx
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
const API = process.env.NEXT_PUBLIC_API_BASE_URL;

type Workspace = { id: number; seller_name: string; seller_email: string; status: string; created_at: string };

export default function SellerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  useEffect(() => {
    (async () => {
      const me = await fetch(`${API}/api/auth/me`, { credentials: 'include' });
      if (!me.ok) return router.replace('/login');
      const { user } = await me.json();
      if (user.role !== 'seller') return router.replace('/login');

      const ws = await fetch(`${API}/api/workspaces`, { credentials: 'include' });
      if (ws.ok) setWorkspaces((await ws.json()).items);
      setLoading(false);
    })();
  }, [router]);

  if (loading) return <p style={{ padding: 24 }}>Loading…</p>;

  return (
    <main style={{ maxWidth: 900, margin: '40px auto', fontFamily: 'system-ui' }}>
      <h1>Your Workspaces</h1>
      {workspaces.length === 0 ? (
        <p>No active workspaces yet.</p>
      ) : (
        <ul>
          {workspaces.map(w => (
            <li key={w.id} style={{ marginBottom: 10 }}>
              <Link href={`/seller/workspace/${w.id}`}>Workspace #{w.id} — {w.status}</Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
