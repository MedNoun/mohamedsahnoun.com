/**
 * A matcher, not a parser. Normalise the input, then work out what the visitor
 * meant. Plain English has to work: "what did he build at OVHai" resolves, and
 * so does "how do you handle data quality".
 */

import type { Entry } from './dom';

export type Table = 'projects' | 'experience';

export type Intent =
  | { kind: 'projects' }
  | { kind: 'experience' }
  | { kind: 'about' }
  | { kind: 'contact' }
  | { kind: 'cv' }
  | { kind: 'lessons' }
  | { kind: 'everything' }
  | { kind: 'describe'; id: string }
  | { kind: 'filter'; table: Table; field: 'stack' | 'domain'; value: string }
  | { kind: 'aggregate'; table: Table; field: 'domain' | 'year' }
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

/**
 * The subjects this site actually owns. A domain-literate visitor asks about
 * these before they ask about a project by name, so answer them by name.
 * Longest phrase wins, which is why "entity resolution" beats "resolution".
 */
const topics: Record<string, string[]> = {
  'fashion-data-platform': [
    'data quality',
    'assertion',
    'testing',
    'identity resolution',
    'entity resolution',
    'deduplication',
    'dedup',
    'golden record',
    'dimensional model',
    'star schema',
    'kimball',
    'medallion',
    'warehouse',
    'lakehouse',
    'sql',
    'gcp',
    'google cloud',
    'infrastructure',
    'infra',
    'iac',
    'orchestration',
    'idempoten',
    'incremental',
    'partition',
    'scd',
    'slowly changing',
    'reverse etl',
    'etl',
    'elt',
    'pipeline',
  ],
  'ovhai-llm': [
    'microservice',
    'message queue',
    'queue',
    'messaging',
    'event driven',
    'event-driven',
    'architecture',
    'trade-off',
    'tradeoff',
    'docker',
    'ci/cd',
    'cicd',
    'on premise',
    'on-premise',
    'self hosted',
    'object storage',
    'error handling',
  ],
  'fellowship-ai': [
    'machine learning',
    'model',
    'transcription',
    'audio',
    'signal',
    'research',
    'paper',
    'f score',
    'baseline',
    'published',
    'publication',
  ],
  'nesty-kerberos': [
    'encryption',
    'crypto',
    'cryptography',
    'replay',
    'session key',
    'protocol',
    'hardening',
    'security review',
    'audit',
    'vulnerability',
    'secrets',
    'gcm',
    'pbkdf2',
    'key derivation',
  ],
  seedify: ['networking', 'binary protocol', 'udp', 'tcp', 'distributed'],
  yummy: ['desktop', 'sqlite', 'offline first', 'offline-first', 'electron'],
};

export const tables: Table[] = ['experience', 'projects'];

const commandVocabulary = [
  'select * from experience',
  'select * from projects',
  'select * from lessons',
  "select * from projects where stack contains 'python'",
  'select domain, count(*) from projects group by domain',
  'whoami',
  'contact',
  'resume',
];

/**
 * Three chips that a nav menu cannot express: a filter over each table, and an
 * aggregate. Each one is written against the table where it returns rows.
 */
export const filterChips = [
  {
    label: "projects · stack 'TypeScript'",
    query: "SELECT * FROM projects WHERE stack CONTAINS 'TypeScript';",
  },
  {
    label: "experience · stack 'Python'",
    query: "SELECT * FROM experience WHERE stack CONTAINS 'Python';",
  },
  {
    label: 'projects · GROUP BY domain',
    query: 'SELECT domain, COUNT(*) FROM projects GROUP BY domain;',
  },
];

export function completions(entries: Entry[]): string[] {
  return [
    ...tables,
    'lessons',
    ...entries.map((e) => e.id),
    'whoami',
    'contact',
    'resume',
    'where',
    'contains',
    'group',
  ];
}

/**
 * The completion for whatever token the caret sits on, or null. One function so
 * the ghost text the console paints and the value Tab inserts cannot disagree.
 *
 * The token is taken from the raw input, not from `normalise`, which rewrites
 * separators and collapses runs of spaces. Its output can be shorter than its
 * input, and splicing the raw string by a normalised length moved the splice
 * point: `SELECT * FROM  proj` (two spaces) used to eat a character on Tab.
 */
export function completionFor(
  raw: string,
  vocabulary: string[],
): { token: string; hit: string; tail: string } | null {
  const token = raw.split(/\s+/).pop() ?? '';
  // A single character prefixes most of the vocabulary, which is noise, not help.
  if (token.length < 2) return null;
  const needle = token.toLowerCase().replace(/_/g, '-');
  const hit = vocabulary.find((word) => word.startsWith(needle) && word !== needle);
  return hit ? { token, hit, tail: hit.slice(needle.length) } : null;
}

/** Apply a completion to the raw input, leaving everything before the token. */
export function applyCompletion(raw: string, vocabulary: string[]): string {
  const completion = completionFor(raw, vocabulary);
  if (!completion) return raw;
  return `${raw.slice(0, raw.length - completion.token.length)}${completion.hit}`;
}

export function normalise(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/;/g, ' ')
    .replace(/[_]/g, '-')
    // A trailing "?" is how people write questions and it breaks end-anchored
    // clause matching. Full stops stay: Node.js is a stack entry.
    .replace(/[?!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const has = (text: string, words: string[]) => words.some((w) => text.includes(w));

/** Which table a query is talking about. Experience is the default. */
function tableOf(text: string): Table {
  if (text.includes('project')) return 'projects';
  if (has(text, ['experience', 'work', 'job', 'role', 'career', 'employ'])) return 'experience';
  return 'experience';
}

function matchEntry(text: string, entries: Entry[]): string | null {
  let best: { id: string; score: number } | null = null;

  for (const entry of entries) {
    if (entry.kind !== 'project' && entry.kind !== 'experience') continue;

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

/** The subject match, checked only after no entry was named outright. */
function matchTopic(text: string): string | null {
  let best: { id: string; score: number } | null = null;

  for (const [id, phrases] of Object.entries(topics)) {
    for (const phrase of phrases) {
      if (!text.includes(phrase)) continue;
      if (!best || phrase.length > best.score) best = { id, score: phrase.length };
    }
  }

  return best?.id ?? null;
}

/** An explicit `WHERE stack CONTAINS 'python'`. Unambiguous, so it is trusted. */
function matchClause(text: string): { field: 'stack' | 'domain'; value: string } | null {
  const clause =
    /\b(stack|domain|tech|technology)\s*(?:contains|includes|like|=|==|:)\s*'?"?([a-z0-9+#./ -]+?)'?"?\s*$/;
  const hit = clause.exec(text);
  if (!hit) return null;
  return { field: hit[1] === 'domain' ? 'domain' : 'stack', value: hit[2].trim() };
}

/**
 * "projects in python", "what have you built with typescript". Only accepted
 * when the trailing word is a technology that actually appears in a stack,
 * otherwise "work in Paris" would filter for a language called Paris.
 */
function matchLooseFilter(text: string, entries: Entry[]): { value: string } | null {
  const loose = /\b(?:in|with|using|written in)\s+([a-z0-9+#.]+)\s*$/.exec(text);
  if (!loose) return null;

  const value = loose[1].trim();
  const known = entries.some((entry) =>
    entry.stack
      .toLowerCase()
      .split(', ')
      .some((item) => item === value || item.startsWith(value)),
  );

  return known ? { value } : null;
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
    ...entries
      .filter((e) => e.kind === 'project' || e.kind === 'experience')
      .map((e) => `describe ${e.id}`),
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

  if (!text) return { kind: 'experience' };

  if (has(text, ['\\h', 'help', 'commands', 'what can i'])) return { kind: 'everything' };
  if (has(text, ['everything', 'all of it', 'read it all', 'reader'])) return { kind: 'everything' };

  if (has(text, ['lesson', 'regret', 'mistake', 'differently', 'limitation', 'weakness', 'fault'])) {
    return { kind: 'lessons' };
  }

  if (has(text, ['cv', 'resume', 'résumé', 'download', 'pdf', '\\resume'])) return { kind: 'cv' };
  if (has(text, ['contact', 'email', 'hire', 'reach', 'get in touch', 'linkedin', '\\contact'])) {
    return { kind: 'contact' };
  }

  // COUNT and GROUP BY are unambiguous, so they are checked before anything fuzzy.
  if (has(text, ['count(', 'count (', 'group by', 'how many'])) {
    const field = text.includes('year') ? 'year' : 'domain';
    return { kind: 'aggregate', table: tableOf(text), field };
  }

  const clause = matchClause(text);
  if (clause) {
    return { kind: 'filter', table: tableOf(text), field: clause.field, value: clause.value };
  }

  // An entry named anywhere in the input wins: "what did he build at OVHai".
  const entryId = matchEntry(text, entries);
  const listing = has(text, [
    'from projects',
    'from experience',
    'list',
    'all projects',
    'all experience',
  ]);
  if (entryId && !listing) return { kind: 'describe', id: entryId };

  const loose = matchLooseFilter(text, entries);
  if (loose) {
    return { kind: 'filter', table: tableOf(text), field: 'stack', value: loose.value };
  }

  /*
   * Subjects are checked before the generic buckets, because "tell me about
   * identity resolution" is a question about the work, not a request for the
   * bio, and the word "about" would otherwise swallow it.
   */
  const topicId = matchTopic(text);
  if (topicId) return { kind: 'describe', id: topicId };

  if (has(text, ['who', 'about', 'name', 'bio', 'whoami', 'himself', 'yourself'])) {
    return { kind: 'about' };
  }
  if (has(text, ['work', 'job', 'experience', 'history', 'career', 'employ', 'role'])) {
    return { kind: 'experience' };
  }
  if (has(text, ['project', 'portfolio', 'built', 'build', 'made', 'repo', 'code'])) {
    return { kind: 'projects' };
  }

  // They asked for a technology that is not in any stack. Show them the shape
  // of a query that does return rows, instead of guessing at a project name.
  if (/\b(?:in|with|using|written in)\s+[a-z0-9+#.]+\s*$/.test(text)) {
    return { kind: 'unknown', suggestion: commandVocabulary[3] };
  }

  return { kind: 'unknown', suggestion: nearest(text, entries) };
}

/** The SQL a chip writes into the input before running. First person throughout. */
export const chips = [
  { label: 'Experience', query: 'SELECT * FROM experience;' },
  { label: 'Projects', query: 'SELECT * FROM projects;' },
  { label: 'Lessons', query: 'SELECT * FROM lessons;' },
  { label: 'About', query: 'SELECT * FROM about;' },
  { label: 'Contact', query: 'SELECT * FROM contact;' },
  { label: 'CV', query: '\\resume' },
];
