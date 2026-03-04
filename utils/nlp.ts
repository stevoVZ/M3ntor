const AREA_WORD_MAP: Array<{ area: string; words: string[] }> = [
  { area: 'health', words: ['run','gym','workout','exercise','sleep','eat','diet','water','yoga','stretch','fitness','doctor','dentist','vitamin','weight','meal','nutrition','walk','swim','cycle','jog','lift','protein','steps','health','medicine','physio','training','marathon','sport','crossfit','hike'] },
  { area: 'finance', words: ['save','budget','invest','money','bank','pay','debt','loan','tax','insurance','salary','expense','bill','super','mortgage','credit','income','financial','savings','portfolio','shares','fund','rent','spending','afford'] },
  { area: 'career', words: ['work','job','resume','cv','meeting','email','project','boss','client','deadline','presentation','promotion','interview','career','business','office','linkedin','network','skill','hire','freelance','contract','startup','pitch'] },
  { area: 'home', words: ['clean','fix','repair','paint','garden','furniture','kitchen','bathroom','garage','lawn','organise','organize','declutter','renovate','build','decor','tidy','mow','plant','shed','house','room','shelf','storage','move'] },
  { area: 'relationships', words: ['call','text','visit','dinner','friend','family','partner','date','birthday','anniversary','mum','dad','kids','catch up','wedding','social','coffee','meet','reconnect','relationship','parents','siblings','couple'] },
  { area: 'growth', words: ['read','book','course','study','learn','practice','skill','certificate','degree','lesson','class','podcast','tutorial','chapter','language','spanish','french','mandarin','code','program','write','research','exam'] },
  { area: 'fun', words: ['travel','trip','holiday','game','movie','sport','concert','hobby','photography','music','art','cook','bake','play','explore','adventure','hike','surf','festival','escape','cinema','theatre','create'] },
  { area: 'creativity', words: ['meditate','journal','reflect','gratitude','prayer','mindful','breathe','calm','peace','spiritual','clarity','intention','ritual','stillness','draw','sketch','compose','sculpt','craft','pottery','knit','sew'] },
];

export function suggestArea(text: string): string | null {
  const words = text.toLowerCase().split(/\s+/);
  const scores: Record<string, number> = {};

  for (const { area, words: keywords } of AREA_WORD_MAP) {
    let count = 0;
    for (const kw of keywords) {
      if (kw.includes(' ')) {
        if (text.toLowerCase().includes(kw)) count += 2;
      } else {
        if (words.some(w => w === kw)) count++;
      }
    }
    if (count > 0) scores[area] = count;
  }

  let best: string | null = null;
  let bestScore = 0;
  for (const [area, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      best = area;
    }
  }
  return best;
}

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
