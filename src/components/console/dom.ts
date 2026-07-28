/**
 * The console owns no content. It indexes the markup Astro rendered at build
 * time, then reveals, filters and scrolls it. Everything here reads the DOM.
 */

export type EntryKind = 'project' | 'experience' | 'about' | 'contact' | 'lessons';

export interface Entry {
  kind: EntryKind;
  id: string;
  name: string;
  hook: string;
  lesson: string;
  domain: string;
  year: string;
  stack: string;
  role: string;
  org: string;
  period: string;
  repo: string;
  el: HTMLElement;
  group: HTMLElement | null;
}

const attr = (el: HTMLElement, key: string) => el.dataset[key] ?? '';

export function indexContent(): Entry[] {
  const nodes = document.querySelectorAll<HTMLElement>('#content [data-entry]');
  return Array.from(nodes).map((el) => ({
    kind: attr(el, 'entry') as EntryKind,
    id: attr(el, 'id'),
    name: attr(el, 'name'),
    hook: attr(el, 'hook'),
    lesson: attr(el, 'lesson'),
    domain: attr(el, 'domain'),
    year: attr(el, 'year'),
    stack: attr(el, 'stack'),
    role: attr(el, 'role'),
    org: attr(el, 'org'),
    period: attr(el, 'period'),
    repo: attr(el, 'repo'),
    el,
    group: el.classList.contains('entry-group') ? el : el.closest('.entry-group'),
  }));
}

/** Hide every entry, then reveal the ones passed in, and their group headings. */
export function reveal(entries: Entry[], all: Entry[]) {
  for (const entry of all) {
    entry.el.classList.remove('is-revealed');
    entry.group?.classList.remove('is-revealed');
  }
  for (const entry of entries) {
    entry.el.classList.add('is-revealed');
    entry.group?.classList.add('is-revealed');
  }
}

/**
 * Resolve a URL fragment to an entry. Matched on the element's own id, not the
 * data-id, because the "who is this" section is #about while its entry id is
 * whoami, and the fragment a visitor pastes is the one in the markup.
 */
export function entryByHash(hash: string, entries: Entry[]): Entry | undefined {
  const id = hash.replace('#', '');
  if (!id) return undefined;
  return entries.find((entry) => entry.el.id === id || entry.id === id);
}

/** An entry's own heading: the h3 inside an article, the h2 of a section. */
export function headingOf(entry: Entry): HTMLElement | null {
  return entry.el.querySelector<HTMLElement>('.entry-name, h2');
}

/** How many `#### ...` sections the revealed case study has, for the status line. */
export function sectionCount(entry: Entry): number {
  return entry.el.querySelectorAll('.prose > h4').length;
}

/**
 * Land the reader on the thing they asked for, and take keyboard focus with
 * them, so the console is not the only way back into the page.
 */
export function scrollTo(entry: Entry) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const heading = headingOf(entry) ?? entry.el;
  heading.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  // preventScroll: the scrollIntoView above already owns the scroll position.
  heading.focus({ preventScroll: true });
}
