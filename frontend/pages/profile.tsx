// frontend/pages/profile.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

type Profile = {
  user_id: number;
  name: string;
  email: string;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  industries: string[];
  specialties: string[];
  location: string | null;
  available: boolean;
  hourly_rate: number | null;
  website: string | null;
  linkedin: string | null;
  github: string | null;
  years_experience: number | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<{ id: number; name: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch auth user, then profile
  useEffect(() => {
    (async () => {
      const r = await fetch(`${API}/api/auth/me`, { credentials: 'include' });
      if (!r.ok) return router.replace('/login');
      const { user } = await r.json();
      setMe(user);

      const p = await fetch(`${API}/api/consultants/me`, { credentials: 'include' });
      if (p.ok) {
        const data = await p.json();
        setProfile(data.profile);
      } else {
        // Initialize empty profile if none
        setProfile({
          user_id: user.id,
          name: user.name,
          email: user.email,
          headline: '',
          bio: '',
          avatar_url: '',
          industries: [],
          specialties: [],
          location: '',
          available: true,
          hourly_rate: 150,
          website: '',
          linkedin: '',
          github: '',
          years_experience: 5
        });
      }
      setLoading(false);
    })();
  }, [router]);

  function set<K extends keyof Profile>(key: K, val: Profile[K]) {
    if (!profile) return;
    setProfile({ ...profile, [key]: val });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/consultants/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...profile,
          industries: profile.industries,
          specialties: profile.specialties
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setProfile(data.profile);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p style={{ padding: 24 }}>Loading…</p>;

  const csv = (arr: string[]) => arr.join(', ');
  const parseCsv = (s: string) => s.split(',').map(t => t.trim()).filter(Boolean);

  return (
    <main style={{ maxWidth: 900, margin: '30px auto', fontFamily: 'system-ui' }}>
      <h1>Consultant Profile</h1>
      <p style={{ color: '#555' }}>This is your public profile visible in the directory.</p>

      <form onSubmit={save} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
        <div style={{ gridColumn: '1 / span 2' }}>
          <label>Name</label>
          <input value={profile?.name || ''} disabled style={{ width: '100%', padding: 8 }} />
        </div>

        <div>
          <label>Headline</label>
          <input
            value={profile?.headline || ''}
            onChange={e => set('headline', e.target.value)}
            placeholder="Fractional COO | Exit Readiness Specialist"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label>Location</label>
          <input
            value={profile?.location || ''}
            onChange={e => set('location', e.target.value)}
            placeholder="Salt Lake City, UT"
            style={{ width: '100%', padding: 8 }}
          />
        </div>

        <div style={{ gridColumn: '1 / span 2' }}>
          <label>Bio</label>
          <textarea
            value={profile?.bio || ''}
            onChange={e => set('bio', e.target.value)}
            placeholder="I help service businesses clean up finances, systemize ops, and exit with confidence."
            rows={6}
            style={{ width: '100%', padding: 8 }}
          />
        </div>

        <div>
          <label>Industries (comma-separated)</label>
          <input
            value={csv(profile?.industries || [])}
            onChange={e => set('industries', parseCsv(e.target.value))}
            placeholder="HVAC, Landscaping, Auto Repair"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label>Specialties (comma-separated)</label>
          <input
            value={csv(profile?.specialties || [])}
            onChange={e => set('specialties', parseCsv(e.target.value))}
            placeholder="Exit Planning, SOPs, Valuation, Sales Systems"
            style={{ width: '100%', padding: 8 }}
          />
        </div>

        <div>
          <label>Hourly Rate (USD)</label>
          <input
            type="number"
            min={0}
            value={profile?.hourly_rate || 0}
            onChange={e => set('hourly_rate', Number(e.target.value))}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div>
          <label>Years Experience</label>
          <input
            type="number"
            min={0}
            value={profile?.years_experience || 0}
            onChange={e => set('years_experience', Number(e.target.value))}
            style={{ width: '100%', padding: 8 }}
          />
        </div>

        <div>
          <label>Avatar URL</label>
          <input
            value={profile?.avatar_url || ''}
            onChange={e => set('avatar_url', e.target.value)}
            placeholder="https://…"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            id="available"
            type="checkbox"
            checked={!!profile?.available}
            onChange={e => set('available', e.target.checked)}
          />
          <label htmlFor="available">Open to new engagements</label>
        </div>

        <div>
          <label>Website</label>
          <input value={profile?.website || ''} onChange={e => set('website', e.target.value)} style={{ width: '100%', padding: 8 }} />
        </div>
        <div>
          <label>LinkedIn</label>
          <input value={profile?.linkedin || ''} onChange={e => set('linkedin', e.target.value)} style={{ width: '100%', padding: 8 }} />
        </div>
        <div>
          <label>GitHub</label>
          <input value={profile?.github || ''} onChange={e => set('github', e.target.value)} style={{ width: '100%', padding: 8 }} />
        </div>

        {error && <div style={{ gridColumn: '1 / span 2', color: 'crimson' }}>{error}</div>}
        <div style={{ gridColumn: '1 / span 2' }}>
          <button disabled={saving} type="submit" style={{ padding: '10px 14px' }}>
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </form>
    </main>
  );
}
