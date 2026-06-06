/* ============================================================
   Human Growth — Social Kit artboards
   ------------------------------------------------------------
   Each artboard renders at its native social-platform pixel size.
   Designed inside a DCArtboard which then scales to fit the canvas.
   ============================================================ */

const QUOTE = "La verdadera innovación comienza cuando la tecnología expande lo mejor del ser humano.";

/* ------- Small building blocks ------- */

// Faceted ring — uses the <defs> built in social-kit.html
const Ring = ({ size = 200, color = '#FF4500', style }) =>
<svg
  width={size}
  height={size}
  viewBox="0 0 200 200"
  style={{ color, display: 'block', ...(style || {}) }}
  aria-hidden="true">
  
    <g fill="currentColor"><use href="#hgRing" /></g>
  </svg>;


// Faceted horizontal divider — the brand's "hr" element
const FacetDivider = ({ width = 320, color = '#FF4500', h = 14 }) => {
  const tw = 12,segs = Math.round(width / tw);
  return (
    <svg width={width} height={h} viewBox={`0 0 ${segs * tw} ${h}`} aria-hidden="true">
      {Array.from({ length: segs }).map((_, i) =>
      <polygon key={i} points={`${i * tw},${h} ${i * tw + tw / 2},2 ${(i + 1) * tw},${h}`} fill={color} />
      )}
    </svg>);

};

// Wordmark — typed (not the logo SVG) so it crisps at every size and lets us
// pair it with the ring at whatever proportion fits the format.
const Wordmark = ({ size = 28, color = 'currentColor', tight = false }) =>
<span
  style={{
    fontFamily: 'Anton, sans-serif',
    textTransform: 'uppercase',
    letterSpacing: tight ? '0.01em' : '0.04em',
    fontSize: size,
    lineHeight: 1,
    color,
    whiteSpace: 'nowrap',
    display: 'inline-block'
  }}>
  
    Human&nbsp;Growth
  </span>;


// Logomark (ring + wordmark inline) — left-aligned by default
const Lockup = ({ ringSize = 56, textSize = 30, color = 'currentColor', tight = false }) =>
<div style={{ display: 'flex', alignItems: 'center', gap: ringSize * 0.32, color }}>
    <Ring size={ringSize} color="currentColor" />
    <Wordmark size={textSize} tight={tight} />
  </div>;


// Tiny attribution chip used across formats
const Attribution = ({ color = 'var(--fg-muted)' }) =>
<div style={{ display: 'flex', alignItems: 'center', gap: 12, color }}>
    <span style={{
    fontFamily: 'Manrope, sans-serif', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.16em', fontSize: 13
  }}>
      Human Growth · Manifesto
    </span>
  </div>;


/* ============================================================
   LinkedIn banners — 1584 × 396
   The LinkedIn avatar overlay sits bottom-left as a ~280px circle
   overlapping ~50% below the banner, so we keep the top-left and
   center-right zones as the "safe" content area.
   ============================================================ */

const LinkedInDark = () =>
<div className="art grain grain-light" style={{ background: '#13100D', color: '#F5EBD6' }}>
    {/* huge cropped ring bleeding off the left */}
    <Ring size={620} color="#FF4500" style={{
    position: 'absolute', left: -180, top: -180, opacity: 0.95
  }} />
    {/* very subtle inner echo */}
    <Ring size={620} color="#FF4500" style={{
    position: 'absolute', left: -180, top: -180, opacity: 0.18,
    transform: 'rotate(10deg)'
  }} />

    {/* Top-right small lockup */}
    <div style={{ position: 'absolute', top: 36, right: 56, display: 'flex', alignItems: 'center', gap: 14 }}>
      <Ring size={28} color="#FF4500" />
      <span style={{ fontFamily: 'Anton', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 22, color: '#F5EBD6' }}>
        Human Growth
      </span>
    </div>

    {/* Quote, anchored vertically centered, right of the ring */}
    <div style={{
    position: 'absolute', left: 470, right: 60, top: 0, bottom: 0,
    display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18
  }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ display: 'inline-block', width: 36, height: 2, background: '#FF4500' }} />
        <span style={{
        fontFamily: 'Manrope', fontWeight: 700, fontSize: 13,
        textTransform: 'uppercase', letterSpacing: '0.18em', color: '#FF8A52'
      }}>Manifiesto · 01</span>
      </div>
      <p className="quote-serif" style={{
      fontSize: 38, lineHeight: 1.22, color: '#F5EBD6', maxWidth: 1000
    }}>
        Construyendo la infraestructura que conecta el <em style={{ fontStyle: 'italic', color: '#FFB48A' }}>potencial humano</em> con la inteligencia artificial.
      </p>
    </div>
  </div>;


const LinkedInCream = () =>
<div className="art grain" style={{ background: '#FDF5E6', color: '#1A140F' }}>
    {/* huge faded ring on right edge */}
    <Ring size={540} color="#FF4500" style={{
    position: 'absolute', right: -120, top: -120, opacity: 0.10
  }} />
    {/* faceted vertical divider on left of quote */}
    <div style={{
    position: 'absolute', left: 480, top: 70, bottom: 70, width: 2,
    background: 'rgba(26,20,15,0.18)'
  }} />

    {/* Left column: lockup + label */}
    <div style={{
    position: 'absolute', left: 60, top: 0, bottom: 0, width: 400,
    display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 28
  }}>
      <Lockup ringSize={64} textSize={36} color="#1A140F" tight />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 10, height: 10, background: '#FF4500', display: 'inline-block' }} />
        <span style={{
        fontFamily: 'Manrope', fontWeight: 700, fontSize: 12,
        textTransform: 'uppercase', letterSpacing: '0.2em', color: '#5C4A3F'
      }}>Plataforma de aprendizaje profesional</span>
      </div>
    </div>

    {/* Right column: quote */}
    <div style={{
    position: 'absolute', left: 530, right: 60, top: 0, bottom: 0,
    display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22
  }}>
      <p className="quote-serif" style={{
      fontSize: 38, lineHeight: 1.2, color: '#1A140F', maxWidth: 940
    }}>
        La verdadera innovación comienza cuando la tecnología expande <span style={{ color: '#B33000' }}>lo mejor del ser humano</span>.
      </p>
    </div>
  </div>;


const LinkedInOrange = () =>
<div className="art" style={{ background: '#FF4500', color: '#FDF5E6' }}>
    {/* faceted texture band at bottom */}
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 18, overflow: 'hidden', opacity: 0.55 }}>
      <FacetDivider width={1600} color="#FDF5E6" h={18} />
    </div>

    {/* inner ring monogram on far left */}
    <div style={{ position: 'absolute', left: 64, top: 64, bottom: 88, width: 240, display: 'grid', placeItems: 'center' }}>
      <div style={{ position: 'relative', width: 240, height: 240 }}>
        <Ring size={240} color="#FDF5E6" />
        <span style={{
        position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
        fontFamily: 'Anton', fontSize: 92, color: '#FDF5E6', letterSpacing: '-0.02em'
      }}>HG</span>
      </div>
    </div>

    {/* Headline — display treatment, big */}
    <div style={{
    position: 'absolute', left: 360, right: 60, top: 0, bottom: 0,
    display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18
  }}>
      <h2 className="quote-display" style={{ fontSize: 64, color: '#FDF5E6', maxWidth: 1100 }}>
        La tecnología expande<br />
        <span style={{ color: '#1A140F' }}>lo mejor del ser humano.</span>
      </h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: '#FFD9C2' }}>
        <span style={{ width: 28, height: 2, background: '#FDF5E6' }} />
        <span style={{
        fontFamily: 'Manrope', fontWeight: 700, fontSize: 14,
        textTransform: 'uppercase', letterSpacing: '0.2em'
      }}>Human Growth · Manifiesto</span>
      </div>
    </div>
  </div>;


/* ============================================================
   X / Twitter header — 1500 × 500
   Avatar overlay is bottom-left circle ~200px on a 1500×500 canvas.
   ============================================================ */
const XHeader = () =>
<div className="art grain grain-light" style={{ background: '#1A140F', color: '#F5EBD6' }}>
    <Ring size={760} color="#FF4500" style={{
    position: 'absolute', right: -240, top: -200, opacity: 0.92
  }} />
    <Ring size={760} color="#FF4500" style={{
    position: 'absolute', right: -240, top: -200, opacity: 0.16,
    transform: 'rotate(8deg)'
  }} />

    <div style={{
    position: 'absolute', left: 64, right: 380, top: 0, bottom: 0,
    display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22
  }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Ring size={36} color="#FF4500" />
        <span style={{
        fontFamily: 'Anton', fontSize: 28, letterSpacing: '0.04em',
        textTransform: 'uppercase', color: '#F5EBD6'
      }}>Human Growth</span>
      </div>
      <p className="quote-serif" style={{
      fontSize: 48, lineHeight: 1.16, color: '#F5EBD6', maxWidth: 920
    }}>
        <span style={{ color: '#FF4500' }}>“</span>La verdadera innovación comienza cuando la tecnología expande
        <em style={{ color: '#FFB48A' }}> lo mejor</em> del ser humano.<span style={{ color: '#FF4500' }}>”</span>
      </p>
    </div>
  </div>;


/* ============================================================
   Square posts — 1080 × 1080
   ============================================================ */

const SquareSerif = () =>
<div className="art grain" style={{ background: '#FDF5E6', color: '#1A140F', padding: 80 }}>
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      {/* top: small lockup */}
      <Lockup ringSize={56} textSize={32} color="#1A140F" tight />

      {/* center: the quote */}
      <div style={{ position: 'relative' }}>
        <span style={{
        position: 'absolute', left: -16, top: -120,
        fontFamily: 'Instrument Serif', fontStyle: 'italic',
        fontSize: 280, lineHeight: 0.6, color: '#FF4500'
      }}>“</span>
        <p className="quote-serif" style={{
        fontSize: 70, lineHeight: 1.18, color: '#1A140F',
        maxWidth: 920, position: 'relative'
      }}>
          La verdadera innovación comienza cuando la tecnología expande <span style={{ color: '#B33000' }}>lo mejor del ser humano</span>.
        </p>
      </div>

      {/* bottom: divider + attribution */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <FacetDivider width={920} color="#FF4500" h={12} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Attribution color="#5C4A3F" />
          <span style={{
          fontFamily: 'Manrope', fontWeight: 600, fontSize: 13,
          textTransform: 'uppercase', letterSpacing: '0.18em', color: '#8A7765'
        }}>humangrowth.com</span>
        </div>
      </div>
    </div>
  </div>;


const SquareDisplay = () =>
<div className="art" style={{ background: '#FDF5E6', color: '#1A140F', padding: 80 }}>
    {/* faceted ring corner accent */}
    <Ring size={300} color="#FF4500" style={{
    position: 'absolute', right: -80, bottom: -80, opacity: 0.18
  }} />

    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ width: 14, height: 14, background: '#FF4500' }} />
        <span style={{
        fontFamily: 'Manrope', fontWeight: 700, fontSize: 14,
        textTransform: 'uppercase', letterSpacing: '0.22em', color: '#5C4A3F'
      }}>Manifiesto · No. 01</span>
      </div>

      <h2 className="quote-display" style={{ fontSize: 130, color: '#1A140F', lineHeight: 0.96 }}>
        La verdadera<br />
        innovación<br />
        <span style={{ color: '#FF4500' }}>comienza</span><br />
        en lo humano.
      </h2>

      <div>
        <p className="quote-serif" style={{ fontSize: 26, lineHeight: 1.35, color: '#5C4A3F', maxWidth: 800, marginBottom: 32 }}>
          Cuando la tecnología expande lo mejor del ser humano.
        </p>
        <Lockup ringSize={48} textSize={28} color="#1A140F" tight />
      </div>
    </div>
  </div>;


const SquareDark = () =>
<div className="art grain grain-light" style={{ background: '#13100D', color: '#F5EBD6', padding: 80 }}>
    <Ring size={780} color="#FF4500" style={{
    position: 'absolute', left: -260, top: -260, opacity: 0.95
  }} />
    <Ring size={780} color="#FF4500" style={{
    position: 'absolute', left: -260, top: -260, opacity: 0.18,
    transform: 'rotate(10deg)'
  }} />

    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
        fontFamily: 'Manrope', fontWeight: 700, fontSize: 13,
        textTransform: 'uppercase', letterSpacing: '0.22em', color: '#FF8A52'
      }}>Manifiesto · 01</span>
        <span style={{
        fontFamily: 'Anton', fontSize: 24, letterSpacing: '0.06em',
        textTransform: 'uppercase', color: '#F5EBD6'
      }}>Human Growth</span>
      </div>

      <p className="quote-serif" style={{
      fontSize: 64, lineHeight: 1.18, color: '#F5EBD6', maxWidth: 880
    }}>
        <span style={{ color: '#FF4500' }}>“</span>La verdadera innovación comienza cuando la tecnología expande <em style={{ color: '#FFB48A' }}>lo mejor</em> del ser humano.<span style={{ color: '#FF4500' }}>”</span>
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <FacetDivider width={200} color="#FF4500" h={12} />
        <span style={{
        fontFamily: 'Manrope', fontWeight: 600, fontSize: 13,
        textTransform: 'uppercase', letterSpacing: '0.18em', color: '#B8A799'
      }}>humangrowth.com</span>
      </div>
    </div>
  </div>;


/* ============================================================
   Stories / Reels — 1080 × 1920
   ============================================================ */

const StorySerif = () =>
<div className="art grain" style={{ background: '#FDF5E6', color: '#1A140F', padding: 96 }}>
    <Ring size={420} color="#FF4500" style={{
    position: 'absolute', right: -120, top: -120, opacity: 0.16
  }} />

    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
      <Lockup ringSize={64} textSize={36} color="#1A140F" tight />

      <div>
        <span style={{
        fontFamily: 'Instrument Serif', fontStyle: 'italic',
        fontSize: 280, lineHeight: 0.6, color: '#FF4500',
        display: 'block', marginBottom: -40, marginLeft: -8
      }}>“</span>
        <p className="quote-serif" style={{
        fontSize: 82, lineHeight: 1.16, color: '#1A140F', maxWidth: 880
      }}>
          La verdadera innovación comienza cuando la tecnología expande <span style={{ color: '#B33000' }}>lo mejor del ser humano</span>.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <FacetDivider width={500} color="#FF4500" h={14} />
        <span style={{
        fontFamily: 'Manrope', fontWeight: 600, fontSize: 22,
        textTransform: 'uppercase', letterSpacing: '0.2em', color: '#5C4A3F'
      }}>Manifiesto · No. 01</span>
      </div>
    </div>
  </div>;


const StoryPoster = () =>
<div className="art grain grain-light" style={{ background: '#13100D', color: '#F5EBD6', padding: 96 }}>
    {/* Big bottom ring */}
    <Ring size={1080} color="#FF4500" style={{
    position: 'absolute', left: '50%', bottom: -540,
    transform: 'translateX(-50%)', opacity: 0.95
  }} />
    <Ring size={1080} color="#FF4500" style={{
    position: 'absolute', left: '50%', bottom: -540,
    transform: 'translateX(-50%) rotate(8deg)', opacity: 0.18
  }} />

    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
      <div style={{ textAlign: 'center' }}>
        <span style={{
        fontFamily: 'Manrope', fontWeight: 700, fontSize: 20,
        textTransform: 'uppercase', letterSpacing: '0.3em', color: '#FF8A52'
      }}>Manifiesto · 01</span>
      </div>

      <h2 className="quote-display" style={{
      fontSize: 158, lineHeight: 0.94, color: '#F5EBD6', textAlign: 'left'
    }}>
        Lo mejor<br />
        del ser<br />
        <span style={{ color: '#FF4500' }}>humano.</span>
      </h2>

      <div>
        <p className="quote-serif" style={{
        fontSize: 36, lineHeight: 1.28, color: '#F5EBD6', maxWidth: 760, opacity: 0.92
      }}>
          La verdadera innovación comienza cuando la tecnología <em>nos</em> expande.
        </p>
        <div style={{ marginTop: 36, display: 'flex', alignItems: 'center', gap: 18 }}>
          <Ring size={44} color="#FF4500" />
          <span style={{
          fontFamily: 'Anton', fontSize: 30, letterSpacing: '0.04em',
          textTransform: 'uppercase', color: '#F5EBD6'
        }}>Human Growth</span>
        </div>
      </div>
    </div>
  </div>;


/* ============================================================
   Profile avatars — 400 × 400 (host masks to circle on most platforms)
   ============================================================ */

const AvatarOrange = () =>
<div className="art" style={{ background: '#FF4500', display: 'grid', placeItems: 'center' }}>
    <div style={{ position: 'relative', width: 320, height: 320 }}>
      <Ring size={320} color="#FDF5E6" />
      <span style={{
      position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
      fontFamily: 'Anton', fontSize: 150, color: '#FDF5E6',
      letterSpacing: '-0.04em'
    }}>HG</span>
    </div>
  </div>;


const AvatarInk = () =>
<div className="art" style={{ background: '#FDF5E6', display: 'grid', placeItems: 'center' }}>
    <div style={{ position: 'relative', width: 320, height: 320 }}>
      <Ring size={320} color="#1A140F" />
      <span style={{
      position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
      fontFamily: 'Anton', fontSize: 150, color: '#FF4500',
      letterSpacing: '-0.04em'
    }}>HG</span>
    </div>
  </div>;


const AvatarMono = () =>
<div className="art" style={{ background: '#13100D', display: 'grid', placeItems: 'center' }}>
    <Ring size={340} color="#FF4500" />
  </div>;


/* ------------------------------------------------------------ */
window.SocialArtboards = {
  LinkedInDark, LinkedInCream, LinkedInOrange, XHeader,
  SquareSerif, SquareDisplay, SquareDark,
  StorySerif, StoryPoster,
  AvatarOrange, AvatarInk, AvatarMono
};