// Pull quote — Instrument Serif moment
function Quote() {
  return (
    <section style={{ maxWidth: 960, margin: '0 auto', padding: '120px 32px', textAlign: 'left' }}>
      <div className="eyebrow eyebrow-accent" style={{ marginBottom: 28 }}>WHY WE BUILT THIS</div>
      <div style={{
        fontFamily: 'var(--font-serif)', fontSize: 56, lineHeight: 1.1,
        color: 'var(--warm-900)', letterSpacing: '-0.01em',
        textWrap: 'balance',
      }}>
        Most growth happens <span style={{ fontStyle: 'italic' }}>between</span> the lessons —
        in the brief you write right after, the question you ask the next morning,
        the thing you ship that you would not have shipped.
      </div>
      <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 9999, background: 'var(--orange-200)',
          color: 'var(--warm-900)', fontWeight: 700, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>PN</div>
        <div>
          <div style={{ fontWeight: 700 }}>Priya Narayanan</div>
          <div className="body-sm">Co-founder · ex-Director PM, Figma</div>
        </div>
      </div>
    </section>
  );
}

window.Quote = Quote;
