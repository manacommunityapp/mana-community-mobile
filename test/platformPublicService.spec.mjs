import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

function formatPublicCount(count) {
  if (typeof count !== 'number' || Number.isNaN(count) || count < 0) return '—';
  return count.toLocaleString('en-IN');
}

function normalizePublicOverview(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    totalResidents: typeof raw.totalResidents === 'number' ? raw.totalResidents : null,
    totalSocieties: typeof raw.totalSocieties === 'number' ? raw.totalSocieties : null,
    totalCities: typeof raw.totalCities === 'number' ? raw.totalCities : null,
    featuredSocieties: Array.isArray(raw.featuredSocieties)
      ? raw.featuredSocieties.filter((s) => s && s.name).map((s) => ({
          id: Number(s.id),
          name: String(s.name),
          city: s.city ? String(s.city) : undefined,
          residentCount: typeof s.residentCount === 'number' ? s.residentCount : null,
        }))
      : [],
    isLive: true,
  };
}

describe('Platform Public Overview formatting & normalization', () => {
  it('formats real counts accurately without fabricating placeholders', () => {
    assert.equal(formatPublicCount(null), '—');
    assert.equal(formatPublicCount(undefined), '—');
    assert.equal(formatPublicCount(-1), '—');
    assert.equal(formatPublicCount(0), '0');
    assert.equal(formatPublicCount(42), '42');
    assert.equal(formatPublicCount(1250), '1,250');
  });

  it('normalizes live database payload cleanly', () => {
    const out = normalizePublicOverview({
      totalResidents: 342,
      totalSocieties: 4,
      totalCities: 2,
      featuredSocieties: [{ id: 1, name: 'Mana Palms', city: 'Hyderabad', residentCount: 210 }],
    });
    assert.equal(out.totalResidents, 342);
    assert.equal(out.totalSocieties, 4);
    assert.equal(out.totalCities, 2);
    assert.equal(out.featuredSocieties.length, 1);
    assert.equal(out.featuredSocieties[0].name, 'Mana Palms');
  });
});
