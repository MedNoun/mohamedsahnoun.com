/**
 * A matcher, not a parser. Normalise the input, then work out what the visitor
 * meant. Plain English has to work: "what did he build at OVHai" resolves.
 */

import type { Entry } from './dom';

export type Intent =
  | { kind: 'projects' }
  | { kind: 'experience' }
  | { kind: 'about' }
  | { kind: 'contact' }
  | { kind: 'cv' }
  | { kind: 'everything' }
  | { kind: 'describe'; id: string }
  | { kind: 'unknown'; suggestion: string };

/** Extra words a visitor might reasonably use for an entry, beyond its metadata. */
const aliases: Record<string, string[]> = {
  'edgedb-dto': ['edgedb', 'dto', 'pypi', 'codegen', 'code generation', 'pydantic', 'library'],
  seedify: ['bittorrent', 'torrent', 'peer to peer', 'p2p', 'bep 15', 'swarm'],
  'nesty-kerberos': ['kerberos', 'nesty', 'auth', 'authentication', 'ticket', 'kdc', 'security'],
  yummy: ['pos', 'point of sale', 'till', 'restaurant', 'electron', 'offline'],
  'fashion-data-platform': [
    'fashion',
    'lakehouse',
    'bigquery',
    'dataform',
    'mdm',
    'master data',
    'union find',
    'terraform',
    'current',
  ],
  'ovhai-llm': ['ovhai', 'ovh', 'llm', 'paris', 'internship', 'intern', 'translation', 'nmt'],
  'fellowship-ai': ['fellowship', 'piano', 'music', 'ml', 'machine learning', 'launchpad', 'f-score'],
};

export const tables = ['projects', 'experience'];

const commandVocabulary = [
  'select * from projects',
  'select * from experience',
  'whoami',
  'contact',
  'resume',
];

export function completions(entries: Entry[]): string[] {
  return [...tables, ...entries.map((e) => e.id), 'whoami', 'contact', 'resume'];
}

export function normalise(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/;/g, ' ')
    .replace(/[_]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

const has = (text: string, words: string[]) => words.some((w) => text.includes(w));

function matchEntry(text: string, entries: Entry[]): string | null {
  let best: { id: string; score: number } | null = null;

  for (const entry of entries) {
    if (entry.kind === 'about' || entry.kind === 'contact') continue;

    const candidates = [
      entry.id,
      entry.id.replace(/-/g, ' '),
      entry.name.toLowerCase(),
      entry.org.toLowerCase(),
      ...(aliases[entry.id] ?? []),
    ].filter(Boolean);

    for (const candidate of candidates) {
      if (candidate.length < 3) continue;
      if (text.includes(candidate)) {
        const score = candidate.length;
        if (!best || score > best.score) best = { id: entry.id, score };
      }
    }
  }

  return best?.id ?? null;
}

export function distance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  let previous = Array.from({ length: cols }, (_, i) => i);

  for (let i = 1; i < rows; i++) {
    const current = [i];
    for (let j = 1; j < cols; j++) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }

  return previous[cols - 1];
}

export function nearest(input: string, entries: Entry[]): string {
  const pool = [
    ...commandVocabulary,
    ...entries.filter((e) => e.kind === 'project' || e.kind === 'experience').map((e) => `describe ${e.id}`),
  ];

  let best = pool[0];
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of pool) {
    const score = distance(input.slice(0, 40), candidate);
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best;
}

export function match(raw: string, entries: Entry[]): Intent {
  const text = normalise(raw);

  if (!text) return { kind: 'projects' };

  if (has(text, ['\\h', 'help', 'commands', 'what can i'])) return { kind: 'everything' };
  if (has(text, ['everything', 'all of it', 'read it all', 'reader'])) return { kind: 'everything' };

  if (has(text, ['cv', 'resume', 'résumé', 'download', 'pdf', '\\resume'])) return { kind: 'cv' };
  if (has(text, ['contact', 'email', 'hire', 'reach', 'get in touch', 'linkedin', '\\contact'])) {
    return { kind: 'contact' };
  }

  // An entry named anywhere in the input wins: "what did he build at OVHai".
  const entryId = matchEntry(text, entries);
  const listing = has(text, ['from projects', 'from experience', 'list', 'all projects', 'all experience']);
  // A WHERE clause is a filter, not a listing: "... WHERE company = 'OVHai LLM'".
  const filtered = has(text, ['where', '=']);
  if (entryId && (!listing || filtered)) return { kind: 'describe', id: entryId };

  if (has(text, ['who', 'about', 'name', 'bio', 'whoami', 'himself'])) return { kind: 'about' };
  if (has(text, ['work', 'job', 'experience', 'history', 'career', 'employ', 'role'])) {
    return { kind: 'experience' };
  }
  if (has(text, ['project', 'portfolio', 'built', 'build', 'made', 'repo', 'code'])) {
    return { kind: 'projects' };
  }

  return { kind: 'unknown', suggestion: nearest(text, entries) };
}

/** The SQL a chip writes into the input before running. */
export const chips = [
  { label: 'Who is this?', query: 'SELECT * FROM about;' },
  { label: 'Show me his projects', query: 'SELECT * FROM projects;' },
  { label: 'Work history', query: 'SELECT * FROM experience;' },
  { label: 'Get in touch', query: 'SELECT * FROM contact;' },
  { label: 'Download CV', query: '\\resume' },
];
