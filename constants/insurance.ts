import type { InsuranceCategory, CatalogueItem, PolicyView } from '@/types/insurance';

/**
 * Insurance Hub feature flag. Default OFF. The hub is only reachable when explicitly enabled AND the user
 * holds the VIEW_INSURANCE permission. (Client gating is UX only; the backend enforces access.)
 */
export const INSURANCE_ENABLED = process.env.EXPO_PUBLIC_INSURANCE_ENABLED === 'true';

export const INSURANCE_NOTICE_VERSION = 'v1';

export interface CategoryMeta {
  key: InsuranceCategory;
  label: string;
  icon: string;
  group: 'HEALTH' | 'LIFE' | 'MOTOR' | 'HOME' | 'TRAVEL' | 'OTHER';
}

export const CATEGORIES: CategoryMeta[] = [
  { key: 'HEALTH',            label: 'Health insurance',               icon: 'medkit-outline',     group: 'HEALTH' },
  { key: 'FAMILY_FLOATER',    label: 'Family floater',                 icon: 'people-outline',     group: 'HEALTH' },
  { key: 'PARENTS',           label: "Parents' insurance",             icon: 'heart-outline',      group: 'HEALTH' },
  { key: 'LIFE_TERM',         label: 'Life & term insurance',          icon: 'shield-outline',     group: 'LIFE' },
  { key: 'MOTOR_CAR',         label: 'Car insurance',                  icon: 'car-outline',        group: 'MOTOR' },
  { key: 'MOTOR_TWO_WHEELER', label: 'Two-wheeler insurance',          icon: 'bicycle-outline',    group: 'MOTOR' },
  { key: 'HOME',              label: 'Home & property',                icon: 'home-outline',       group: 'HOME' },
  { key: 'TRAVEL',            label: 'Travel insurance',               icon: 'airplane-outline',   group: 'TRAVEL' },
  { key: 'PERSONAL_ACCIDENT', label: 'Personal accident & other',      icon: 'bandage-outline',    group: 'OTHER' },
];

export function categoryLabel(c: InsuranceCategory): string {
  return CATEGORIES.find((x) => x.key === c)?.label ?? c;
}

/** Route param type (kebab) <-> category enum. */
export function categoryFromParam(p?: string): InsuranceCategory | undefined {
  return CATEGORIES.find((c) => c.key === (p ?? '').toUpperCase())?.key;
}

// ───────────────────────── masking ─────────────────────────

export function maskPolicyNumber(value?: string | null): string {
  if (!value) return '—';
  const clean = value.replace(/[^A-Za-z0-9]/g, '');
  if (clean.length <= 4) return 'XXXX';
  return 'XXXXXX' + clean.slice(-4);
}

// ───────────────────────── ids / expiry ─────────────────────────

/** Idempotency key for a single submit attempt of a form; reused on retry of the SAME review screen. */
export function newIdempotencyKey(now = Date.now(), rand = Math.random): string {
  return `q-${now.toString(36)}-${Math.floor(rand() * 1e9).toString(36)}`;
}

export function isExpired(validUntilIso: string, now: Date = new Date()): boolean {
  const t = Date.parse(validUntilIso);
  return Number.isNaN(t) || t <= now.getTime();
}

export function daysUntil(dateIso?: string | null, now: Date = new Date()): number | null {
  if (!dateIso) return null;
  const t = Date.parse(dateIso);
  if (Number.isNaN(t)) return null;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((t - startOfToday) / 86_400_000);
}

export type RenewalBucket = 'OVERDUE' | 'DUE_30' | 'DUE_60' | 'LATER' | 'UNKNOWN';

/**
 * Bucket derived from the stored expiry DATE only. This is a reminder aid; it is never evidence
 * that coverage is (or is not) active.
 */
export function renewalBucket(p: Pick<PolicyView, 'expiryDate'>, now: Date = new Date()): RenewalBucket {
  const d = daysUntil(p.expiryDate, now);
  if (d === null) return 'UNKNOWN';
  if (d < 0) return 'OVERDUE';
  if (d <= 30) return 'DUE_30';
  if (d <= 60) return 'DUE_60';
  return 'LATER';
}

// ───────────────────────── redirects ─────────────────────────

/** Defence in depth against open redirects: https only, no credentials, host must match the partner host. */
export function isSafeHandoffUrl(url: string, allowedHost: string): boolean {
  try {
    if (!url || url.length > 2000 || /[\u0000-\u001f\\]/.test(url)) return false;
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    if (u.username || u.password) return false;
    return u.hostname.toLowerCase() === allowedHost.toLowerCase();
  } catch {
    return false;
  }
}

// ───────────────────────── comparison ─────────────────────────

export type SortKey = 'NAME' | 'INSURER';

/** Neutral ordering only. There is deliberately no "best"/"recommended"/"cheapest" sort here. */
export function sortCatalogue(items: CatalogueItem[], key: SortKey): CatalogueItem[] {
  const copy = [...items];
  copy.sort((a, b) =>
    key === 'INSURER'
      ? a.insurerName.localeCompare(b.insurerName) || a.name.localeCompare(b.name)
      : a.name.localeCompare(b.name));
  return copy;
}

export interface ComparisonRow {
  label: string;
  values: string[];
  differs: boolean;
}

function parseJson(s?: string | null): any {
  if (!s) return undefined;
  try { return JSON.parse(s); } catch { return s; }
}

function show(v: unknown): string {
  if (v === undefined || v === null || v === '') return 'Not provided';
  if (Array.isArray(v)) return v.length ? v.map(String).join(', ') : 'Not provided';
  if (typeof v === 'object') return Object.entries(v as object).map(([k, x]) => `${k}: ${String(x)}`).join('; ');
  return String(v);
}

/** Builds side-by-side rows, flagging rows whose values differ. Missing data is stated, never guessed. */
export function buildComparison(items: CatalogueItem[]): ComparisonRow[] {
  const spec: Array<[string, (i: CatalogueItem) => unknown]> = [
    ['Insurer', (i) => i.insurerName],
    ['IRDAI registration', (i) => i.irdaiRegistrationNo],
    ['Product version', (i) => `v${i.versionNo}`],
    ['Eligibility', (i) => parseJson(i.eligibilityJson)],
    ['Coverage & sum insured', (i) => parseJson(i.coverageJson)],
    ['Benefits', (i) => parseJson(i.benefitsJson)],
    ['Waiting periods', (i) => parseJson(i.waitingPeriodsJson)],
    ['Exclusions, sub-limits, co-pay', (i) => parseJson(i.exclusionsJson)],
    ['Network & servicing', (i) => parseJson(i.networkJson)],
    ['Policy wording', (i) => i.policyWordingUrl],
    ['Data verified on', (i) => i.verifiedAt],
  ];
  return spec.map(([label, get]) => {
    const values = items.map((i) => show(get(i)));
    return { label, values, differs: new Set(values).size > 1 };
  });
}

/** Plain-text summary for sharing / printing. Includes disclosures. */
export function buildPrintableSummary(items: CatalogueItem[]): string {
  const rows = buildComparison(items);
  const head = `Mana Insurance - product comparison (${new Date().toLocaleDateString('en-IN')})`;
  const names = items.map((i) => `${i.name} (${i.insurerName})`).join(' | ');
  const body = rows.map((r) => `${r.label}: ${r.values.join(' | ')}`).join('\n');
  const disclosures = items
    .map((i) => [i.partnerDisclosure, i.commercialDisclosure].filter(Boolean).join(' '))
    .filter(Boolean)
    .join('\n');
  return [head, names, body, disclosures && `Disclosures:\n${disclosures}`,
    'This summary is informational. Premiums and cover depend on the insurer\'s underwriting and policy wording.']
    .filter(Boolean).join('\n\n');
}

// ───────────────────────── quote form validation (client mirror of server) ─────────────────────────

export type FieldErrors = Record<string, string>;

const PIN = /^[1-9][0-9]{5}$/;
const REG = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/;

export function normaliseRegNo(v: string): string {
  return v.replace(/[\s-]/g, '').toUpperCase();
}

export function validateQuoteFields(
  category: InsuranceCategory,
  f: Record<string, unknown>,
  today: Date = new Date(),
): FieldErrors {
  const e: FieldErrors = {};
  const int = (v: unknown, min: number, max: number) =>
    typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
  const pin = () => { if (!PIN.test(String(f.pincode ?? ''))) e.pincode = 'Enter a valid 6-digit pincode'; };

  switch (category) {
    case 'HEALTH': case 'FAMILY_FLOATER': case 'PARENTS': {
      pin();
      const ages = f.memberAges;
      if (!Array.isArray(ages) || ages.length < 1 || ages.length > 12) e.memberAges = 'Provide 1 to 12 member ages';
      else if (!ages.every((a) => int(a, 0, 100))) e.memberAges = 'Each age must be 0 to 100';
      else if (category === 'PARENTS' && ages.some((a) => (a as number) < 18)) e.memberAges = "Parents' cover is for adults";
      break;
    }
    case 'LIFE_TERM':
      if (!int(f.age, 18, 65)) e.age = 'Age must be 18 to 65';
      if (!(typeof f.annualIncome === 'number' && f.annualIncome > 0)) e.annualIncome = 'Enter a positive income';
      if (typeof f.smoker !== 'boolean') e.smoker = 'Select yes or no';
      break;
    case 'MOTOR_CAR': case 'MOTOR_TWO_WHEELER':
      if (!REG.test(normaliseRegNo(String(f.registrationNumber ?? '')))) e.registrationNumber = 'Enter a valid registration number';
      pin();
      break;
    case 'HOME':
      pin();
      if (!String(f.propertyType ?? '').trim()) e.propertyType = 'Select a property type';
      if (!(typeof f.sumInsuredWanted === 'number' && f.sumInsuredWanted > 0)) e.sumInsuredWanted = 'Enter a positive amount';
      break;
    case 'TRAVEL': {
      if (!String(f.destination ?? '').trim()) e.destination = 'Enter a destination';
      const s = Date.parse(String(f.startDate ?? '')), en = Date.parse(String(f.endDate ?? ''));
      const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      if (Number.isNaN(s)) e.startDate = 'Enter a valid start date (YYYY-MM-DD)';
      else if (s < t0) e.startDate = 'Start date cannot be in the past';
      if (Number.isNaN(en)) e.endDate = 'Enter a valid end date (YYYY-MM-DD)';
      else if (!Number.isNaN(s) && en < s) e.endDate = 'End date must be on or after start date';
      else if (!Number.isNaN(s) && (en - s) / 86_400_000 > 365) e.endDate = 'Trip cannot exceed 365 days';
      if (!int(f.travellers, 1, 10)) e.travellers = 'Travellers must be 1 to 10';
      break;
    }
    case 'PERSONAL_ACCIDENT':
      if (!int(f.age, 18, 70)) e.age = 'Age must be 18 to 70';
      break;
    default:
      e.category = 'Quotes are not available for this category';
  }
  return e;
}
