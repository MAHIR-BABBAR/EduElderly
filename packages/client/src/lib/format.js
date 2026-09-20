/**
 * Copy helpers. Raw model fields rendered as sentences ("Status: active",
 * "1 modules · 1 hours") were a big part of why the old UI read as a
 * bureaucratic template. Every count and date goes through here.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** "1 lesson", "3 lessons". Handles the common irregulars we actually use. */
export function plural(count, noun, pluralNoun) {
  const n = Number(count) || 0;
  const word = n === 1 ? noun : pluralNoun || defaultPlural(noun);
  return `${n} ${word}`;
}

const IRREGULAR = { quiz: 'quizzes' };

function defaultPlural(noun) {
  if (IRREGULAR[noun.toLowerCase()]) return IRREGULAR[noun.toLowerCase()];
  if (/(s|x|z|ch|sh)$/i.test(noun)) return `${noun}es`;
  if (/[^aeiou]y$/i.test(noun)) return `${noun.slice(0, -1)}ies`;
  return `${noun}s`;
}

/** "About 1 hour", "About 3 hours", "Under an hour". */
export function hours(estimated) {
  const n = Number(estimated) || 0;
  if (n <= 0) return 'Self-paced';
  if (n < 1) return 'Under an hour';
  const rounded = Math.round(n);
  return `About ${plural(rounded, 'hour')}`;
}

/** "Free" or a localised price. Amounts are in whole currency units. */
export function price(amount, currency = 'INR', locale = undefined) {
  const n = Number(amount) || 0;
  if (n <= 0) return 'Free';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

/** "today", "yesterday", "3 days ago", "on 4 March". */
export function relativeDay(date, now = new Date()) {
  if (!date) return '';
  const then = new Date(date);
  if (Number.isNaN(then.getTime())) return '';
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfThen = new Date(then.getFullYear(), then.getMonth(), then.getDate());
  const days = Math.round((startOfToday - startOfThen) / DAY_MS);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  const sameYear = then.getFullYear() === now.getFullYear();
  // Day-month order to match the product's British-English copy.
  return `on ${then.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' }),
  })}`;
}

/** "Good morning" / "Good afternoon" / "Good evening" / "Good night". */
export function greeting(hour = new Date().getHours()) {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
}

/** The part of day used by SkyBand's static gradient. */
export function daypart(hour = new Date().getHours()) {
  if (hour >= 5 && hour < 9) return 'dawn';
  if (hour >= 9 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

/** First name only, for greetings. */
export function firstName(fullName = '') {
  return String(fullName).trim().split(/\s+/)[0] || '';
}

/** "Lesson 2 of 5" style progress phrasing. */
export function ofTotal(done, total, noun) {
  return `${Number(done) || 0} of ${plural(total, noun)}`;
}
