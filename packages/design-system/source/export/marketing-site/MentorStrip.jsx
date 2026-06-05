// Mentor strip — portraits, B&W warm-tinted (placeholders since no real photography)
function MentorStrip() {
  const mentors = [
    { name: 'Anjali Rao',    role: 'VP Eng',         co: 'Stripe',  ring: 'var(--orange-500)', tone: 'var(--cream-300)' },
    { name: 'Marcus Beck',   role: 'Staff Designer', co: 'Linear',  ring: 'var(--warm-900)',   tone: 'var(--cream-200)' },
    { name: 'Priya Narayan', role: 'Director PM',    co: 'Figma',   ring: 'var(--orange-500)', tone: 'var(--cream-400)' },
    { name: 'Jordan Reyes',  role: 'Founder',        co: 'Retool',  ring: 'var(--warm-900)',   tone: 'var(--cream-300)' },
    { name: 'Lin Kahale',    role: 'Eng Manager',    co: 'Vercel',  ring: 'var(--orange-500)', tone: 'var(--cream-200)' },
  ];

  return (
    <section style={{
      background: 'var(--warm-900)', color: 'var(--cream-100)',
      padding: '120px 0',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 56, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="eyebrow" style={{ color: 'var(--orange-300)', marginBottom: 16 }}>MENTORSHIPS</div>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 64, lineHeight: 0.95,
              textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0,
              color: 'var(--cream-100)', maxWidth: 720,
            }}>
              Mentors who shipped<br />the thing you are stuck on.
            </h2>
          </div>
          <a href="#" style={{ color: 'var(--orange-300)', fontWeight: 600, borderBottom: '1px solid var(--orange-300)', paddingBottom: 2 }}>
            Browse all 60+ mentors  →
          </a>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 20 }}>
          {mentors.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Portrait placeholder — warm-tinted gradient block */}
              <div style={{
                aspectRatio: '3/4',
                background: `linear-gradient(160deg, ${m.tone}, var(--warm-700) 200%)`,
                borderRadius: 12, position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', bottom: 12, left: 12,
                  fontFamily: 'var(--font-display)', fontSize: 72,
                  color: 'var(--warm-900)', opacity: 0.32, lineHeight: 0.85,
                }}>{m.name.split(' ').map(n => n[0]).join('')}</div>
                <div style={{
                  position: 'absolute', top: 10, right: 10,
                  background: m.ring, color: m.ring === 'var(--orange-500)' ? '#fff' : 'var(--cream-100)',
                  padding: '4px 10px', borderRadius: 9999,
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>Booking</div>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{m.name}</div>
                <div className="body-sm" style={{ color: '#B8A799' }}>{m.role} · {m.co}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

window.MentorStrip = MentorStrip;
