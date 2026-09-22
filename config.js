// ============================================================
//  Spejz - konfiguráció
//  Ricsi projektje. Az anon/publishable kulcs nyilvános, mehet a GitHubra.
//  A service_role / secret kulcsot SOHA ne tedd ide.
// ============================================================

export const SUPABASE_URL = 'https://rtvapmvnnwnuxhzumxnb.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_KyB0nFd-0I7j41LYStcNwg_7wen1ODb';

// Kategóriák a gyors besoroláshoz
export const CATEGORIES = [
  'Zöldség, gyümölcs',
  'Pékáru',
  'Hús, hal',
  'Tejtermék',
  'Alapanyag',
  'Fagyasztott',
  'Ital',
  'Háztartás',
  'Egyéb'
];

export const LOCATIONS = ['Kamra', 'Hűtő', 'Fagyasztó', 'Egyéb'];
