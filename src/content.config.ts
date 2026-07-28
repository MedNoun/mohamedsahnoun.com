import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/projects' }),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    hook: z.string(),
    /** The headline numbers, as the skim layer above the prose. */
    result: z.string(),
    /** One line compressing this entry's "what I would do differently". */
    lesson: z.string(),
    domain: z.string(),
    year: z.string(),
    stack: z.array(z.string()),
    repo: z.url(),
    order: z.number(),
  }),
});

const experience = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/experience' }),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    role: z.string(),
    org: z.string(),
    period: z.string(),
    hook: z.string(),
    result: z.string(),
    lesson: z.string(),
    domain: z.string(),
    year: z.string(),
    stack: z.array(z.string()),
    link: z.url().optional(),
    order: z.number(),
  }),
});

export const collections = { projects, experience };
