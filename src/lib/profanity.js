// Common substitutions used to evade filters
function normalise(text) {
  return text
    .toLowerCase()
    .replace(/[@4]/g, 'a')
    .replace(/[3]/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[$5]/g, 's')
    .replace(/[7]/g, 't')
    .replace(/[+]/g, 't')
    .replace(/\s+/g, ' ');
}

// Word list — checked against normalised input
const WORDS = [
  'fuck', 'fuk', 'fck', 'fucks', 'fucking', 'fuking', 'fucked', 'fucker', 'fuckers', 'fuckwit',
  'shit', 'shits', 'shitting', 'shitty', 'shat',
  'cunt', 'cunts', 'cunting',
  'ass', 'arse', 'arsehole', 'asshole', 'assholes', 'arseholes',
  'bitch', 'bitches', 'bitching',
  'bastard', 'bastards',
  'dick', 'dicks', 'dickhead', 'dickheads',
  'cock', 'cocks', 'cockhead',
  'piss', 'pissed', 'pissing',
  'wank', 'wanker', 'wankers', 'wanking',
  'slut', 'sluts',
  'whore', 'whores',
  'nigger', 'niggers', 'nigga',
  'faggot', 'faggots', 'fag',
  'retard', 'retards', 'retarded',
  'prick', 'pricks',
  'twat', 'twats',
  'porn', 'porno',
  'rape', 'raped', 'rapist',
  'nazi', 'nazis',
];

const PATTERNS = WORDS.map((w) => new RegExp(`\\b${w}\\b`, 'i'));

export function containsProfanity(text) {
  if (!text) return false;
  const norm = normalise(text);
  return PATTERNS.some((p) => p.test(norm) || p.test(text.toLowerCase()));
}

export function censorText(text) {
  if (!text) return text;
  let out = text;
  for (const word of WORDS) {
    const re = new RegExp(`\\b${word}\\b`, 'gi');
    out = out.replace(re, (m) => m[0] + '*'.repeat(m.length - 1));
  }
  return out;
}
