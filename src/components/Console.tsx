import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  entryByHash,
  indexContent,
  reveal,
  scrollTo,
  sectionCount,
  type Entry,
} from './console/dom';
import { chips, completions, filterChips, match, normalise, type Table } from './console/matcher';
import { site } from '../data/site';
import './console/console.css';

/*
 * No echo block. The entry box keeps the query it ran, so repeating it here
 * would put the same text on screen twice and turn the console into a notebook
 * transcript. What is below the box is the answer, not a record of the asking.
 */
type Block =
  | { key: number; kind: 'note'; text: string; lead?: string }
  | { key: number; kind: 'error'; text: string; suggestion: string }
  | {
      key: number;
      kind: 'result';
      heading: string;
      columns: string[];
      rows: { id: string; cells: string[] }[];
      empty?: string;
    }
  | {
      key: number;
      kind: 'table';
      heading: string;
      columns: string[];
      rows: string[][];
    }
  | {
      key: number;
      kind: 'links';
      heading: string;
      items: { label: string; text: string; href: string; download?: boolean }[];
    };

const AUTO_QUERY = 'SELECT * FROM experience;';
const VIEW_KEY = 'msd-view';

/*
 * What the placeholder cycles through while the box is untouched. The default
 * comes first, because that is the query already showing its rows below. The
 * rest are one of each thing the matcher can do: another scan, a filter, an
 * aggregate, and a question in plain English to prove that also works.
 */
const DEMO_QUERIES = [
  AUTO_QUERY,
  'SELECT * FROM projects;',
  "SELECT * FROM projects WHERE stack CONTAINS 'Python';",
  'SELECT domain, COUNT(*) FROM projects GROUP BY domain;',
  'SELECT * FROM lessons;',
  'how do you handle data quality?',
];

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function Console() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<'console' | 'reader'>('console');
  const [narrow, setNarrow] = useState(false);
  const [value, setValue] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [status, setStatus] = useState('');
  const [placeholder, setPlaceholder] = useState(AUTO_QUERY);
  const [openTable, setOpenTable] = useState<Table | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const entries = useRef<Entry[]>([]);
  const inputEl = useRef<HTMLInputElement | null>(null);
  const outputEl = useRef<HTMLDivElement | null>(null);
  const blockKey = useRef(0);
  const typing = useRef<number | null>(null);
  // Our own hash writes must not be mistaken for the visitor pressing Back.
  const ownHash = useRef<string>('');

  const nextKey = () => ++blockKey.current;

  const byKind = useCallback(
    (kind: Entry['kind']) => entries.current.filter((entry) => entry.kind === kind),
    [],
  );

  const find = useCallback((id: string) => entries.current.find((entry) => entry.id === id), []);

  /**
   * Render, then settle. The scroll runs after the new blocks have laid out,
   * otherwise the console resizes underneath an in-flight smooth scroll and
   * the page lands mid-paragraph.
   */
  const show = useCallback(
    (next: Block[] | ((prev: Block[]) => Block[]), settle?: () => void) => {
      setBlocks(next);
      requestAnimationFrame(() => {
        // Top, not bottom: the panel is replaced each run, not appended to.
        if (outputEl.current) outputEl.current.scrollTop = 0;
        settle?.();
      });
    },
    [],
  );

  /** Keep the URL pointing at whatever is on screen, so it can be pasted. */
  const syncHash = useCallback((id: string | null) => {
    const next = id ? `#${id}` : window.location.pathname;
    ownHash.current = id ? `#${id}` : '';
    // window.history, not the query history held in state above.
    window.history.replaceState(null, '', next);
  }, []);

  /** Reader view: every entry visible, console collapsed to a single line. */
  const applyView = useCallback((next: 'console' | 'reader') => {
    setView(next);
    document.body.dataset.view = next;
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* private mode, the view simply will not persist */
    }
    if (next === 'reader') reveal(entries.current, entries.current);
  }, []);

  // A result row is a summary. The full stack is in the case study.
  const shortStack = (stack: string) => {
    const items = stack.split(', ');
    return items.length > 3 ? `${items.slice(0, 3).join(', ')} +${items.length - 3}` : stack;
  };

  const rowsFor = useCallback(
    (kind: 'project' | 'experience', pool?: Entry[]) =>
      (pool ?? byKind(kind)).map((entry) => ({
        id: entry.id,
        cells:
          kind === 'project'
            ? [entry.name, entry.domain, shortStack(entry.stack), entry.year]
            : [entry.role, entry.org, shortStack(entry.stack), entry.period],
      })),
    [byKind],
  );

  const listBlock = useCallback(
    (kind: 'project' | 'experience', pool?: Entry[], empty?: string): Block => ({
      key: nextKey(),
      kind: 'result',
      heading: kind === 'project' ? 'projects' : 'experience',
      columns:
        kind === 'project'
          ? ['name', 'domain', 'stack', 'year']
          : ['role', 'organisation', 'stack', 'period'],
      rows: rowsFor(kind, pool),
      empty,
    }),
    [rowsFor],
  );

  const run = useCallback(
    (raw: string) => {
      const intent = match(raw, entries.current);
      const all = entries.current;

      if (view === 'reader' && intent.kind !== 'everything') applyView('console');

      switch (intent.kind) {
        case 'experience':
        case 'projects': {
          const kind = intent.kind === 'projects' ? 'project' : 'experience';
          reveal([], all);
          setOpenTable(null);
          syncHash(null);
          setStatus(`${byKind(kind).length} rows.`);
          show([
            listBlock(kind),
            {
              key: nextKey(),
              kind: 'note',
              text: 'Select a row to read the full case study. Nothing here needs typing.',
            },
          ]);
          break;
        }

        case 'filter': {
          const kind = intent.table === 'projects' ? 'project' : 'experience';
          const needle = intent.value.toLowerCase();
          const pool = byKind(kind).filter((entry) =>
            (intent.field === 'stack' ? entry.stack : entry.domain).toLowerCase().includes(needle),
          );

          reveal([], all);
          setOpenTable(null);
          syncHash(null);
          setStatus(`${pool.length} of ${byKind(kind).length} rows match.`);
          show([
            listBlock(
              kind,
              pool,
              `No ${intent.table} match ${intent.field} '${intent.value}'. That is an honest zero, not a bug.`,
            ),
            {
              key: nextKey(),
              kind: 'note',
              text: `${pool.length} of ${byKind(kind).length} ${intent.table} match ${intent.field} '${intent.value}'.`,
            },
          ]);
          break;
        }

        case 'aggregate': {
          const kind = intent.table === 'projects' ? 'project' : 'experience';
          const counts = new Map<string, number>();
          for (const entry of byKind(kind)) {
            const key = intent.field === 'year' ? entry.year : entry.domain;
            counts.set(key, (counts.get(key) ?? 0) + 1);
          }
          const rows = [...counts.entries()]
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .map(([key, count]) => [key, String(count)]);

          reveal([], all);
          setOpenTable(null);
          syncHash(null);
          setStatus(`${rows.length} groups.`);
          show([
            {
              key: nextKey(),
              kind: 'table',
              heading: `${intent.field}, count(*)`,
              columns: [intent.field, 'count'],
              rows,
            },
          ]);
          break;
        }

        case 'lessons': {
          const entry = find('lessons');
          reveal(entry ? [entry] : [], all);
          setOpenTable(null);
          syncHash('lessons');
          setStatus(`Lessons table opened, ${byKind('project').length + byKind('experience').length} rows.`);
          show(
            [
              {
                key: nextKey(),
                kind: 'note',
                lead: 'lessons',
                text: 'Every entry on this page ends with its own faults. The table below is all of them at once.',
              },
            ],
            () => entry && scrollTo(entry),
          );
          break;
        }

        case 'describe': {
          const entry = find(intent.id);
          if (!entry) break;
          reveal([entry], all);
          setOpenTable(entry.kind === 'project' ? 'projects' : 'experience');
          syncHash(entry.id);
          setStatus(`${entry.name} opened, ${sectionCount(entry)} sections.`);
          // Keep the table you came from, so opening a row is not a dead end.
          show(
            (prev) => [
              ...prev.filter((block) => block.kind === 'result'),
              {
                key: nextKey(),
                kind: 'note',
                lead: entry.name,
                text: entry.hook,
              },
            ],
            () => scrollTo(entry),
          );
          break;
        }

        case 'about': {
          const entry = find('whoami');
          reveal(entry ? [entry] : [], all);
          setOpenTable(null);
          syncHash('about');
          setStatus('About opened.');
          show(
            [{ key: nextKey(), kind: 'note', lead: 'whoami', text: 'Below the console.' }],
            () => entry && scrollTo(entry),
          );
          break;
        }

        case 'contact': {
          const entry = find('contact');
          reveal(entry ? [entry] : [], all);
          setOpenTable(null);
          syncHash('contact');
          setStatus('Contact details listed.');
          show([
            {
              key: nextKey(),
              kind: 'links',
              heading: 'contact',
              items: [
                { label: 'email', text: site.email, href: `mailto:${site.email}` },
                { label: 'linkedin', text: 'in/mohamedsahnoun', href: site.links.linkedin },
                { label: 'github', text: 'github.com/MedNoun', href: site.links.github },
                { label: 'cv', text: site.cv.slice(1), href: site.cv, download: true },
              ],
            },
          ]);
          break;
        }

        case 'cv': {
          const entry = find('contact');
          reveal(entry ? [entry] : [], all);
          setOpenTable(null);
          syncHash('contact');
          setStatus('CV download listed.');
          show([
            {
              key: nextKey(),
              kind: 'links',
              heading: 'cv',
              items: [
                { label: 'download', text: site.cv.slice(1), href: site.cv, download: true },
              ],
            },
          ]);
          break;
        }

        case 'everything': {
          applyView('reader');
          setOpenTable(null);
          syncHash(null);
          setStatus('Reader view. Every entry is on the page.');
          show([
            {
              key: nextKey(),
              kind: 'note',
              text: 'Reader view. Everything is below, in order.',
            },
          ]);
          break;
        }

        case 'unknown': {
          reveal([], all);
          setOpenTable(null);
          syncHash(null);
          setStatus('No match.');
          show([
            {
              key: nextKey(),
              kind: 'error',
              text: 'I did not recognise that, but I probably know the answer.',
              suggestion: intent.suggestion,
            },
            listBlock('experience'),
          ]);
          break;
        }
      }

      const trimmed = raw.trim();
      if (trimmed) {
        setHistory((prev) => (prev[prev.length - 1] === trimmed ? prev : [...prev, trimmed]));
      }
      setHistoryIndex(-1);
    },
    [applyView, byKind, find, listBlock, show, syncHash, view],
  );

  /**
   * The box keeps what it ran. Clearing it threw away the only record of the
   * query, and a row click or a chip would leave an empty prompt above its own
   * result. `run` is the effect, `submit` is the effect plus owning the box.
   */
  const submit = useCallback(
    (raw: string) => {
      run(raw);
      setValue(raw.trim() || AUTO_QUERY);
    },
    [run],
  );

  const runChip = useCallback(
    (query: string) => {
      // The chip writes its SQL into the input, visibly, then runs it.
      setValue(query);
      window.setTimeout(() => submit(query), 180);
    },
    [submit],
  );

  const cancelTyping = useCallback(() => {
    if (typing.current !== null) {
      window.clearTimeout(typing.current);
      typing.current = null;
    }
  }, []);

  /**
   * The placeholder types a query, holds it, deletes it and moves to the next,
   * so an untouched box demonstrates its own grammar: a table scan, a filter, an
   * aggregate. It settles on the default the moment the visitor takes the box
   * over, because that is the query whose rows are already on screen.
   *
   * A chain of timeouts rather than an interval: the phases have different
   * durations, and an interval would need the slowest one for all of them.
   */
  const startRotating = useCallback(() => {
    // Begin by erasing the default, which is already on screen, rather than
    // cutting from the full string to a single character.
    let query = 0;
    let cut = AUTO_QUERY.length;
    let erasing = true;

    const step = () => {
      const text = DEMO_QUERIES[query];
      cut += erasing ? -1 : 1;
      setPlaceholder(text.slice(0, cut) || ' ');

      let wait = erasing ? 18 : 42;
      if (!erasing && cut >= text.length) {
        erasing = true;
        wait = 2200; // long enough to read the whole query
      } else if (erasing && cut <= 0) {
        erasing = false;
        query = (query + 1) % DEMO_QUERIES.length;
        wait = 320;
      }

      typing.current = window.setTimeout(step, wait);
    };

    typing.current = window.setTimeout(step, 900);
  }, []);

  /** Rotation is a hint, not a mode. Any real interest in the box ends it. */
  const settlePlaceholder = useCallback(() => {
    cancelTyping();
    setPlaceholder(AUTO_QUERY);
  }, [cancelTyping]);

  useEffect(() => {
    entries.current = indexContent();
    document.body.dataset.console = 'ready';

    const media = window.matchMedia('(max-width: 767px)');
    const onChange = (event: MediaQueryListEvent | MediaQueryList) => setNarrow(event.matches);
    onChange(media);
    media.addEventListener('change', onChange);

    // Someone was sent a link to one case study. Open that, not the front page.
    const linked = entryByHash(window.location.hash, entries.current);

    // Back and forward should move between entries, not just move the scrollbar.
    const onHashChange = () => {
      if (window.location.hash === ownHash.current) return;
      const target = entryByHash(window.location.hash, entries.current);
      if (target) run(`DESCRIBE ${target.id};`);
    };
    window.addEventListener('hashchange', onHashChange);

    let stored: string | null = null;
    try {
      stored = localStorage.getItem(VIEW_KEY);
    } catch {
      /* ignore */
    }

    setMounted(true);

    if (stored === 'reader' && !linked) {
      applyView('reader');
      setBlocks([
        {
          key: nextKey(),
          kind: 'note',
          text: 'Reader view, remembered from your last visit. Everything is below.',
        },
      ]);
    } else {
      document.body.dataset.view = 'console';
      if (linked) {
        // Someone was sent this link. Their query goes in the box, not a demo.
        setValue(`DESCRIBE ${linked.id};`);
        run(`DESCRIBE ${linked.id};`);
      } else {
        /*
         * The default query runs so the panel is never empty, but the box stays
         * empty so the rotating placeholder can show what else can go in it.
         * The box is the one thing on screen teaching the console's vocabulary,
         * and an empty box teaches nothing.
         */
        run(AUTO_QUERY);
        if (!prefersReducedMotion()) startRotating();
      }
    }

    return () => {
      media.removeEventListener('change', onChange);
      window.removeEventListener('hashchange', onHashChange);
      cancelTyping();
    };
    // Runs once: the DOM index and the opening query are mount-time concerns.
  }, []);

  const vocabulary = useMemo(() => completions(entries.current), [mounted]);

  const onKeyDown = (event: KeyboardEvent) => {
    settlePlaceholder();

    // Read the field itself: a keystroke can arrive before the state has settled.
    const field = event.currentTarget as HTMLInputElement;
    const live = field?.value ?? value;

    if (event.key === 'Enter') {
      event.preventDefault();
      submit(live);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!history.length) return;
      const next = historyIndex < 0 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(next);
      setValue(history[next]);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (historyIndex < 0) return;
      const next = historyIndex + 1;
      if (next >= history.length) {
        setHistoryIndex(-1);
        setValue('');
      } else {
        setHistoryIndex(next);
        setValue(history[next]);
      }
      return;
    }

    if (event.key === 'Tab') {
      const token = normalise(live).split(' ').pop() ?? '';
      if (!token) return;
      const hit = vocabulary.find((word) => word.startsWith(token) && word !== token);
      if (!hit) return;
      event.preventDefault();
      setValue(`${live.slice(0, live.length - token.length)}${hit}`);
    }
  };

  if (!mounted) {
    // Server-rendered shell. Real links, so it is never a dead control.
    return (
      <div class="console">
        <div class="console-chrome">
          <span class="console-title">{site.domain} query console</span>
        </div>
        <div class="console-fallback">
          <a class="console-btn" href="#experience">Experience</a>
          <a class="console-btn" href="#projects">Projects</a>
          <a class="console-btn" href="#lessons">Lessons</a>
          <a class="console-btn" href="#about">About</a>
          <a class="console-btn" href="#contact">Contact</a>
          <a class="console-btn" href={site.cv} download>CV</a>
        </div>
      </div>
    );
  }

  if (view === 'reader') {
    // Reader view asked for the page, not the console. Get out of the way.
    return (
      <div class="console is-collapsed">
        <div class="console-chrome">
          <span class="console-title">
            <span class="caret" aria-hidden="true">&gt;</span> reader view
          </span>
          <button type="button" class="console-btn" onClick={() => applyView('console')}>
            Restore console
          </button>
        </div>
      </div>
    );
  }

  return (
    <div class="console">
      <div class="console-chrome">
        <span class="console-title">{site.domain} query console</span>
        {openTable ? (
          <button
            type="button"
            class="console-btn"
            onClick={() => submit(`SELECT * FROM ${openTable};`)}
          >
            &#8592; all {openTable}
          </button>
        ) : null}
        <button type="button" class="console-btn" onClick={() => run('reader view')}>
          Reader view
        </button>
      </div>

      <div class="console-body">
        {/* The live region carries the status line only, never a case study. */}
        <p class="visually-hidden" role="status" aria-live="polite">{status}</p>

        {/*
          The box comes first and the answer sits under it. One box at every
          width: no narrow-screen swap for a "Type a query" button, because a
          button is not an editable box.
        */}
        <div class="console-prompt">
          <span class="console-caret" aria-hidden="true">&gt;</span>
          <label class="visually-hidden" for="console-input">
            Query this portfolio, in SQL or in plain English
          </label>
          <input
            id="console-input"
            class="console-input"
            ref={inputEl}
            type="text"
            value={value}
            autocomplete="off"
            autocapitalize="off"
            spellcheck={false}
            placeholder={placeholder}
            onFocus={settlePlaceholder}
            onInput={(event) => {
              settlePlaceholder();
              setValue(event.currentTarget.value);
            }}
            onKeyDown={onKeyDown}
          />
          <button type="button" class="console-run" onClick={() => submit(value)}>
            Run
          </button>
        </div>

        <div class="chips">
          {chips.map((chip) => (
            <button type="button" class="chip" key={chip.label} onClick={() => runChip(chip.query)}>
              {chip.label}
            </button>
          ))}
        </div>

        {/* Its own row: these are queries, not navigation, and the labels are long. */}
        <div class="chips-query">
          {filterChips.map((chip) => (
            <button
              type="button"
              class="chip is-filter"
              key={chip.label}
              onClick={() => runChip(chip.query)}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/*
          tabindex so the scrollable panel is reachable by keyboard on its own.
          Deliberately not a live region: role="log" would announce whole result
          tables. The status line above carries the announcement instead.
        */}
        <div class="console-output" ref={outputEl} tabIndex={0} aria-label="Query results">
          {blocks.map((block) => {
            if (block.kind === 'note') {
              return (
                <p class="block-note" key={block.key}>
                  {block.lead ? <strong>{block.lead}. </strong> : null}
                  {block.text}
                </p>
              );
            }

            if (block.kind === 'error') {
              return (
                <p class="block-error" key={block.key}>
                  {block.text} Did you mean{' '}
                  <button type="button" class="console-run" onClick={() => submit(block.suggestion)}>
                    {block.suggestion}
                  </button>
                  ? Or pick one of these:
                </p>
              );
            }

            if (block.kind === 'links') {
              return (
                <div key={block.key}>
                  <p class="result-heading">{block.heading}</p>
                  <ul class="link-list">
                    {block.items.map((item) => (
                      <li key={item.label}>
                        <span>{item.label}</span>
                        <a href={item.href} download={item.download} rel="noopener">
                          {item.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }

            if (block.kind === 'table') {
              return (
                <div key={block.key}>
                  <p class="result-heading">{block.heading}</p>
                  <ul class="result-rows">
                    {block.rows.map((row) => (
                      <li key={row[0]}>
                        <span class="result-row is-static">
                          <span class="cell-name">{row[0]}</span>
                          <span class="cell-count">{row[1]}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p class="result-count">{block.rows.length} groups.</p>
                </div>
              );
            }

            return (
              <div key={block.key}>
                <p class="result-heading">{block.heading}</p>
                {block.rows.length ? (
                  <>
                    <ul class="result-rows">
                      {block.rows.map((row) => (
                        <li key={row.id}>
                          <button
                            type="button"
                            class="result-row"
                            onClick={() => submit(`DESCRIBE ${row.id};`)}
                          >
                            {row.cells.map((cell, i) => (
                              <span key={i} class={i === 0 ? 'cell-name' : 'cell-muted'}>
                                {i === 0 ? null : (
                                  <span class="cell-label">{block.columns[i]}:</span>
                                )}
                                {cell}
                              </span>
                            ))}
                          </button>
                        </li>
                      ))}
                    </ul>
                    <p class="result-count">{block.rows.length} rows. Select one to open it.</p>
                  </>
                ) : (
                  <p class="result-count">{block.empty ?? '0 rows.'}</p>
                )}
              </div>
            );
          })}
        </div>

        {!narrow ? (
          <p class="console-hint">
            Up and down arrows walk your history. Tab completes table and project names. Filters and
            counts work: <code>WHERE stack CONTAINS 'Python'</code>, <code>GROUP BY domain</code>. So
            does plain English.
          </p>
        ) : null}
      </div>
    </div>
  );
}
