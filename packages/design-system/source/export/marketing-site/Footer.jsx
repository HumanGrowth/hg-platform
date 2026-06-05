// Footer — sitemap + logo + fine print
function Footer() {
  const cols = [
    { h: 'Product',  items: ['Paths', 'Mentorships', 'Badges', 'Events', 'Library'] },
    { h: 'For teams', items: ['Pricing', 'Manager view', 'Custom paths', 'Procurement'] },
    { h: 'Resources', items: ['Blog', 'Case studies', 'Help center', 'API docs', 'Status'] },
    { h: 'Company',   items: ['About', 'Careers', 'Press kit', 'Contact'] },
  ];

  return (
    <footer style={{
      background: 'var(--cream-200)', borderTop: '1px solid var(--border)',
      padding: '80px 32px 40px',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.5fr repeat(4, 1fr)', gap: 48 }}>
        <div>
          <img src="assets/logo-color.svg" style={{ height: 56 }} />
          <p className="body-sm" style={{ marginTop: 16, maxWidth: 240, color: 'var(--warm-700)' }}>
            Educational paths, mentorships, and badges for working professionals.
          </p>
        </div>
        {cols.map(c => (
          <div key={c.h}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>{c.h}</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {c.items.map(it => (
                <li key={it}><a style={{ fontSize: 14, color: 'var(--warm-800)' }}>{it}</a></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div style={{
        maxWidth: 1280, margin: '64px auto 0', paddingTop: 24,
        borderTop: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
      }}>
        <div className="body-xs">© 2026 Human Growth, Inc. All rights reserved.</div>
        <div style={{ display: 'flex', gap: 18 }}>
          <a className="body-xs">Privacy</a>
          <a className="body-xs">Terms</a>
          <a className="body-xs">Security</a>
          <a className="body-xs">Status</a>
        </div>
      </div>
    </footer>
  );
}

window.Footer = Footer;
