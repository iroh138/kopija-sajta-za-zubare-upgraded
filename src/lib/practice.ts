import { z } from 'astro/zod';
import raw from '../data/practice.json';

/**
 * Single source of truth for name, address, phone, email and hours.
 * Header, footer, contact blocks and JSON-LD all read from here, so they cannot disagree.
 * Phone and coordinates are optional: when null, every call button and the schema field are omitted.
 */
const time = z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM');

const hour = z.union([
  z.object({ day: z.number().int().min(1).max(7), opens: time, closes: time, closed: z.literal(false).optional() }),
  z.object({ day: z.number().int().min(1).max(7), closed: z.literal(true) }),
]);

const special = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  opens: time.optional(),
  closes: time.optional(),
  closed: z.boolean().optional(),
  label: z.string(),
});

const PracticeSchema = z.object({
  name: z.string().min(1),
  legalName: z.string(),
  tagline: z.string(),
  specialty: z.string(),
  phone: z.object({ display: z.string(), e164: z.string().regex(/^\+\d{8,15}$/, 'E.164, e.g. +381111234567') }).nullable(),
  email: z.string().email(),
  address: z.object({
    street: z.string(),
    unit: z.string().optional(),
    city: z.string(),
    region: z.string(),
    postalCode: z.string(),
    country: z.string().length(2),
  }),
  geo: z.object({ lat: z.number(), lng: z.number() }).nullable(),
  mapsUrl: z.string().url(),
  mapEmbedQuery: z.string(),
  profileUrl: z.string(),
  social: z.array(z.object({ network: z.string(), url: z.string().url() })),
  bookingOnly: z.boolean(),
  acceptingNewPatients: z.boolean(),
  yearsActive: z.number().int().positive().optional(),
  freeConsultation: z.object({ offered: z.boolean(), note: z.string() }),
  hours: z.array(hour).length(7),
  specialDates: z.array(special),
  serviceAreas: z.array(z.string()),
  /** Locative used in headings and copy, e.g. "na Novom Beogradu". */
  locative: z.string(),
  /** Neighbourhood / block as patients and Google know it, e.g. "Blok 44". Empty = not shown. Must be confirmed by the client. */
  neighborhood: z.string().default(''),
  /** Verified directions (landmarks, transit, parking). Rendered on /kontakt only when non-empty. */
  directions: z.array(z.string()).default([]),
  insurers: z.array(z.object({ name: z.string(), accepted: z.boolean(), notes: z.string().optional() })),
  payments: z.array(z.object({ name: z.string(), description: z.string() })),
  paymentNote: z.string(),
  notOffered: z.array(z.object({ name: z.string(), note: z.string() })),
  reasons: z.array(z.object({ title: z.string(), body: z.string() })),
});

export type Practice = z.infer<typeof PracticeSchema>;
export const practice: Practice = PracticeSchema.parse(raw);

export const DAY_NAMES = ['Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota', 'Nedelja'];
export const DAY_NAMES_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** 24-hour format used in Serbia: "13:00". */
export function formatTime(t: string): string {
  return t;
}

export function hoursRows() {
  return practice.hours.map((h) => ({
    day: DAY_NAMES[h.day - 1],
    text: 'closed' in h && h.closed ? 'Ne radimo' : `${(h as any).opens} do ${(h as any).closes}`,
  }));
}

/** Special dates from `today` onward, soonest first. Computed at build time; rebuild to refresh. */
export function upcomingSpecialDates(today = new Date()) {
  const iso = today.toISOString().slice(0, 10);
  return practice.specialDates
    .filter((d) => d.date >= iso)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      ...d,
      pretty: new Date(`${d.date}T12:00:00`).toLocaleDateString('sr-Latn-RS', { weekday: 'long', day: 'numeric', month: 'long' }),
      text: d.closed ? 'Ne radimo' : `${d.opens} do ${d.closes}`,
    }));
}

export function addressLine(): string {
  const a = practice.address;
  return `${a.street}${a.unit ? `, ${a.unit}` : ''}, ${a.postalCode} ${a.city}`;
}

export function mapEmbedUrl(): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(practice.mapEmbedQuery)}&z=16&output=embed`;
}
