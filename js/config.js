// ============================================================
//  Spejz - konfiguráció
//  Ide másold be a Supabase projekted adatait:
//  Supabase Dashboard > Project Settings > API
//  (Az anon key nyilvános kulcs, nyugodtan mehet a GitHubra.
//   A service_role kulcsot SOHA ne tedd ide.)
// ============================================================

export const SUPABASE_URL = 'https://IDE-A-PROJEKT-URL.supabase.co';
export const SUPABASE_ANON_KEY = 'IDE-AZ-ANON-PUBLIC-KULCS';

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
