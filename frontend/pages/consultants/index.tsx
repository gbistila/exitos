// frontend/pages/consultants/index.tsx
import { useEffect, useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

type Item = {
  user_id: number;
  name: string;
  headline: string | null;
  avatar_url: string | null;
  industries: string[];
  specialties: string[];
  location: string | null;
  available: boolean;
  hourly_rate: number | null;
};

export default function DirectoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [available, setAvailable] = useState<'all' | '1' | '0'>('all');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (industry) params.set('industry', industry);
    if (location) params.set('location', location);
    if (available !== 'all') params.set('available', available);
    const res = await fetch(`${API}/api/consultants?${params.toString()}`);
    const data = await res.json();
    setItems(data.items);
    setTotal(data.total);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ maxWidth: 1000, margin: '30px auto', fontFamily: 'system-ui' }}>
      <h1>Consultant Directory</h1>
      <p style={{ color: '#555' }}>Browse vetted consultants for operations, scaling, and exit readiness.</p>

      <section style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 10, marginTop: 16 }}>
        <input placeholder="Search name, headline, bio…" value={q} onChange={e => setQ(e.target.value)} />
        <input placeholder="Industry (e.g., HVAC)" value={industry} onChange={e => setIndustry(e.target.value)} />
        <input placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} />
        <select value={available} onChange={e => setAvailable(e.target.value as any)}>
          <option value="all">Availability</option>
          <option value="1">Open</option>
          <option value="0">Booked</option>
        </select>
        <button onClick={load}>Filter</button>
      </section>

      {loading ? (
        <p style={{ padding: 24 }}>Loading…</p>
      ) : (
        <>
          <p style={{ marginTop: 12, color: '#555' }}>{total} consultants</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
            {items.map(it => (
              <article key={it.user_id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <img
                    src={it.avatar_url || 'https://via.placeholder.com/64'}
                    alt={it.name}
                    width={64}
                    height={64}
                    style={{ borderRadius: 8, objectFit: 'cover' }}
                  />
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0 }}>{it.name}</h3>
                    <div style={{ color: '#555' }}>{it.headline || '—'}</div>
                    <div style={{ color: it.available ? '#15803d' : '#9ca3af', fontSize: 12, marginTop: 4 }}>
                      {it.available ? 'Open to engagements' : 'Currently booked'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {it.hourly_rate ? <div>${it.hourly_rate}/hr</div> : <div>—</div>}
                    <Link href={`/consultants/${it.user_id}`} style={{ color: '#2563eb' }}>
                      View profile →
                    </Link>
                  </div>
                </div>
                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(it.industries || []).slice(0, 4).map(tag => (
                    <span key={tag} style={{ background: '#f3f4f6', padding: '2px 8px', borderRadius: 999, fontSize: 12 }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
