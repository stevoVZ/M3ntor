// ─────────────────────────────────────────────────────────
// NLP helpers — ported directly from prototype
// ─────────────────────────────────────────────────────────

const AREA_WORD_MAP: Array<{ area: string; words: string[] }> = [
  { area: 'health',        words: ['run','gym','workout','exercise','sleep','eat','diet','water','yoga','stretch','fitness','doctor','dentist','vitamin','weight','meal','nutrition','walk','swim','cycle','jog','lift','protein','steps','health','medicine','physio','training','marathon','sport','crossfit','hike'] },
  { area: 'finance',       words: ['save','budget','invest','money','bank','pay','debt','loan','tax','insurance','salary','expense','bill','super','mortgage','credit','income','financial','savings','portfolio','shares','fund','rent','spending','afford'] },
  { area: 'career',        words: ['work','job','resume','cv','meeting','email','project','boss','client','deadline','presentation','promotion','interview','career','business','office','linkedin','network','skill','hire','freelance','contract','startup','pitch'] },
  { area: 'home',          words: ['clean','fix','repair','paint','garden','furniture','kitchen','bathroom','garage','lawn','organise','organize','declutter','renovate','build','decor','tidy','mow','plant','shed','house','room','shelf','storage','move'] },
  { area: 'relationships', words: ['call','text','visit','dinner','friend','family','partner','date','birthday','anniversary','mum','dad','kids','catch up','wedding','social','coffee','meet','reconnect','relationship','parents','siblings','couple'] },
  { area: 'learning',      words: ['read','book','course','study','learn','practice','skill','certificate','degree','lesson','class','podcast','tutorial','chapter','language','spanish','french','mandarin','code','program','write','research','exam'] },
  { area: 'fun',           words: ['travel','trip','holiday','game','movie','sport','concert','hobby','photography','music','art','cook','bake','play','explore','adventure','hike','surf','festival','escape','cinema','theatre','create'] },
  { area: 'spirituality',  words: ['meditate','journal','reflect','gratitude','prayer','mindful','breathe','calm','peace','spiritual','clarity','intention','ritual','morning routine','evening routine','stillness'] },
];

export function suggestArea(text: string): string | null {
  const t = text.toLowerCase();
  for (const { area, words } of AREA_WORD_MAP) {
    if (words.some(w => t.includes(w))) return area;
  }
  return null;
}

// ─────────────────────────────────────────────────────────
// Type inference from free text (NLP)
// ─────────────────────────────────────────────────────────
export type InferredType = 'action' | 'habit' | 'goal' | 'project';

export function inferType(text: string): InferredType {
  const t = text.toLowerCase();
  if (!t.trim()) return 'action';
  if (/(every|daily|each|morning|evening|weekly|routine|habit|practice|meditat|exercise|workout|journal|stretch)/i.test(t))
    return 'habit';
  if (/(want to|someday|dream|hope|goal|achieve|by \d{4}|one day|life|financial freedom)/i.test(t))
    return 'goal';
  if (/(project|plan|build|launch|renovate|prepare|organis|organize|campaign|website)/i.test(t))
    return 'project';
  return 'action';
}
