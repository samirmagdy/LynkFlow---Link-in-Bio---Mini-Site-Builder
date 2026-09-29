/**
 * pexelsThemeBackground.ts
 *
 * Maps theme categories to curated Pexels photo URLs.
 * All URLs use the `images.pexels.com` host, which is approved by
 * `isApprovedMediaSource` in themeEngine.ts.
 *
 * Each category entry provides:
 *  - `url`      : the full-resolution Pexels CDN URL
 *  - `overlay`  : recommended overlay opacity (0–1) to keep text readable
 *  - `position` : CSS background-position hint for the renderer
 */

export interface PexelsBackground {
  url: string;
  overlay: number;
  position: 'center' | 'top' | 'bottom';
}

/**
 * Curated library of Pexels backgrounds keyed by theme category.
 * Every image is landscape-oriented, ≥4 MP, and licensed under the
 * Pexels Free License (free to use, no attribution required in product).
 *
 * Categories are lowercase slugs that match the `category` field on
 * StandardTheme.  Add more entries as new categories are introduced.
 */
export const PEXELS_BACKGROUNDS: Record<string, PexelsBackground> = {
  // ── Studio / Creative ──────────────────────────────────────────────────────
  studio: {
    url: 'https://images.pexels.com/photos/3184431/pexels-photo-3184431.jpeg?auto=compress&cs=tinysrgb&w=1920',
    overlay: 0.52,
    position: 'center'
  },
  creative: {
    url: 'https://images.pexels.com/photos/1266808/pexels-photo-1266808.jpeg?auto=compress&cs=tinysrgb&w=1920',
    overlay: 0.48,
    position: 'center'
  },
  creator: {
    url: 'https://images.pexels.com/photos/3243090/pexels-photo-3243090.jpeg?auto=compress&cs=tinysrgb&w=1920',
    overlay: 0.45,
    position: 'center'
  },

  // ── Music / DJ ─────────────────────────────────────────────────────────────
  music: {
    url: 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=1920',
    overlay: 0.6,
    position: 'center'
  },
  dj: {
    url: 'https://images.pexels.com/photos/1916897/pexels-photo-1916897.jpeg?auto=compress&cs=tinysrgb&w=1920',
    overlay: 0.65,
    position: 'center'
  },

  // ── Fashion / Beauty ───────────────────────────────────────────────────────
  fashion: {
    url: 'https://images.pexels.com/photos/2220316/pexels-photo-2220316.jpeg?auto=compress&cs=tinysrgb&w=1920',
    overlay: 0.38,
    position: 'center'
  },
  beauty: {
    url: 'https://images.pexels.com/photos/3373745/pexels-photo-3373745.jpeg?auto=compress&cs=tinysrgb&w=1920',
    overlay: 0.35,
    position: 'center'
  },
  salon: {
    url: 'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg?auto=compress&cs=tinysrgb&w=1920',
    overlay: 0.4,
    position: 'center'
  },

  // ── Food / Bakery / Restaurant ─────────────────────────────────────────────
  food: {
    url: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1920',
    overlay: 0.4,
    position: 'center'
  },
  bakery: {
    url: 'https://images.pexels.com/photos/1855214/pexels-photo-1855214.jpeg?auto=compress&cs=tinysrgb&w=1920',
    overlay: 0.32,
    position: 'center'
  },
  restaurant: {
    url: 'https://images.pexels.com/photos/260922/pexels-photo-260922.jpeg?auto=compress&cs=tinysrgb&w=1920',
    overlay: 0.45,
    position: 'center'
  },

  // ── Fitness / Health ───────────────────────────────────────────────────────
  fitness: {
    url: 'https://images.pexels.com/photos/1552252/pexels-photo-1552252.jpeg?auto=compress&cs=tinysrgb&w=1920',
    overlay: 0.5,
    position: 'center'
  },
  health: {
    url: 'https://images.pexels.com/photos/3768916/pexels-photo-3768916.jpeg?auto=compress&cs=tinysrgb&w=1920',
    overlay: 0.42,
    position: 'center'
  },

  // ── Business / Finance ─────────────────────────────────────────────────────
  business: {
    url: 'https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg?auto=compress&cs=tinysrgb&w=1920',
    overlay: 0.55,
    position: 'center'
  },
  finance: {
    url: 'https://images.pexels.com/photos/210607/pexels-photo-210607.jpeg?auto=compress&cs=tinysrgb&w=1920',
    overlay: 0.6,
    position: 'center'
  },
  professional: {
    url: 'https://images.pexels.com/photos/3182759/pexels-photo-3182759.jpeg?auto=compress&cs=tinysrgb&w=1920',
    overlay: 0.5,
    position: 'center'
  },

  // ── Technology / App ───────────────────────────────────────────────────────
  technology: {
    url: 'https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg?auto=compress&cs=tinysrgb&w=1920',
    overlay: 0.6,
    position: 'center'
  },
  app: {
    url: 'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=1920',
    overlay: 0.55,
    position: 'center'
  },

  // ── Nature / Botanical ─────────────────────────────────────────────────────
  nature: {
    url: 'https://images.pexels.com/photos/1072179/pexels-photo-1072179.jpeg?auto=compress&cs=tinysrgb&w=1920',
    overlay: 0.45,
    position: 'center'
  },
  botanical: {
    url: 'https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg?auto=compress&cs=tinysrgb&w=1920',
    overlay: 0.5,
    position: 'center'
  },
  forest: {
    url: 'https://images.pexels.com/photos/15286/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=1920',
    overlay: 0.55,
    position: 'center'
  },

  // ── Travel / Photography ───────────────────────────────────────────────────
  travel: {
    url: 'https://images.pexels.com/photos/1591373/pexels-photo-1591373.jpeg?auto=compress&cs=tinysrgb&w=1920',
    overlay: 0.42,
    position: 'center'
  },
  photography: {
    url: 'https://images.pexels.com/photos/212372/pexels-photo-212372.jpeg?auto=compress&cs=tinysrgb&w=1920',
    overlay: 0.4,
    position: 'center'
  },

  // ── Editorial / Writing ────────────────────────────────────────────────────
  editorial: {
    url: 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=1920',
    overlay: 0.35,
    position: 'center'
  },
  writing: {
    url: 'https://images.pexels.com/photos/261763/pexels-photo-261763.jpeg?auto=compress&cs=tinysrgb&w=1920',
    overlay: 0.3,
    position: 'center'
  },
  podcast: {
    url: 'https://images.pexels.com/photos/3783471/pexels-photo-3783471.jpeg?auto=compress&cs=tinysrgb&w=1920',
    overlay: 0.55,
    position: 'center'
  },

  // ── Real Estate / Interior ─────────────────────────────────────────────────
  realestate: {
    url: 'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=1920',
    overlay: 0.42,
    position: 'center'
  },
  interior: {
    url: 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1920',
    overlay: 0.35,
    position: 'center'
  },

  // ── Art / Portfolio ────────────────────────────────────────────────────────
  art: {
    url: 'https://images.pexels.com/photos/1269968/pexels-photo-1269968.jpeg?auto=compress&cs=tinysrgb&w=1920',
    overlay: 0.42,
    position: 'center'
  },
  portfolio: {
    url: 'https://images.pexels.com/photos/3584994/pexels-photo-3584994.jpeg?auto=compress&cs=tinysrgb&w=1920',
    overlay: 0.45,
    position: 'center'
  },

  // ── Minimal / Neutral (fallback) ───────────────────────────────────────────
  minimal: {
    url: 'https://images.pexels.com/photos/1939485/pexels-photo-1939485.jpeg?auto=compress&cs=tinysrgb&w=1920',
    overlay: 0.25,
    position: 'center'
  },
  dark: {
    url: 'https://images.pexels.com/photos/1103970/pexels-photo-1103970.jpeg?auto=compress&cs=tinysrgb&w=1920',
    overlay: 0.65,
    position: 'center'
  }
};

/**
 * Returns the Pexels background that best matches a given category slug.
 * Tries an exact match first, then a fuzzy keyword match, then falls back to
 * a neutral dark image.
 */
export function getPexelsBackgroundForCategory(category: string): PexelsBackground {
  const slug = category.toLowerCase().trim().replace(/\s+/g, '-');

  // 1. Exact match
  if (PEXELS_BACKGROUNDS[slug]) return PEXELS_BACKGROUNDS[slug];

  // 2. Fuzzy keyword match
  const keywords = slug.split(/[-\s]+/);
  for (const keyword of keywords) {
    if (PEXELS_BACKGROUNDS[keyword]) return PEXELS_BACKGROUNDS[keyword];
  }

  // 3. Neutral fallback
  return PEXELS_BACKGROUNDS['minimal'];
}
