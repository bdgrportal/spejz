// ============================================================
//  Spejz - Supabase kapcsolat és adatműveletek
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'spejz-auth' }
});

export const LS = {
  get hh() { return localStorage.getItem('spejz-hh') || null; },
  set hh(v) { v ? localStorage.setItem('spejz-hh', v) : localStorage.removeItem('spejz-hh'); },
  get name() { return localStorage.getItem('spejz-name') || ''; },
  set name(v) { localStorage.setItem('spejz-name', v || ''); },
  get code() { return localStorage.getItem('spejz-code') || ''; },
  set code(v) { localStorage.setItem('spejz-code', v || ''); }
};

/** Névtelen bejelentkezés: nincs regisztráció, nincs jelszó. */
export async function ensureSession() {
  const { data } = await sb.auth.getSession();
  if (data?.session) return data.session.user;
  const { data: anon, error } = await sb.auth.signInAnonymously();
  if (error) throw error;
  return anon.user;
}

export async function createHousehold(name, displayName) {
  const { data, error } = await sb.rpc('create_household', { p_name: name, p_display_name: displayName });
  if (error) throw error;
  return data;
}

export async function joinHousehold(code, displayName) {
  const { data, error } = await sb.rpc('join_household', { p_code: code, p_display_name: displayName });
  if (error) throw error;
  return data;
}

export async function myHouseholds() {
  const { data, error } = await sb
    .from('household_members')
    .select('household_id, display_name, role, households(id, name, invite_code)');
  if (error) throw error;
  return (data || []).filter(r => r.households);
}

export async function loadAll(hh) {
  const [stores, items, list, inv, trips, checks, members] = await Promise.all([
    sb.from('stores').select('*').eq('household_id', hh).eq('archived', false).order('sort_order'),
    sb.from('items').select('*').eq('household_id', hh).order('times_bought', { ascending: false }),
    sb.from('list_items').select('*').eq('household_id', hh).order('created_at'),
    sb.from('inventory').select('*').eq('household_id', hh).order('sort_order'),
    sb.from('trips').select('*').eq('household_id', hh).order('spent_at', { ascending: false }).limit(200),
    sb.from('checklist_items').select('*').eq('household_id', hh).order('sort_order'),
    sb.from('household_members').select('user_id, display_name, role').eq('household_id', hh)
  ]);
  const err = [stores, items, list, inv, trips, checks, members].find(r => r.error);
  if (err) throw err.error;
  return {
    stores: stores.data || [],
    items: items.data || [],
    list: list.data || [],
    inventory: inv.data || [],
    trips: trips.data || [],
    checklist: checks.data || [],
    members: members.data || []
  };
}

export const T = {
  insert: (table, row) => sb.from(table).insert(row).select().single(),
  update: (table, id, patch) => sb.from(table).update(patch).eq('id', id).select().single(),
  remove: (table, id) => sb.from(table).delete().eq('id', id)
};

export async function finishTrip(hh, storeId, amount, note, date) {
  const { data, error } = await sb.rpc('finish_trip', {
    p_household: hh, p_store: storeId, p_amount: amount, p_note: note || null, p_date: date
  });
  if (error) throw error;
  return data;
}
