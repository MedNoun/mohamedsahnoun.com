# mohamedsahnoun.com

## Brief

Mohamed Sahnoun is a data engineer. This site is his portfolio.

The audience is hiring managers and senior data engineers. They will spend two to five minutes here and open exactly one project. The site must answer "is this person good" in the first fifteen seconds.

The interface is a query console: visitors type or click SQL-ish commands against a career. The console is the memorable surface, not the content store. Every case study is rendered into the HTML at build time as real, semantic, crawlable markup. The console reveals, filters and scrolls content that is already in the DOM. It never fetches or generates content.

The test: with JavaScript disabled the page still shows the name, every case study in full, and working links. If it does not, the build is wrong.

## Source of truth

`content-source/` holds verified write-ups of real work, checked against git history and source repositories. It is the only source of truth and it is gitignored, because it names the client and their systems.

Never invent a project, a metric, a technology or a date that is not in those files.

## Hard rules

- No em-dashes anywhere. Use commas, colons, parentheses or full stops.
- No invented metrics. Every number traces to `content-source/`.
- No "passionate about", "strategic thinker", "results-driven", "leverage", "seamless".
- British English.

## Content inventory

### Experience

**`fashion-data-platform`** Data Platform Engineer, Marc Jacobs (via Olivesoft). Jan 2025 to present, remote.
- Hook: two production GCP repositories that turn nine fragmented source systems into one customer view.
- Hard problem: expressing graph connectivity in set-based SQL. A deterministic master data management engine implementing Union-Find connected components in pure GoogleSQL via iterative CTEs, blocking candidate pairs on name plus phone and name plus email.
- Verified metrics: 83 SQLX models, ~6,577 lines of GoogleSQL, 694 of 841 commits (~83%), 540-line JavaScript macro library, 7M+ customer records resolved, 22 models with assertions, 18 with QUALIFY dedup, 106 distinct DAG tags, nine source systems, 124 Terraform files and ~4,997 lines, 11 dataset modules, 25 JSON schemas, 9 batch ingestion flows, 21 IAM bindings, 3 environments.
- Stack: BigQuery, Dataform, GoogleSQL, JavaScript, Terraform, GCS, Pub/Sub, Dataflow, Cloud Workflows, Cloud Build, Datadog, Azure DevOps.
- Anonymisation: "nine source systems spanning commerce, ERP, marketing automation and planning". Never the product names.

**`ovhai-llm`** Data Engineer Intern, OVHai LLM, Paris. Feb 2024 to Jul 2024, six months, on site.
- Hook: rebuilt the platform that prepares training corpora for neural machine translation models serving regulated financial institutions.
- Hard problem: choosing an architecture on evidence. A documented trade-off analysis of monolith against microservices and event-driven against message-driven, settling on message-driven because the workflow is an ordered pipeline carrying substantial payloads, not fire-and-forget notification.
- Verified metrics: 4 microservices built, 6 library modules refactored, 6 logging severity levels, thesis defended 25 September 2024 at INSAT.
- Stack: Python, Poetry, ActiveMQ, STOMP, MinIO, EdgeDB, EdgeQL, Docker, GitLab CI, Sockeye, COMET.
- Spin-off: `edgedb-dto`, published to PyPI.

**`fellowship-ai`** Machine Learning Engineer, Fellowship.ai (Launchpad.ai). Apr 2022 to Jul 2022.
- Hook: a published method for scoring student piano performances that beats a published baseline.
- Hard problem: expressive rubato makes a human performance diverge constantly from a synthesised reference, so naive audio comparison cannot separate artistry from error. The task was reframed as evaluation against the composer's symbolic intent.
- Verified metrics: 95.8% note-classification F-score against Benetos et al. 92.9% and Wang et al. 98.0%; onset F-score 94.7% against 79.4% for onset plus offset; HMM alignment 99.2% to 99.8% accuracy; three-person team; article published 4 October 2022.
- Stack: Python, librosa, music21, pretty_midi, pandas, Flask, React Native.
- Voice: team voice ("we"), co-authorship, not an inflated solo claim.

### Projects, strongest first

**`edgedb-dto`** order 1. `gitlab.com/linguacustodia/edgedb-dto`. 2024. Developer tooling.
- Hook: code generation that gives EdgeDB object composition back, without becoming an ORM.
- Hard problem: rewriting `uuid.UUID` to `DTO | uuid.UUID`. One line of configuration, and the entire reason composition works.
- Verified metrics: MIT, 1,000+ PyPI downloads, 72 of 75 attributed commits (96%), ~651 lines across 6 modules, 3 tags, 2 releases, flake8 with 7 plugins across 3 pre-commit stages, 2 worked examples.
- Stack: Python 3.11+, Pydantic, Jinja2, ast, importlib, inspect, Poetry, GitLab CI.
- What I would do differently: the N+1 pattern, and no test suite.

**`seedify`** order 2. `github.com/MedNoun/seedify`. 2023. Distributed systems.
- Hook: BitTorrent from the bytes up, including BEP 15 UDP packed by hand.
- Hard problem: two incompatible tracker transports behind one interface, and a 98-byte announce payload written at fixed byte offsets with transaction IDs echoed and verified.
- Verified metrics: ~1,841 lines across 22 files, 30 commits, Feb to Jun 2023, endgame at 20 outstanding pieces, top-four unchoke every 30s, max 30 peer connections.
- Stack: TypeScript, Node.js, bencode, bitset, dgram, net.
- Team: two engineers, pair-programmed over screen share, commits landed under whoever was driving.
- What I would do differently: bandwidth throttling written but commented out, `handleLeecher` stubbed so inbound seeding does not complete, no test suite.

**`nesty-kerberos`** order 3. `github.com/MedNoun/Nesty-kerberos`. Built 2023, hardened 2026. Security.
- Hook: the Kerberos three-legged ticket flow implemented properly, then audited and hardened three years later.
- Hard problem: an interceptor that decrypts the ticket-granting ticket under the TGS long-term key, recovers the session key from inside it, and uses that to decrypt the client's authenticator, so the server proves the client holds a key it never transmitted.
- Second hard problem: auditing my own 2023 build as an attacker would. It did not run (six blockers), returned the plaintext next to the ciphertext, used unauthenticated AES-256-CBC with the algorithm read off the wire, used the password itself as a key, measured skew against the ticket rather than the server clock, and had a replay cache that caught no replays while locking principals out for hours.
- Verified metrics: PR #164 merged 29 July 2026, 78 files, +3,705 / -881, ~1,835 lines of application source across two NestJS applications, ~1,780 lines of tests, 128 tests passing (38 and 20 kdc, 48 and 22 service) where none could previously run, 14 of 15 commits, PBKDF2-HMAC-SHA256 at 600,000 iterations, 96-bit GCM IV, 2 realms, 120s authenticator skew against the server clock, 2h to 10h lifetime clamp, 256-bit session keys, MODP groups 15 to 18, secrets purged from all 13 commits of history.
- Stack: NestJS, TypeScript, Redis, PostgreSQL, TypeORM, Docker Compose, Jest, AES-256-GCM, PBKDF2, HKDF, SHA-256, gitleaks.
- What I would do differently: registration is unauthenticated and its Diffie-Hellman exchange has no server authentication, the principal key is stored as-is in Postgres, no authorisation once a client is authenticated, and no cross-realm referrals, renewal, forwarding, PKINIT or migrations.
- Full audit write-up: `/home/mednoun/nesty-kerberos-hardening-report.md` (outside the repo, generated from the merged diff).

**`yummy`** order 4. `github.com/MedNoun/yummy`. 2022 to 2023. Desktop and offline-first.
- Hook: a till that keeps taking orders when the internet drops.
- Hard problem: the renderer never touches Node. SQLite lives in the Electron main process behind a context bridge, and admin login falls back to a cached JWT with client-side expiry checking so it degrades instead of failing.
- Verified metrics: ~2,050 lines, 30 of 30 commits, 5 entities, 10 records per page, Dec 2022 to Apr 2023.
- Stack: Electron, Angular 13, TypeScript, SASS, TypeORM, SQLite, bcrypt.
- What I would do differently: the preload bridge exposes generic channels rather than an allowlist, printing and stats are empty classes, `admin.guard.ts` returns true unconditionally, sync is modelled not built, `synchronize: true` in production.

### Contact

- Email `mohammed.sahnounn@gmail.com`
- LinkedIn `linkedin.com/in/mohamedsahnoun`
- GitHub `github.com/MedNoun`
- GitLab `gitlab.com/linguacustodia/edgedb-dto`
- CV `/mohamed-sahnoun-cv-en.pdf`

## Design tokens

Exact values. No placeholders, no new colours.

```css
--bg:      #0B0E14;
--surface: #131722;
--border:  #232936;
--text:    #E6E9EF;
--muted:   #9BA6B8;
--accent:  #7FD1B9;
--link:    #7AA2F7;

--mono:  ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, Consolas, monospace;
--prose: "Iowan Old Style", Charter, Georgia, "Times New Roman", serif;

--t--1: 0.8125rem;  --t-0: 1rem;      --t-1: 1.125rem;
--t-2:  1.375rem;   --t-3: 1.75rem;   --t-4: 2.25rem;
--t--2: 0.875rem;

--space: 0.25rem;   /* every gap is a multiple */
--radius: 0.25rem;
--measure: 68ch;    /* max measure for prose */
```

Monospace for the console. The serif stack for long-form case study prose. No web fonts and no external requests of any kind: system stacks only, which is also the cheapest route to the performance target.

## Architecture

- `src/content.config.ts` defines the `projects` and `experience` collections with the glob loader.
- `src/pages/index.astro` renders every entry as an `<article>` with real headings at build time.
- `src/pages/plain.astro` renders the identical content as an ordinary document with no console.
- `src/components/Console.tsx` is a Preact island hydrated `client:idle`. It receives no content as props. It queries the DOM.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
