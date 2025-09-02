// frontend/pages/seller/workspace/[id].tsx
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
const API = process.env.NEXT_PUBLIC_API_BASE_URL;

type Workspace = { id: number; seller_name: string; seller_email: string; status: string; created_at: string };
type Task = { id: number; title: string; description: string | null; status: 'todo' | 'in_progress' | 'done'; assigned_to: 'seller'|'consultant'|null };
type Message = { id: number; author: 'seller'|'consultant'; body: string; created_at: string };

export default function SellerWorkspace() {
  const router = useRouter();
  const { id } = router.query;
  const [ws, setWs] = useState<Workspace | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  async function loadAll() {
    if (!id) return;
    setLoading(true);
    const [w, t, m] = await Promise.all([
      fetch(`${API}/api/workspaces/${id}`, { credentials: 'include' }),
      fetch(`${API}/api/workspaces/${id}/tasks`, { credentials: 'include' }),
      fetch(`${API}/api/workspaces/${id}/messages`, { credentials: 'include' })
    ]);
    if (w.ok) setWs((await w.json()).workspace);
    if (t.ok) setTasks((await t.json()).items);
    if (m.ok) setMsgs((await m.json()).items);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, [id]);

  async function setStatus(taskId: number, status: 'todo'|'in_progress'|'done') {
    const res = await fetch(`${API}/api/workspaces/${id}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status })
    });
    if (res.ok) setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, status } : t)));
    else alert('Not allowed to update this task');
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    const r = await fetch(`${API}/api/workspaces/${id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ body: message })
    });
    if (r.ok) { setMessage(''); loadAll(); }
  }

  if (loading) return <p style={{ padding: 24 }}>Loading…</p>;
  if (!ws) return <p style={{ padding: 24 }}>Workspace not found.</p>;

  return (
    <main style={{ maxWidth: 1000, margin: '30px auto', fontFamily: 'system-ui' }}>
      <h1>Workspace #{ws.id}</h1>
      <section style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginTop: 20 }}>
        <div>
          <h2>Tasks</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {tasks.map(t => (
              <li key={t.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                <strong>{t.title}</strong>
                {t.description ? <div style={{ color: '#555' }}>{t.description}</div> : null}
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Assigned to: {t.assigned_to}</div>
                {t.assigned_to === 'seller' && (
                  <div style={{ marginTop: 8 }}>
                    <select value={t.status} onChange={e => setStatus(t.id, e.target.value as any)}>
                      <option value="todo">To do</option>
                      <option value="in_progress">In progress</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2>Messages</h2>
          <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 10, height: 420, overflowY: 'auto' }}>
            {msgs.map(m => (
              <div key={m.id} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{m.author} • {new Date(m.created_at).toLocaleString()}</div>
                <div>{m.body}</div>
              </div>
            ))}
          </div>
          <form onSubmit={sendMessage} style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <input value={message} onChange={e => setMessage(e.target.value)} placeholder="Write a message…" style={{ flex: 1, padding: 8 }} />
            <button type="submit">Send</button>
          </form>
        </div>
      </section>
    </main>
  );
}
