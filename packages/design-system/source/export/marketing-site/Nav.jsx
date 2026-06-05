// Top nav — cream-glass on scroll, dark on hero overlap
function Nav() {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', on);
    return () => window.removeEventListener('scroll', on);
  }, []);

  const linkS = { color: 'var(--fg)', fontSize: 14, fontWeight: 500, cursor: 'pointer', padding: '6px 0', borderBottom: '1px solid transparent' };

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      height: 64,
      background: scrolled ? 'rgba(253,245,230,0.80)' : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
      transition: 'background 200ms var(--ease-state), border-color 200ms',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', height: '100%', padding: '0 32px', display: 'flex', alignItems: 'center', gap: 32 }}>
        <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--fg)', borderBottom: 0 }}>
          <img src="assets/logo-color.svg" style={{ height: 32 }} alt="Human Growth" />
        </a>
        <div style={{ display: 'flex', gap: 28, marginLeft: 16 }}>
          <a style={linkS}>Paths</a>
          <a style={linkS}>Mentorships</a>
          <a style={linkS}>For teams</a>
          <a style={linkS}>Pricing</a>
        </div>
        <div style={{ flex: 1 }}></div>
        <a style={{ ...linkS, marginRight: 4 }}>Log in</a>
        <button style={{
          background: 'var(--orange-500)', color: '#fff', border: 0,
          padding: '10px 18px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer',
          fontFamily: 'var(--font-body)',
        }}>Get started</button>
      </div>
    </nav>
  );
}

window.Nav = Nav;
