// frontend/pages/consultants/[id].tsx
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';


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

export default function ConsultantDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const res = await fetch(`${API}/api/consultants/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <p style={{ padding: 24 }}>Loading…</p>;
  if (!profile) return <p style={{ padding: 24 }}>Consultant not found.</p>;

  return (
    <main style={{ maxWidth: 900, margin: '30px auto', fontFamily: 'system-ui' }}>
      <section style={{ display: 'flex', gap: 16 }}>
        <img
          src={profile.avatar_url || 'https://via.placeholder.com/128'}
          alt={profile.name}
          width={128}
          height={128}
          style={{ borderRadius: 12, objectFit: 'cover' }}
        />
        <div>
          <h1 style={{ marginBottom: 4 }}>{profile.name}</h1>
          <div style={{ color: '#555' }}>{profile.headline || '—'}</div>
          <div style={{ marginTop: 8, color: profile.available ? '#15803d' : '#9ca3af' }}>
            {profile.available ? 'Open to engagements' : 'Currently booked'}
          </div>
          <div style={{ marginTop: 8 }}>
            {profile.location && <span>📍 {profile.location}</span>}
            {profile.hourly_rate ? <span style={{ marginLeft: 12 }}>${profile.hourly_rate}/hr</span> : null}
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 10 }}>
            {profile.website && <a href={profile.website} target="_blank" rel="noreferrer">Website</a>}
            {profile.linkedin && <a href={profile.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>}
            {profile.github && <a href={profile.github} target="_blank" rel="noreferrer">GitHub</a>}
          </div>
        </div>
      </section>

      <section style={{ marginTop: 20 }}>
        <h2>About</h2>
        <p style={{ whiteSpace: 'pre-wrap' }}>{profile.bio || '—'}</p>
      </section>

      <section style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <h3>Industries</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(profile.industries || []).map(tag => (
              <span key={tag} style={{ background: '#f3f4f6', padding: '2px 8px', borderRadius: 999, fontSize: 12 }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div>
          <h3>Specialties</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(profile.specialties || []).map(tag => (
              <span key={tag} style={{ background: '#e0f2fe', padding: '2px 8px', borderRadius: 999, fontSize: 12 }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
<section style={{ marginTop: 30 }}>
  <h2>Request Intro</h2>
  <form
    onSubmit={async (e) => {
      e.preventDefault();
      const res = await fetch(`${API}/api/consultants/${id}/request-intro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_name: prompt('Your name'),
          sender_email: prompt('Your email'),
          message: prompt('Brief message (optional)')
        })
      });
      if (res.ok) alert('Intro request sent!');
      else alert('Failed to send request.');
    }}
  >
    <button type="submit">Request Intro</button>
  </form>
</section>
<section style={{ marginTop: 30 }}>
  <h2>Request Intro</h2>
  <form
    onSubmit={async (e) => {
      e.preventDefault();
      if (!id) return;
      const res = await fetch(`${API}/api/consultants/${id}/request-intro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_name: prompt('Your name'),
          sender_email: prompt('Your email'),
          message: prompt('Brief message (optional)')
        })
      });
      if (res.ok) alert('Intro request sent!');
      else alert('Failed to send request.');
    }}
  >
    <button type="submit">Request Intro</button>
  </form>
</section>
