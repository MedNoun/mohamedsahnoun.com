import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { indexContent, reveal, scrollTo, type Entry } from './console/dom';
import { chips, completions, match, normalise } from './console/matcher';
import './console/console.css';

type Block =
  | { key: number; kind: 'echo'; text: string }
  | { key: number; kind: 'note'; text: string; lead?: string }
  | { key: number; kind: 'error'; text: string; suggestion: string }
  | {
      key: number;
      kind: 'result';
      heading: string;
      columns: string[];
      rows: { id: string; cells: string[] }[];
    }
  | {
      key: number;
      kind: 'links';
      heading: string;
      items: { label: string; text: string; href: string; download?: boolean }[];
    };

const AUTO_QUERY = 'SELECT * FROM projects;';
const VIEW_KEY = 'msd-view';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function Console() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<'console' | 'reader'>('console');
  const [narrow, setNarrow] = useState(false);
  const [inputOpen, setInputOpen] = useState(false);
  const [value, setValue] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const entries = useRef<Entry[]>([]);
  const inputEl = useRef<HTMLInputElement | null>(null);
  const outputEl = useRef<HTMLDivElement | null>(null);
  const blockKey = useRef(0);
  const typing = useRef<number | null>(null);

  const nextKey = () => ++blockKey.current;

  const byKind = useCallback(
    (kind: Entry['kind']) => entries.current.filter((entry) => entry.kind === kind),
    [],
  );

  const find = useCallback((id: string) => entries.current.find((entry) => entry.id === id), []);

  const show = useCallback((next: Block[]) => {
    setBlocks(next);
    requestAnimationFrame(() => {
      if (outputEl.current) outputEl.current.scrollTop = outputEl.current.scrollHeight;
    });
  }, []);

  /** Reader view: every entry visible, console collapsed to its chrome. */
  const applyView = useCallback(
    (next: 'console' | 'reader') => {
      setView(next);
      document.body.dataset.view = next;
      try {
        localStorage.setItem(VIEW_KEY, next);
      } catch {
        /* private mode, the view simply will not persist */
      }
      if (next === 'reader') reveal(entries.current, entries.current);
    },
    [],
  );

  const listBlock = useCallback(
    (kind: 'project' | 'experience'): Block => {
      // A result row is a summary. The full stack is in the case study.
      const shortStack = (stack: string) => {
        const items = stack.split(', ');
        return items.length > 3 ? `${items.slice(0, 3).join(', ')} +${items.length - 3}` : stack;
      };

      const rows = byKind(kind).map((entry) => ({
        id: entry.id,
        cells:
          kind === 'project'
            ? [entry.name, entry.domain, shortStack(entry.stack), entry.year]
            : [entry.role, entry.org, shortStack(entry.stack), entry.period],
      }));

      return {
        key: nextKey(),
        kind: 'result',
        heading: kind === 'project' ? 'projects' : 'experience',
        columns:
          kind === 'project'
            ? ['name', 'domain', 'stack', 'year']
            : ['role', 'organisation', 'stack', 'period'],
        rows,
      };
    },
    [byKind],
  );

  const run = useCallback(
    (raw: string) => {
      const intent = match(raw, entries.current);
      const echo: Block = { key: nextKey(), kind: 'echo', text: raw.trim() || AUTO_QUERY };
      const all = entries.current;

      if (view === 'reader' && intent.kind !== 'everything') applyView('console');

      switch (intent.kind) {
        case 'projects': {
          reveal([], all);
          show([
            echo,
            listBlock('project'),
            {
              key: nextKey(),
              kind: 'note',
              text: 'Select a row to read the full case study. Nothing here needs typing.',
            },
          ]);
          break;
        }

        case 'experience': {
          reveal([], all);
          show([
            echo,
            listBlock('experience'),
            {
              key: nextKey(),
              kind: 'note',
              text: 'Select a row to read the full case study.',
            },
          ]);
          break;
        }

        case 'describe': {
          const entry = find(intent.id);
          if (!entry) break;
          reveal([entry], all);
          show([
            echo,
            {
              key: nextKey(),
              kind: 'note',
              lead: entry.name,
              text: `${entry.hook} Full case study below.`,
            },
          ]);
          scrollTo(entry);
          break;
        }

        case 'about': {
          const entry = find('whoami');
          reveal(entry ? [entry] : [], all);
          show([echo, { key: nextKey(), kind: 'note', lead: 'whoami', text: 'Below the console.' }]);
          if (entry) scrollTo(entry);
          break;
        }

        case 'contact': {
          const entry = find('contact');
          reveal(entry ? [entry] : [], all);
          show([
            echo,
            {
              key: nextKey(),
              kind: 'links',
              heading: 'contact',
              items: [
                {
                  label: 'email',
                  text: 'mohammed.sahnounn@gmail.com',
                  href: 'mailto:mohammed.sahnounn@gmail.com',
                },
                {
                  label: 'linkedin',
                  text: 'in/mohamedsahnoun',
                  href: 'https://www.linkedin.com/in/mohamedsahnoun/',
                },
                { label: 'github', text: 'github.com/MedNoun', href: 'https://github.com/MedNoun' },
                {
                  label: 'cv',
                  text: 'mohamed-sahnoun-cv-en.pdf',
                  href: '/mohamed-sahnoun-cv-en.pdf',
                  download: true,
                },
              ],
            },
          ]);
          break;
        }

        case 'cv': {
          const entry = find('contact');
          reveal(entry ? [entry] : [], all);
          show([
            echo,
            {
              key: nextKey(),
              kind: 'links',
              heading: 'cv',
              items: [
                {
                  label: 'download',
                  text: 'mohamed-sahnoun-cv-en.pdf',
                  href: '/mohamed-sahnoun-cv-en.pdf',
                  download: true,
                },
                { label: 'plain text', text: 'the whole site as a document', href: '/plain/' },
              ],
            },
          ]);
          break;
        }

        case 'everything': {
          applyView('reader');
          show([
            echo,
            {
              key: nextKey(),
              kind: 'note',
              text: 'Reader view. Everything is below, in order. Switch back with the button above.',
            },
          ]);
          break;
        }

        case 'unknown': {
          reveal([], all);
          show([
            echo,
            {
              key: nextKey(),
              kind: 'error',
              text: 'I did not recognise that, but I probably know the answer.',
              suggestion: intent.suggestion,
            },
            listBlock('project'),
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
    [applyView, find, listBlock, show, view],
  );

  const submit = useCallback(
    (raw: string) => {
      run(raw);
      setValue('');
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
      window.clearInterval(typing.current);
      typing.current = null;
    }
  }, []);

  useEffect(() => {
    entries.current = indexContent();
    document.body.dataset.console = 'ready';

    const media = window.matchMedia('(max-width: 767px)');
    const onChange = (event: MediaQueryListEvent | MediaQueryList) => setNarrow(event.matches);
    onChange(media);
    media.addEventListener('change', onChange);

    let stored: string | null = null;
    try {
      stored = localStorage.getItem(VIEW_KEY);
    } catch {
      /* ignore */
    }

    setMounted(true);

    if (stored === 'reader') {
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
      // Never an empty prompt: type the first query, then run it.
      if (prefersReducedMotion()) {
        setValue(AUTO_QUERY);
        run(AUTO_QUERY);
      } else {
        let i = 0;
        typing.current = window.setInterval(() => {
          i += 1;
          setValue(AUTO_QUERY.slice(0, i));
          if (i >= AUTO_QUERY.length) {
            cancelTyping();
            window.setTimeout(() => submit(AUTO_QUERY), 160);
          }
        }, 20);
      }
    }

    return () => {
      media.removeEventListener('change', onChange);
      cancelTyping();
    };
    // Runs once: the DOM index and the opening query are mount-time concerns.
  }, []);

  const vocabulary = useMemo(() => completions(entries.current), [mounted]);

  const onKeyDown = (event: KeyboardEvent) => {
    cancelTyping();

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
          <span class="console-title">mohamedsahnoun.dev query console</span>
          <a class="console-btn" href="/plain/">Plain text version</a>
        </div>
        <div class="console-fallback">
          <a class="console-btn" href="#about">Who is this?</a>
          <a class="console-btn" href="#projects">Projects</a>
          <a class="console-btn" href="#experience">Work history</a>
          <a class="console-btn" href="#contact">Get in touch</a>
          <a class="console-btn" href="/mohamed-sahnoun-cv-en.pdf" download>Download CV</a>
        </div>
      </div>
    );
  }

  const showInput = !narrow || inputOpen;

  return (
    <div class="console">
      <div class="console-chrome">
        <span class="console-title">mohamedsahnoun.dev query console</span>
        <button
          type="button"
          class="console-btn"
          aria-pressed={view === 'reader'}
          onClick={() => (view === 'reader' ? applyView('console') : run('reader view'))}
        >
          Reader view
        </button>
        <a class="console-btn" href="/plain/">Plain text version</a>
      </div>

      <div class="console-body">
        {/* tabindex so the scrollable log is reachable by keyboard on its own */}
        <div
          class="console-output"
          ref={outputEl}
          tabIndex={0}
          role="log"
          aria-live="polite"
          aria-atomic="false"
        >
          {blocks.map((block) => {
            if (block.kind === 'echo') {
              return (
                <p class="block-echo" key={block.key}>
                  <span class="caret" aria-hidden="true">&gt;</span>
                  {block.text}
                </p>
              );
            }

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

            return (
              <div key={block.key}>
                <p class="result-heading">{block.heading}</p>
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
                <p class="result-count">
                  {block.rows.length} rows. Select one to open it.
                </p>
              </div>
            );
          })}
        </div>

        {showInput ? (
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
              placeholder="SELECT * FROM projects;"
              onInput={(event) => {
                cancelTyping();
                setValue(event.currentTarget.value);
              }}
              onKeyDown={onKeyDown}
            />
            <button type="button" class="console-run" onClick={() => submit(value)}>
              Run
            </button>
          </div>
        ) : (
          <button
            type="button"
            class="console-btn console-open-input"
            onClick={() => {
              setInputOpen(true);
              window.setTimeout(() => inputEl.current?.focus(), 0);
            }}
          >
            Type a query
          </button>
        )}

        <div class="chips">
          {chips.map((chip) => (
            <button type="button" class="chip" key={chip.label} onClick={() => runChip(chip.query)}>
              {chip.label}
            </button>
          ))}
        </div>

        {!narrow ? (
          <p class="console-hint">
            Up and down arrows walk your history. Tab completes table and project names. Plain English
            works too.
          </p>
        ) : null}
      </div>
    </div>
  );
}
