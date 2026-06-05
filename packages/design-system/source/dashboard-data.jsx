// ============================================================
// Human Growth — Dashboard data model
// Deterministic, no deps. getData(level, range) -> dashboard payload.
//   level: 'me' | 'team'
//   range: '6w' | 'q' | '12m'
// ============================================================

// Brand-aligned competency colors (all within the warm orange family +
// two warm-neutral analogues so the radar/bars stay on-brand, never rainbow).
const COMP_META = [
  { key: 'ai',    label: 'AI adaptability',        color: '#FF4500' },
  { key: 'ops',   label: 'Operational excellence', color: '#FF6A26' },
  { key: 'team',  label: 'Team adaptability',      color: '#FF8A52' },
  { key: 'lead',  label: 'Leadership & mentorship',color: '#B8741A' },
  { key: 'comm',  label: 'Communication',          color: '#7A2100' },
];

// Level name -> proficiency band from a 0–100 score
function band(score) {
  if (score >= 85) return 'Expert';
  if (score >= 75) return 'Advanced';
  if (score >= 62) return 'Proficient';
  if (score >= 45) return 'Developing';
  return 'Emerging';
}

// Seeded pseudo-random (mulberry32) so charts are stable across renders.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A gently rising series from `from` to `to` over n points, with mild
// noise and a couple of plateaus so it reads like real progress.
function series(n, from, to, seed) {
  const r = rng(seed);
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    // ease-out so most growth is early-mid quarter
    const eased = 1 - Math.pow(1 - t, 1.8);
    const base = from + (to - from) * eased;
    const noise = (r() - 0.45) * (to - from) * 0.12;
    out.push(Math.max(0, Math.min(100, Math.round((base + noise) * 10) / 10)));
  }
  out[n - 1] = to; // land exactly on the current score
  return out;
}

const RANGES = {
  '6w':  { n: 6,  label: 'Last 6 weeks', axis: ['W1','W2','W3','W4','W5','W6'], bands: null },
  'q':   { n: 13, label: 'Last quarter', axis: ['Apr','','','','May','','','','Jun','','','','Now'],
           bands: [{ label: 'APR', from: 0, to: 4 }, { label: 'MAY', from: 4, to: 8 }, { label: 'JUN', from: 8, to: 13 }] },
  '12m': { n: 12, label: 'Last 12 months', axis: ['J','A','S','O','N','D','J','F','M','A','M','J'], bands: null },
};

// Per-level current scores + deltas (delta = change across the chosen range).
const SCORES = {
  me: {
    ai:   { score: 78, delta: +12, target: 85, start6: 74, startQ: 66, start12: 52 },
    ops:  { score: 71, delta: +8,  target: 80, start6: 68, startQ: 63, start12: 49 },
    team: { score: 64, delta: +15, target: 75, start6: 59, startQ: 49, start12: 38 },
    lead: { score: 58, delta: +6,  target: 70, start6: 55, startQ: 52, start12: 41 },
    comm: { score: 82, delta: +9,  target: 88, start6: 79, startQ: 73, start12: 61 },
  },
  team: {
    ai:   { score: 69, delta: +9,  target: 80, start6: 66, startQ: 60, start12: 47 },
    ops:  { score: 74, delta: +11, target: 82, start6: 70, startQ: 63, start12: 50 },
    team: { score: 71, delta: +13, target: 78, start6: 66, startQ: 58, start12: 44 },
    lead: { score: 62, delta: +7,  target: 72, start6: 59, startQ: 55, start12: 43 },
    comm: { score: 76, delta: +5,  target: 82, start6: 74, startQ: 71, start12: 60 },
  },
};

// KPI tiles per level
const KPIS = {
  me: [
    { key: 'gi',   label: 'Growth index',     value: 74, unit: '',     delta: +11, spark: [55,58,57,62,64,66,69,68,71,73,72,74,74] },
    { key: 'less', label: 'Lessons completed',value: 38, unit: '',     delta: +9,  spark: [4,8,11,15,18,20,24,27,29,32,34,36,38] },
    { key: 'ment', label: 'Mentor hours',     value: 12.5,unit: 'h',   delta: +3,  spark: [1,2,3,4,5,6,7,8,9,10,11,12,12.5] },
    { key: 'badg', label: 'Badges earned',    value: 7,  unit: '',     delta: +2,  spark: [3,3,4,4,4,5,5,6,6,6,7,7,7] },
  ],
  team: [
    { key: 'gi',   label: 'Team growth index',value: 67, unit: '',     delta: +8,  spark: [52,54,56,57,59,60,62,63,64,65,66,66,67] },
    { key: 'act',  label: 'Active learners',  value: 24, unit: '/28',  delta: +3,  spark: [18,19,20,20,21,22,22,23,23,24,24,24,24] },
    { key: 'ment', label: 'Mentor hours',     value: 96, unit: 'h',    delta: +18, spark: [40,46,52,58,63,68,74,79,84,88,91,94,96] },
    { key: 'badg', label: 'Badges earned',    value: 41, unit: '',     delta: +12, spark: [18,21,24,26,28,30,33,35,37,38,40,41,41] },
  ],
};

// Team-member breakdown (only meaningful in team view) for the bar chart.
const TEAM_MEMBERS = [
  { name: 'Marcus Beck',   initials: 'MB', gi: 81, trend: +6 },
  { name: 'Anjali Rao',    initials: 'AR', gi: 78, trend: +9 },
  { name: 'Priya N.',      initials: 'PN', gi: 74, trend: +11 },
  { name: 'Diego Fuentes', initials: 'DF', gi: 69, trend: +4 },
  { name: 'Sara Lindqvist',initials: 'SL', gi: 64, trend: +7 },
  { name: 'Tom Becker',    initials: 'TB', gi: 58, trend: +13 },
  { name: 'Wei Chen',      initials: 'WC', gi: 55, trend: +5 },
];

function getData(level = 'me', range = 'q') {
  const R = RANGES[range] || RANGES.q;
  const n = R.n;
  const startKey = range === '6w' ? 'start6' : range === '12m' ? 'start12' : 'startQ';

  const competencies = COMP_META.map((m, i) => {
    const s = SCORES[level][m.key];
    const data = series(n, s[startKey], s.score, 1000 + i * 7 + (level === 'team' ? 333 : 0));
    const delta = Math.round((s.score - s[startKey]) * 10) / 10;
    return {
      ...m,
      score: s.score,
      target: s.target,
      delta,
      level: band(s.score),
      data,
    };
  });

  // Overall growth index series = weighted mean of competencies per point.
  const giSeries = [];
  for (let i = 0; i < n; i++) {
    let sum = 0;
    competencies.forEach((c) => { sum += c.data[i]; });
    giSeries.push(Math.round((sum / competencies.length) * 10) / 10);
  }

  // Team-average overlay for the radar (in 'me' view we show "you vs team avg";
  // in 'team' view we show "team vs org avg").
  const compare = COMP_META.map((m) => {
    const other = level === 'me' ? SCORES.team[m.key].score : Math.round(SCORES.team[m.key].score * 0.92);
    return Math.max(0, Math.min(100, other));
  });

  // KPI 'gi' tile must agree with the headline growth index (giNow), which is
  // derived from the competency mean for the chosen level/range.
  const kpis = KPIS[level].map((k) => k.key === 'gi'
    ? { ...k, value: Math.round(giSeries[giSeries.length - 1]),
        delta: Math.round((giSeries[giSeries.length - 1] - giSeries[0]) * 10) / 10,
        spark: giSeries.map((v) => Math.round(v)) }
    : k);

  return {
    level,
    range: R,
    rangeKey: range,
    competencies,
    giSeries,
    giNow: Math.round(giSeries[giSeries.length - 1]),
    giStart: Math.round(giSeries[0]),
    compareValues: compare,
    compareLabel: level === 'me' ? 'Team avg' : 'Org avg',
    selfLabel: level === 'me' ? 'You' : 'Your team',
    kpis,
    members: TEAM_MEMBERS,
  };
}

window.DashData = { getData, COMP_META, band, RANGES };
