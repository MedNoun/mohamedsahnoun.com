# mohamedsahnoun.dev

Portfolio for Mohamed Sahnoun, data engineer. The interface is a query console: visitors type or click SQL-ish commands against a career.

## The one architectural rule

The console owns no content. Every case study is rendered into the HTML at build time as semantic, crawlable markup, and the console reveals, filters and scrolls what is already in the DOM. It never fetches or generates anything.

Which means the test that matters is: **disable JavaScript and the page still shows the name, every case study in full, and working links.** `/plain/` serves the identical content as an ordinary document, with no console at all.

## Structure

```text
src/
├── content/
│   ├── projects/      4 MDX case studies
│   └── experience/    3 MDX case studies
├── content.config.ts  collection schemas, glob loader
├── components/
│   ├── SiteContent.astro   renders both collections as <article> with data attributes
│   ├── Console.tsx         the Preact island, hydrated client:idle
│   └── console/
│       ├── dom.ts          indexes and reveals the static markup
│       ├── matcher.ts      a matcher, not a parser
│       └── console.css
├── layouts/Base.astro      head, JSON-LD Person, skip link
├── pages/index.astro       console over the content
├── pages/plain.astro       the same content, no console
└── styles/global.css       design tokens
```

`src/data/site.ts` holds the name, tagline, bio and links used by the masthead, the meta tags and the console's contact result.

## Commands

| Command | Action |
| :-- | :-- |
| `npm run dev` | Dev server on `localhost:4321` (use `npx astro dev --background` to keep it running) |
| `npm run build` | Build to `./dist/` |
| `npm run preview` | Preview the build |
| `npx astro check` | Type check |

## Content rules

`AGENTS.md` (symlinked as `CLAUDE.md`) carries the full brief, the content inventory, the design tokens and the hard rules. The short version:

- Every number traces to a verified write-up in `content-source/`, which is gitignored because it names the client.
- The fashion client, the consultancy and their source systems are never named. "A US fashion house (via a consultancy)", "nine source systems spanning commerce, ERP, marketing automation and planning".
- No em-dashes. British English.
