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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const body = mode === 'login' ? { email, password } : { name, email, password, role };
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || 'Login failed');

    const me = await fetch(`${API}/api/auth/me`, { credentials: 'include' });
    const { user } = await me.json();

    if (user.role === 'seller') {
      await fetch(`${API}/api/workspaces/claim-by-email`, {
        method: 'POST',
        credentials: 'include'
      });
      router.push('/seller/dashboard');
    } else {
      router.push('/dashboard');
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: '60px auto', fontFamily: 'system-ui' }}>
      <h1>{mode === 'login' ? 'Login' : 'Create Account'}</h1>
      <form onSubmit={submit} style={{ display: 'grid', gap: 12, marginTop: 20 }}>
        {mode === 'register' && (
          <>
            <input placeholder="Full name" value={name} onChange={e => setName(e.target.value)} required />
            <select value={role} onChange={e => setRole(e.target.value as any)}>
              <option value="consultant">Consultant</option>
              <option value="seller">Seller</option>
            </select>
          </>
        )}
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        {error && <div style={{ color: 'crimson' }}>{error}</div>}
        <button type="submit">{mode === 'login' ? 'Log In' : 'Register'}</button>
      </form>
      <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} style={{ marginTop: 12 }}>
        {mode === 'login' ? 'Need an account? Register' : 'Have an account? Log in'}
      </button>
    </main>
  );
}
