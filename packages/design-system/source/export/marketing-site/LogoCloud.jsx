// Logo cloud — companies-using-it strip
function LogoCloud() {
  const companies = ['LINEAR', 'STRIPE', 'FIGMA', 'NOTION', 'VERCEL', 'RAMP', 'RETOOL'];
  return (
    <section style={{
      maxWidth: 1280, margin: '0 auto', padding: '0 32px 80px',
      textAlign: 'center',
    }}>
      <div className="eyebrow" style={{ marginBottom: 28 }}>
        TRUSTED BY TEAMS AT
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 32, opacity: 0.55,
      }}>
        {companies.map(c => (
          <div key={c} style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22, letterSpacing: '-0.01em',
            color: 'var(--warm-900)',
          }}>{c}</div>
        ))}
      </div>
    </section>
  );
}

window.LogoCloud = LogoCloud;
