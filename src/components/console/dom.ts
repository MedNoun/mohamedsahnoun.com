/**
 * The console owns no content. It indexes the markup Astro rendered at build
 * time, then reveals, filters and scrolls it. Everything here reads the DOM.
 */

export type EntryKind = 'project' | 'experience' | 'about' | 'contact';

export interface Entry {
  kind: EntryKind;
  id: string;
  name: string;
  hook: string;
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

export function scrollTo(entry: Entry) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  entry.el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}
