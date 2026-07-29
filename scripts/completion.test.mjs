/*
 * The completion is fiddly enough to be worth pinning: it slices the raw input by
 * a token length, and getting that wrong silently eats characters. Imports the
 * same functions Console.tsx uses, so a passing test means the console agrees.
 *
 *   node scripts/completion.test.mjs
 *
 * Node strips the TypeScript types on import, so there is no build step.
 */
import assert from 'node:assert/strict';
import { applyCompletion, completionFor, completions } from '../src/components/console/matcher.ts';

// The shape indexContent() produces, reduced to what completions() reads.
const entries = [
  { kind: 'project', id: 'edgedb-dto' },
  { kind: 'project', id: 'seedify' },
  { kind: 'project', id: 'nesty-kerberos' },
  { kind: 'project', id: 'yummy' },
  { kind: 'experience', id: 'fashion-data-platform' },
  { kind: 'experience', id: 'ovhai-llm' },
  { kind: 'experience', id: 'fellowship-ai' },
];
const vocab = completions(entries);

const cases = [
  // [input, expected ghost tail, expected value after Tab]
  ['SELECT * FROM proj', 'ects', 'SELECT * FROM projects'],
  ['SELECT * FROM exp', 'erience', 'SELECT * FROM experience'],
  // Two spaces before the token: normalise() collapses them, so slicing by a
  // normalised length used to splice one character early.
  ['SELECT * FROM  proj', 'ects', 'SELECT * FROM  projects'],
  ['DESCRIBE edge', 'db-dto', 'DESCRIBE edgedb-dto'],
  // Underscores are how people type these ids; the vocabulary uses hyphens.
  ['DESCRIBE nesty_ker', 'beros', 'DESCRIBE nesty-kerberos'],
  ['less', 'ons', 'lessons'],
  ['who', 'ami', 'whoami'],
  // One character prefixes half the vocabulary, so it suggests nothing.
  ['p', null, 'p'],
  // Already complete: nothing to add, and Tab must not mangle it.
  ['SELECT * FROM projects', null, 'SELECT * FROM projects'],
  ['zzz', null, 'zzz'],
  ['', null, ''],
];

let failed = 0;
for (const [input, tail, accepted] of cases) {
  const got = completionFor(input, vocab);
  const gotTail = got?.tail ?? null;
  const gotAccepted = applyCompletion(input, vocab);
  try {
    assert.equal(gotTail, tail, `tail for ${JSON.stringify(input)}`);
    assert.equal(gotAccepted, accepted, `accept for ${JSON.stringify(input)}`);
    console.log(`ok    ${JSON.stringify(input)}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL  ${error.message}\n      got tail=${JSON.stringify(gotTail)} accept=${JSON.stringify(gotAccepted)}`);
  }
}

// Accepting a suggestion must be idempotent: the result has nothing left to add.
for (const [input] of cases) {
  const once = applyCompletion(input, vocab);
  const twice = applyCompletion(once, vocab);
  if (once !== twice) {
    failed += 1;
    console.error(`FAIL  not idempotent: ${JSON.stringify(input)} -> ${JSON.stringify(once)} -> ${JSON.stringify(twice)}`);
  }
}

console.log(failed ? `\n${failed} failed` : `\n${cases.length} cases pass, accept is idempotent`);
process.exit(failed ? 1 : 0);
