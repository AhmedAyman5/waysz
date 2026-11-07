/**
 * Content collections. One JSON file per service in src/content/services/<slug>.json.
 * The file name is the slug: family-law.json → /services/family-law/ and /en/services/family-law/
 * Shape = the Service Details Template (brief §3): name, description, audience, offer, steps,
 * excludes, faq, cta — in BOTH languages.
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const localized = z.object({
  name: z.string(),
  summary: z.string(),                       // short text for the service card (Services page)
  description: z.string(),
  audience: z.array(z.string()),
  offer: z.array(z.string()),
  steps: z.array(z.object({ title: z.string(), text: z.string() })),
  excludes: z.array(z.string()),
  faq: z.array(z.object({ q: z.string(), a: z.string() })),
  cta: z.object({ title: z.string(), text: z.string(), button: z.string() }),
});

const services = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/services' }),
  schema: z.object({
    area: z.enum(['legal', 'travel', 'events', 'software']),
    order: z.number(),
    proposed: z.boolean().default(false),    // «مقترح» in the brief = pending client approval
    ar: localized,
    en: localized,
  }),
});

export const collections = { services };
