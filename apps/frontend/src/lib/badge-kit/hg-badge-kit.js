/*!
 * HumanGrowth Badge Kit — glassmorphic edition, vanilla JS, no dependencies.
 * Renders the brand's hexagonal achievement badge (frosted-glass treatment) as an
 * inline SVG string or DOM node.
 * Usage:
 *   HGBadge.render({ picto:'rocket', accent:'#E8530A', title:'Sólido',
 *                     code:'BM', divName:'Estabilidad material', rank:2, state:'earned', size:190 })
 *   -> returns an <svg> DOM element you can append anywhere.
 *   HGBadge.svgString({ ...same options }) -> returns the raw SVG markup string.
 *
 * Ships with pattern-mosaic-blur.png (a pre-blurred, pre-downscaled crop of the brand
 * mosaic pattern) — keep it alongside this file; it's referenced by relative path so a
 * live per-badge blur is never computed in the browser (that hangs on large sources).
 * Set HGBadge.assetBase = 'path/to/folder/' before rendering to point elsewhere.
 */
(function (global) {
  'use strict';

  var DIM_PATHS = {
    rocket: 'M24 2 C31 9 33 21 30 31 L18 31 C15 21 17 9 24 2 Z M24 11 A4 4 0 0 0 24 19 A4 4 0 0 0 24 11 Z M17 30 L10 35 L14 24 Z M31 30 L38 35 L34 24 Z M20 34 L24 46 L28 34 Z',
    star: 'M24.0 4.0 L29.1 18.0 L44.0 18.5 L32.2 27.7 L36.3 42.0 L24.0 33.6 L11.7 42.0 L15.8 27.7 L4.0 18.5 L18.9 18.0 Z',
    chat: 'M9 9 H39 A5 5 0 0 1 44 14 V30 A5 5 0 0 1 39 35 H23 L14 43 L15 35 H9 A5 5 0 0 1 4 30 V14 A5 5 0 0 1 9 9 Z',
    sprout: 'M21.5 45 V26 H26.5 V45 Z M22 30 C10 30 6 19 8 12 C19 12 25 20 24 31 Z M26 25 C38 25 42 15 40 9 C30 9 24 16 25 26 Z',
    scales: 'M23 6 H25 V41 H23 Z M15 41 H33 L35 46 H13 Z M8 15 H40 V17.5 H8 Z M24 4 A2.4 2.4 0 0 0 24 8.8 A2.4 2.4 0 0 0 24 4 Z M6 30 L14 16.5 L22 30 A8 4 0 0 1 6 30 Z M26 30 L34 16.5 L42 30 A8 4 0 0 1 26 30 Z',
    bulb: 'M24 3 C14 3 7 10 7 19 C7 26 12 30 15 34 L15 38 H33 L33 34 C36 30 41 26 41 19 C41 10 34 3 24 3 Z M17 40 H31 V42.5 H17 Z M18.5 44 H29.5 V46.5 H18.5 Z',
  };

  // The 6 HumanGrowth dimensions — accent color + pictogram key.
  var DIMENSIONS = {
    d1: { code: 'D1', name: 'Estabilidad Emocional y Material', accent: '#E8A030', picto: 'bulb' },
    d2: { code: 'D2', name: 'Propósito y Significado', accent: '#C8A76E', picto: 'star' },
    d3: { code: 'D3', name: 'Relaciones y Conexión', accent: '#4A7A54', picto: 'chat' },
    d4: { code: 'D4', name: 'Salud y Bienestar', accent: '#7FA277', picto: 'sprout' },
    d5: { code: 'D5', name: 'Paz Interior y Claridad', accent: '#2C3E50', picto: 'scales' },
    d6: { code: 'D6', name: 'Carrera Profesional', accent: '#E8530A', picto: 'rocket' },
  };

  function toHsl(hex) {
    var n = parseInt(hex.slice(1), 16);
    var r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    var h = 0, s = 0, l = (mx + mn) / 2;
    if (d) {
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }
  function hsl(h, s, l) {
    h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
    var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, r, g, b;
    if (h < 60) { r = c; g = x; b = 0; } else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; } else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; } else { r = c; g = 0; b = x; }
    function t(v) { return ('0' + Math.round((v + m) * 255).toString(16)).slice(-2); }
    return '#' + t(r) + t(g) + t(b);
  }
  function wrap(text, max) {
    var words = String(text || '').toUpperCase().split(/\s+/).filter(Boolean);
    var lines = [], cur = '';
    words.forEach(function (w) {
      if (!cur) { cur = w; return; }
      if ((cur + ' ' + w).length <= max) cur += ' ' + w; else { lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur);
    return lines.slice(0, 3);
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function uid() { return 'hgb' + Math.random().toString(36).slice(2, 9); }

  // characteristic background motif per dimension — reads faintly through the frosted glass
  function dimDetails(picto) {
    switch (picto) {
      case 'rocket': // Carrera Profesional — ascending flight path + motion lines
        return '<path d="M4 214 C 50 186 78 148 104 112 S 152 56 196 8" stroke="#FFFFFF" stroke-width="2" fill="none" stroke-dasharray="1 9" stroke-linecap="round" opacity=".55"/>' +
          '<circle cx="104" cy="112" r="2.6" fill="#FFFFFF" opacity=".45"/>' +
          '<circle cx="150" cy="60" r="2" fill="#FFFFFF" opacity=".40"/>' +
          '<g opacity=".35"><line x1="162" y1="30" x2="180" y2="12" stroke="#FFFFFF" stroke-width="2"/><line x1="150" y1="44" x2="168" y2="26" stroke="#FFFFFF" stroke-width="2"/><line x1="138" y1="58" x2="156" y2="40" stroke="#FFFFFF" stroke-width="2"/></g>';
      case 'star': { // Propósito y Significado — sunburst rays
        var cx = 100, cy = 64, s = '';
        for (var a = 0; a < 360; a += 30) {
          var rad = a * Math.PI / 180, len = (a / 30) % 2 === 0 ? 46 : 30;
          s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + Math.cos(rad) * len).toFixed(1) + '" y2="' + (cy + Math.sin(rad) * len).toFixed(1) + '" stroke="#FFFFFF" stroke-width="1.4" opacity=".34"/>';
        }
        s += '<circle cx="' + cx + '" cy="' + cy + '" r="3" fill="#FFFFFF" opacity=".45"/>';
        return s;
      }
      case 'chat': { // Relaciones y Conexión — connected node network
        var pts = [[46, 150], [96, 124], [150, 146], [70, 190], [128, 188]];
        var lines = [[0, 1], [1, 2], [0, 3], [1, 3], [1, 4], [2, 4]], s2 = '';
        lines.forEach(function (l) { s2 += '<line x1="' + pts[l[0]][0] + '" y1="' + pts[l[0]][1] + '" x2="' + pts[l[1]][0] + '" y2="' + pts[l[1]][1] + '" stroke="#FFFFFF" stroke-width="1.1" opacity=".34"/>'; });
        pts.forEach(function (p) { s2 += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3.2" fill="#FFFFFF" opacity=".45"/>'; });
        return s2;
      }
      case 'sprout': // Salud y Bienestar — growing vine with leaves
        return '<path d="M100 216 C 96 180 104 150 98 118 C 94 92 106 70 100 46" stroke="#FFFFFF" stroke-width="1.8" fill="none" opacity=".40"/>' +
          '<ellipse cx="82" cy="168" rx="14" ry="7" fill="#FFFFFF" opacity=".32" transform="rotate(-28 82 168)"/>' +
          '<ellipse cx="118" cy="140" rx="14" ry="7" fill="#FFFFFF" opacity=".32" transform="rotate(24 118 140)"/>' +
          '<ellipse cx="80" cy="100" rx="12" ry="6" fill="#FFFFFF" opacity=".32" transform="rotate(-20 80 100)"/>' +
          '<ellipse cx="118" cy="70" rx="12" ry="6" fill="#FFFFFF" opacity=".32" transform="rotate(22 118 70)"/>';
      case 'scales': { // Paz Interior y Claridad — calm, symmetric horizon bands
        var s3 = '';
        for (var i = 0; i < 7; i++) { var y = 20 + i * 30; s3 += '<line x1="14" y1="' + y + '" x2="186" y2="' + y + '" stroke="#FFFFFF" stroke-width="1.2" opacity="' + (0.22 + (i % 2 ? 0.08 : 0)) + '"/>'; }
        s3 += '<line x1="100" y1="10" x2="100" y2="214" stroke="#FFFFFF" stroke-width="1.2" opacity=".26"/>';
        return s3;
      }
      case 'bulb': { // Estabilidad Emocional y Material — honeycomb foundation grid
        var hexR = 16;
        function hexPts(cx2, cy2, r) { var s4 = ''; for (var k = 0; k < 6; k++) { var a2 = Math.PI / 180 * (60 * k - 30); s4 += (k ? 'L' : 'M') + (cx2 + r * Math.cos(a2)).toFixed(1) + ' ' + (cy2 + r * Math.sin(a2)).toFixed(1) + ' '; } return s4 + 'Z'; }
        var rows = [[100, 30], [64, 56], [136, 56], [28, 82], [100, 82], [172, 82], [64, 108], [136, 108], [100, 134], [28, 160], [172, 160], [64, 186], [136, 186]], s5 = '';
        rows.forEach(function (p) { s5 += '<path d="' + hexPts(p[0], p[1], hexR) + '" stroke="#FFFFFF" stroke-width="1.2" fill="none" opacity=".26"/>'; });
        return s5;
      }
      default: return '';
    }
  }

  // half-width of the inner hexagon at a given y — used to size micro text safely
  function hw(y) { return Math.max(0, 75.5 - 37.7 * Math.abs(y - 109) / 65.5); }

  var MOSAIC_W = 260, MOSAIC_H = 133;

  function svgString(opts) {
    opts = opts || {};
    var id = uid();
    var size = opts.size || 200;
    var compact = !!opts.compact;
    var locked = opts.state === 'locked';
    var raw = opts.accent || '#E8530A';
    var hsA = toHsl(raw);
    var H0 = hsA[0], S0 = hsA[1];

    var accent = locked ? '#A9A294' : raw;
    var accentDeep = locked ? '#8B8476' : hsl(H0, S0, .30);
    var accentSoft = locked ? '#D8D2C4' : hsl(H0, Math.min(S0 + .05, 1), .82);
    var inkOnAccent = '#2A2826';

    var CXh = 100, CYh = 109;
    var baseV = [[56, 32.8], [144, 32.8], [188, 109], [144, 185.2], [56, 185.2], [12, 109]];
    function hexPath(inset) {
      var s = 1 - inset / 92;
      return baseV.map(function (v, k) {
        var x = CXh + (v[0] - CXh) * s, y = CYh + (v[1] - CYh) * s;
        return (k ? 'L ' : 'M ') + x.toFixed(1) + ' ' + y.toFixed(1);
      }).join(' ') + ' Z';
    }

    var bTop = 106, bH = 40;
    var picto = DIM_PATHS[opts.picto] || DIM_PATHS.rocket;
    var mosaicHref = (global.HGBadge && global.HGBadge.assetBase || '') + 'pattern-mosaic-blur.png';

    var svg = '';
    svg += '<svg viewBox="0 0 200 218" width="' + size + '" height="' + Math.round(size * 218 / 200) + '" xmlns="http://www.w3.org/2000/svg">';
    svg += '<defs>';
    svg += '<radialGradient id="' + id + 'sh" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#2A2826" stop-opacity=".24"/><stop offset="100%" stop-color="#2A2826" stop-opacity="0"/></radialGradient>';
    svg += '<linearGradient id="' + id + 'glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFFFFF" stop-opacity=".50"/><stop offset="45%" stop-color="' + accentSoft + '" stop-opacity=".30"/><stop offset="100%" stop-color="' + accent + '" stop-opacity=".22"/></linearGradient>';
    svg += '<linearGradient id="' + id + 'glassBanner" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2A2826" stop-opacity=".46"/><stop offset="100%" stop-color="#14140F" stop-opacity=".60"/></linearGradient>';
    svg += '<linearGradient id="' + id + 'glassBottom" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + accent + '" stop-opacity=".40"/><stop offset="100%" stop-color="' + accentDeep + '" stop-opacity=".55"/></linearGradient>';
    svg += '<radialGradient id="' + id + 'medGlass" cx="38%" cy="32%" r="75%"><stop offset="0%" stop-color="#FFFFFF" stop-opacity=".65"/><stop offset="55%" stop-color="' + accentSoft + '" stop-opacity=".34"/><stop offset="100%" stop-color="' + accent + '" stop-opacity=".28"/></radialGradient>';
    svg += '<linearGradient id="' + id + 'sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffffff" stop-opacity=".55"/><stop offset="60%" stop-color="#ffffff" stop-opacity=".06"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0"/></linearGradient>';
    svg += '<clipPath id="' + id + 'clip"><path d="' + hexPath(9) + '"/></clipPath>';
    svg += '</defs>';

    svg += '<ellipse cx="100" cy="212" rx="62" ry="8" fill="url(#' + id + 'sh)"/>';

    // frosted-glass frame: soft translucent accent stroke, no hard metal edge
    svg += '<path d="' + hexPath(0) + '" fill="none" stroke="' + accent + '" stroke-width="2.2" stroke-linejoin="round" opacity=".55"/>';
    svg += '<path d="' + hexPath(4) + '" fill="none" stroke="#FFFFFF" stroke-width="1.4" stroke-linejoin="round" opacity="' + (locked ? .3 : .5) + '"/>';

    svg += '<g clip-path="url(#' + id + 'clip)">';
    // backdrop blur simulation: vivid saturated color blobs + blurred brand mosaic
    svg += '<rect x="-10" y="-10" width="220" height="240" fill="#FAF3E8"/>';
    svg += '<circle cx="38" cy="46" r="66" fill="' + accent + '" opacity="' + (locked ? .16 : .40) + '"/>';
    svg += '<circle cx="168" cy="66" r="58" fill="#4A7A54" opacity="' + (locked ? .10 : .22) + '"/>';
    svg += '<circle cx="100" cy="195" r="76" fill="' + accentDeep + '" opacity="' + (locked ? .14 : .32) + '"/>';
    svg += '<image href="' + mosaicHref + '" x="-60" y="-50" width="320" height="' + (320 * MOSAIC_H / MOSAIC_W).toFixed(1) + '" preserveAspectRatio="xMidYMid slice" opacity="' + (locked ? .22 : .42) + '"/>';
    svg += '<rect x="-10" y="-10" width="220" height="240" fill="' + accent + '" opacity="' + (locked ? .1 : .22) + '" style="mix-blend-mode:color"/>';
    // glass panels (semi-transparent, layered over the blurred blobs)
    svg += '<rect x="0" y="0" width="200" height="' + bTop + '" fill="url(#' + id + 'glass)"/>';
    svg += '<rect x="0" y="' + bTop + '" width="200" height="' + bH + '" fill="url(#' + id + 'glassBanner)"/>';
    svg += '<rect x="0" y="' + (bTop + bH) + '" width="200" height="' + (218 - bTop - bH) + '" fill="url(#' + id + 'glassBottom)"/>';
    // dimension-characteristic motif, etched on top of the glass so it reads clearly
    svg += '<g opacity="' + (locked ? .55 : 1) + '">' + dimDetails(opts.picto) + '</g>';
    svg += '<polygon points="0,0 90,0 40,218 -40,218" fill="url(#' + id + 'sheen)"/>';
    svg += '<rect x="0" y="' + bTop + '" width="200" height="1" fill="#FFFFFF" opacity=".35"/>';
    svg += '<rect x="0" y="' + (bTop + bH) + '" width="200" height="1" fill="#FFFFFF" opacity=".3"/>';
    svg += '</g>';

    // inner hairline stroke on the glass hexagon
    svg += '<path d="' + hexPath(9) + '" fill="none" stroke="#FFFFFF" stroke-width="1" opacity=".5"/>';

    // HG two-dot motif — brand spacing (center distance ≈ 2.89× dot radius, per isotype)
    var dotY = 47, dotR = compact ? 4.6 : 5, dotOff = dotR * 1.445;
    svg += '<circle cx="' + (100 - dotOff) + '" cy="' + dotY + '" r="' + dotR + '" fill="' + (locked ? 'rgba(169,162,148,.85)' : 'rgba(74,122,84,.88)') + '"/>';
    svg += '<circle cx="' + (100 - dotOff) + '" cy="' + dotY + '" r="' + dotR + '" fill="none" stroke="#fff" stroke-width=".6" opacity=".5"/>';
    svg += '<circle cx="' + (100 + dotOff) + '" cy="' + dotY + '" r="' + dotR + '" fill="' + (locked ? 'rgba(195,188,174,.85)' : 'rgba(232,160,48,.88)') + '"/>';
    svg += '<circle cx="' + (100 + dotOff) + '" cy="' + dotY + '" r="' + dotR + '" fill="none" stroke="#fff" stroke-width=".6" opacity=".5"/>';

    if (compact) {
      svg += '<g transform="translate(100 78) scale(0.62) translate(-24 -24)"><path d="' + picto + '" fill="' + accentDeep + '" opacity=".85" fill-rule="evenodd"/></g>';
    } else {
      var rankN = Math.min(3, Math.floor((Number(opts.rank) || 0) / 2) + 1);
      // rank pips: single dot per level, colored with the dimension's accent
      for (var i = 0; i < 3; i++) {
        var on = i < rankN, cx = 100 + (i - 1) * 16;
        svg += '<circle cx="' + cx + '" cy="60" r="3" fill="' + (on ? accent : 'none') + '" stroke="' + (on ? '#fff' : accentDeep) + '" stroke-width="' + (on ? .7 : 1) + '" opacity="' + (on ? 1 : .32) + '"/>';
      }

      // glass medallion — frosted disc, inner glow ring, floating pictogram
      var mCX = 100, mCY = 80, r = 13;
      svg += '<circle cx="' + mCX + '" cy="' + mCY + '" r="' + (r + 3) + '" fill="none" stroke="#FFFFFF" stroke-width="1" opacity=".4"/>';
      svg += '<circle cx="' + mCX + '" cy="' + mCY + '" r="' + r + '" fill="url(#' + id + 'medGlass)"/>';
      svg += '<circle cx="' + mCX + '" cy="' + mCY + '" r="' + r + '" fill="none" stroke="#FFFFFF" stroke-width="1.1" opacity=".6"/>';
      svg += '<circle cx="' + (mCX - 4) + '" cy="' + (mCY - 5) + '" r="' + (r * 0.42).toFixed(1) + '" fill="#FFFFFF" opacity=".28"/>';
      svg += '<g transform="translate(' + mCX + ' ' + mCY + ') scale(0.38) translate(-24 -24)"><path d="' + picto + '" fill="' + inkOnAccent + '" opacity=".82" fill-rule="evenodd"/></g>';
    }

    var title = wrap(opts.title, compact ? 15 : 16);
    var tSize = title.length >= 3 ? 10.5 : title.length === 2 ? 14 : 18;
    var tGap = title.length >= 3 ? 11 : title.length === 2 ? 15 : 0;
    var tStart = bTop + (title.length === 1 ? 26 : title.length === 2 ? 18 : 14);
    title.forEach(function (ln, i) {
      svg += '<text x="100" y="' + (tStart + i * tGap) + '" text-anchor="middle" fill="#FFFFFF" ' +
        'style="font-family:\'Anton\',sans-serif;font-size:' + tSize + 'px;letter-spacing:.015em">' + esc(ln) + '</text>';
    });

    if (opts.code) {
      var divName = wrap(opts.divName || '', compact ? 14 : 15);
      if (divName.length) {
        svg += '<text x="100" y="158" text-anchor="middle" fill="' + inkOnAccent + '" ' +
          'style="font-family:\'Poppins\',sans-serif;font-weight:700;font-size:' + (compact ? 9.5 : 11) + 'px;letter-spacing:.01em">' + esc(divName[0]) + '</text>';
        svg += '<text x="100" y="171" text-anchor="middle" fill="' + inkOnAccent + '" opacity=".68" ' +
          'style="font-family:\'Anton\',sans-serif;font-size:11.5px;letter-spacing:.06em">' + esc(String(opts.code).toUpperCase()) + '</text>';
      } else {
        svg += '<text x="100" y="165" text-anchor="middle" fill="' + inkOnAccent + '" ' +
          'style="font-family:\'Anton\',sans-serif;font-size:20px;letter-spacing:.03em">' + esc(String(opts.code).toUpperCase()) + '</text>';
      }
    }
    if (opts.micro && !compact && !opts.divName) {
      var mY = 163, avail = hw(mY) * 2 - 14;
      var txt = String(opts.micro).toUpperCase();
      var fit = Math.min(9, avail / (txt.length * 0.74));
      var shown = fit < 5.5 ? txt.slice(0, Math.floor(avail / (5.5 * 0.74))) : txt;
      svg += '<text x="100" y="' + mY + '" text-anchor="middle" fill="' + inkOnAccent + '" opacity=".8" ' +
        'style="font-family:\'Poppins\',sans-serif;font-weight:600;font-size:' + Math.max(5.5, fit).toFixed(1) + 'px;letter-spacing:.10em">' + esc(shown) + '</text>';
    }

    if (locked) {
      svg += '<g transform="translate(146 34) scale(0.5)">' +
        '<rect x="0" y="8" width="24" height="17" rx="3.4" fill="rgba(111,106,94,.85)"/>' +
        '<path d="M5 8 V5 A7 7 0 0 1 19 5 V8" fill="none" stroke="rgba(111,106,94,.85)" stroke-width="3" stroke-linecap="round"/>' +
        '<circle cx="12" cy="16" r="2.6" fill="#F2EEE5"/></g>';
    }

    svg += '</svg>';
    return svg;
  }

  function render(opts) {
    var wrapEl = document.createElement('div');
    wrapEl.innerHTML = svgString(opts).trim();
    var el = wrapEl.firstChild;
    el.style.filter = (opts && opts.state === 'locked')
      ? 'drop-shadow(0 4px 8px rgba(42,40,38,.10))'
      : 'drop-shadow(0 12px 22px rgba(42,40,38,.18))';
    return el;
  }

  function mount(container, opts) {
    var node = render(opts);
    if (typeof container === 'string') container = document.querySelector(container);
    container.appendChild(node);
    return node;
  }

  global.HGBadge = { render: render, mount: mount, svgString: svgString, DIMENSIONS: DIMENSIONS, assetBase: '' };
  // Vendoring compat shim only (no drawing logic touched): a literal
  // `module.exports =` makes the export visible to bundlers that statically
  // analyze exports (Vite/webpack) — a dynamic `global.HGBadge =` alone isn't
  // picked up as an ES `import`able binding by them. Safe no-op when this
  // script runs as a plain browser <script>.
  if (typeof module !== 'undefined' && module.exports) module.exports = global.HGBadge;
})(
  // Not `this`: some bundlers (webpack 5) emit module factories as arrow
  // functions, which ignore a `.call()`-bound `this` entirely (always using
  // their lexical `this`, here `undefined`) — so `this` can't be trusted to
  // mean "module.exports" the way it does under plain Node CJS. `globalThis`
  // is a real language-level binding, unaffected by how the module is wrapped.
  typeof window !== 'undefined' ? window : globalThis,
);
