// frontend/pages/login.tsx
import { useState } from 'react';
import { useRouter } from 'next/router';
const API = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<'consultant' | 'seller'>('consultant');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = mode === 'login'
        ? { email, password }
        : { name, email, password, role };
      const res = await fetch(`${API}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');

      // fetch current user to route by role
      const me = await fetch(`${API}/api/auth/me`, { credentials: 'include' });
      const { user } = await me.json();

      // Sellers auto-claim any waiting workspaces by email on first login
      if (user.role === 'seller') {
        await fetch(`${API}/api/workspaces/claim-by-email`, {
          method: 'POST',
          credentials: 'include'
        });
        router.push('/seller/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: '60px auto', fontFamily: 'system-ui' }}>
      <h1>{mode === 'login' ? 'Login' : 'Create your account'}</h1>
      <form onSubmit={submit} style={{ display: 'grid', gap: 12, marginTop: 20 }}>
        {mode === 'register' && (
          <>
            <div>
              <label>Full name</label>
              <input value={name} onChange={e => setName(e.target.value)} required style={{ width: '100%', padding: 8 }} />
            </div>
            <div>
              <label>Account type</label>
              <select value={role} onChange={e => setRole(e.target.value as any)} style={{ width: '100%', padding: 8 }}>
                <option value="consultant">Consultant</option>
                <option value="seller">Seller</option>
              </select>
            </div>
          </>
        )}
        <div>
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', padding: 8 }} />
        </div>
        <div>
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', padding: 8 }} />
        </div>
        {error && <div style={{ color: 'crimson' }}>{error}</div>}
        <button disabled={loading} type="submit" style={{ padding: '10px 14px' }}>
          {loading ? 'Processing…' : mode === 'login' ? 'Log In' : 'Create Account'}
        </button>
      </form>
      <button
        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        style={{ marginTop: 12, background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer' }}
      >
        {mode === 'login' ? 'Need an account? Register' : 'Have an account? Log in'}
      </button>
    </main>
  );
}
