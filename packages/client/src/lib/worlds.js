/**
 * Subject → colour world mapping (docs/NEXT-GEN-PLAN.md SIG-2).
 *
 * Deterministic, never random: the same course must be the same colour on
 * every screen and every visit. Keyword rules run first so the seeded
 * categories land where a person would expect ("Health & Wellness" is green);
 * anything unrecognised gets a stable hash over the four non-default worlds
 * so a catalog of unknown categories still reads as a varied set.
 */
export const WORLDS = ['default', 'health', 'digital', 'life', 'money'];

const SLUG_RULES = [
  [/health|wellness|fitness|nutrition|medic|care|body/i, 'health'],
  [/digital|tech|computer|internet|phone|online|safety|device/i, 'digital'],
  [/life|learning|art|history|culture|society|hobby|creative/i, 'life'],
  [/money|finance|bank|pension|legal|budget|saving/i, 'money'],
];

function hashWorld(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  // Skip index 0 ("default") so hashed worlds are always coloured.
  return WORLDS[1 + (hash % (WORLDS.length - 1))];
}

export function worldFor({ categorySlug, categoryName, categoryId } = {}) {
  const text = `${categorySlug || ''} ${categoryName || ''}`.trim();
  if (text) {
    for (const [pattern, world] of SLUG_RULES) {
      if (pattern.test(text)) return world;
    }
  }
  if (categoryId) return hashWorld(categoryId);
  return 'default';
}

/** Human label for a world, for badges that must never rely on colour alone. */
export const WORLD_LABELS = {
  default: 'Course',
  health: 'Health',
  digital: 'Digital',
  life: 'Life',
  money: 'Money',
};
