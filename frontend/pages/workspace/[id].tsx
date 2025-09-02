// frontend/pages/workspace/[id].tsx
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

type Workspace = { id: number; consultant_id: number; seller_name: string; seller_email: string; status: string; created_at: string };
type Task = { id: number; title: string; description: string | null; status: 'todo' | 'in_progress' | 'done'; assigned_to: string | null; due_date: string | null };
type Message = { id: number; author: 'consultant' | 'seller'; body: string; created_at: string };

export default function WorkspacePage() {
  const router = useRouter();
  const { id } = router.query;
  const [ws, setWs] = useState<Workspace | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // form state
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [assigned, setAssigned] = useState<'consultant' | 'seller'>('consultant');
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

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title) return;
    const res = await fetch(`${API}/api/workspaces/${id}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title, description: desc, assigned_to: assigned })
    });
    if (res.ok) {
      setTitle(''); setDesc('');
      loadAll();
    }
  }

  async function setStatus(taskId: number, status: 'todo' | 'in_progress' | 'done') {
    const res = await fetch(`${API}/api/workspaces/${id}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, status } : t)));
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    const res = await fetch(`${API}/api/workspaces/${id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ body: message })
    });
    if (res.ok) {
      setMessage('');
      loadAll();
    }
  }

  if (loading) return <p style={{ padding: 24 }}>Loading…</p>;
  if (!ws) return <p style={{ padding: 24 }}>Workspace not found.</p>;

  return (
    <main style={{ maxWidth: 1100, margin: '30px auto', fontFamily: 'system-ui' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <h1>Workspace #{ws.id}</h1>
          <div style={{ color: '#555' }}>
            Seller: <strong>{ws.seller_name}</strong> ({ws.seller_email}) • Status: {ws.status}
          </div>
        </div>
        <button onClick={() => router.push('/dashboard')}>Back to Dashboard</button>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginTop: 20 }}>
        <div>
          <h2>Tasks</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {tasks.map(t => (
              <li key={t.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <strong>{t.title}</strong>
                    {t.description ? <div style={{ color: '#555' }}>{t.description}</div> : null}
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                      Assigned to: {t.assigned_to || '—'}
                    </div>
                  </div>
                  <div>
                    <select value={t.status} onChange={e => setStatus(t.id, e.target.value as any)}>
                      <option value="todo">To do</option>
                      <option value="in_progress">In progress</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <form onSubmit={addTask} style={{ marginTop: 16, borderTop: '1px solid #eee', paddingTop: 12 }}>
            <h3>Add Task</h3>
            <input
              placeholder="Task title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              style={{ width: '100%', padding: 8, marginBottom: 8 }}
            />
            <textarea
              placeholder="Description (optional)"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: 8, marginBottom: 8 }}
            />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label>Assign to:</label>
              <select value={assigned} onChange={e => setAssigned(e.target.value as any)}>
                <option value="consultant">Consultant</option>
                <option value="seller">Seller</option>
              </select>
              <button type="submit">Add Task</button>
            </div>
          </form>
        </div>

        <div>
          <h2>Comments</h2>
          <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 10, height: 420, overflowY: 'auto' }}>
            {msgs.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No messages yet.</p>
            ) : (
              msgs.map(m => (
                <div key={m.id} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{m.author} • {new Date(m.created_at).toLocaleString()}</div>
                  <div>{m.body}</div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={sendMessage} style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <input
              placeholder="Write a message to the seller…"
              value={message}
              onChange={e => setMessage(e.target.value)}
              style={{ flex: 1, padding: 8 }}
            />
            <button type="submit">Send</button>
          </form>
        </div>
      </section>
    </main>
  );
}
