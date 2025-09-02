import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function SellerDashboard() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const me = await fetch(`${API}/api/auth/me`, { credentials: 'include' });
      if (!me.ok) return router.replace('/login');
      const { user } = await me.json();
      if (user.role !== 'seller') return router.replace('/login');

      const ws = await fetch(`${API}/api/workspaces`, { credentials: 'include' });
      if (ws.ok) setWorkspaces((await ws.json()).items);
    })();
  }, [router]);

  return (
    <main style={{ maxWidth: 900, margin: '40px auto', fontFamily: 'system-ui' }}>
      <h1>Your Workspaces</h1>
      <ul>
        {workspaces.map(w => (
          <li key={w.id}>
            <Link href={`/seller/workspace/${w.id}`}>Workspace #{w.id} — {w.status}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
