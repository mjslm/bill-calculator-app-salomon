// js/supabase-client.js
// Helper wrappers for auth and CRUD operations against Supabase.
// Depends on `window.supabaseClient` being initialized by `js/supabase-config.js`.

async function checkAuth() {
  if (!window.supabaseClient) return null;
  try {
    const { data: { session }, error } = await window.supabaseClient.auth.getSession();
    if (error) {
      console.error('checkAuth error:', error);
      return null;
    }
    return session || null;
  } catch (e) {
    console.error('checkAuth exception:', e);
    return null;
  }
}

async function getCurrentUser() {
  if (!window.supabaseClient) return null;
  try {
    const { data: { user }, error } = await window.supabaseClient.auth.getUser();
    if (error) {
      console.error('getCurrentUser error:', error);
      return null;
    }
    return user || null;
  } catch (e) {
    console.error('getCurrentUser exception:', e);
    return null;
  }
}

async function signOut() {
  if (!window.supabaseClient) return false;
  try {
    const { error } = await window.supabaseClient.auth.signOut();
    if (error) {
      console.error('signOut error:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('signOut exception:', e);
    return false;
  }
}

async function saveCalculationToSupabase(record) {
  // record: { month, kwh, rate, breakdown: {...}, total }
  // Maps to Supabase schema: { user_id, month, power_consumption, cost_per_kwh, result, created_at }
  if (!window.supabaseClient) return { success: false, error: 'no-client' };
  const user = await getCurrentUser();
  if (!user) return { success: false, error: 'not-authenticated' };

  const payload = {
    user_id: user.id,
    month: record.month,
    power_consumption: record.kwh,
    cost_per_kwh: record.rate,
    result: record.total
  };

  try {
    const { data, error } = await window.supabaseClient
      .from('calculations')
      .insert([payload])
      .select();
    if (error) return { success: false, error };
    return { success: true, data };
  } catch (e) {
    console.error('saveCalculationToSupabase exception:', e);
    return { success: false, error: e };
  }
}

async function fetchRecentCalculations(limit = 10) {
  if (!window.supabaseClient) return { data: null, error: 'no-client' };
  const user = await getCurrentUser();
  if (!user) return { data: null, error: 'not-authenticated' };
  try {
    const { data, error } = await window.supabaseClient
      .from('calculations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    // Map Supabase columns back to display-friendly names for compatibility
    if (data && Array.isArray(data)) {
      data.forEach(rec => {
        rec.kwh = rec.power_consumption;
        rec.rate = rec.cost_per_kwh;
        rec.total = rec.result;
      });
    }
    return { data, error };
  } catch (e) {
    console.error('fetchRecentCalculations exception:', e);
    return { data: null, error: e };
  }
}

// Expose to window for other scripts
window.checkAuth = checkAuth;
window.getCurrentUser = getCurrentUser;
window.signOut = signOut;
window.saveCalculationToSupabase = saveCalculationToSupabase;
window.fetchRecentCalculations = fetchRecentCalculations;

// Sync any locally stored savedBills to Supabase for the current user.
async function syncLocalSavedBills() {
  if (!window.supabaseClient) return { success: false, error: 'no-client' };
  const user = await getCurrentUser();
  if (!user) return { success: false, error: 'not-authenticated' };

  // Use namespaced local key for this user
  const key = 'savedBills:' + user.id;
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem(key) || '[]'); } catch(e){ saved = []; }
  if (!saved || !saved.length) return { success: true, migrated: 0 };

  const remaining = [];
  let migrated = 0;
  for (const rec of saved) {
    try {
      const res = await saveCalculationToSupabase(rec);
      if (res && res.success) {
        migrated += 1;
      } else {
        remaining.push(rec);
        console.warn('Failed to migrate record to Supabase', res?.error || res);
      }
    } catch (e) {
      remaining.push(rec);
      console.error('Exception while migrating record', e);
    }
  }

  try { localStorage.setItem(key, JSON.stringify(remaining)); } catch(e){ console.warn('Failed to update local savedBills', e); }
  return { success: true, migrated, remainingCount: remaining.length };
}

window.syncLocalSavedBills = syncLocalSavedBills;

// Local storage helpers that namespace by signed-in user when available.
async function getLocalStorageKey(){
  try{
    const user = await getCurrentUser();
    if (user && user.id) return 'savedBills:' + user.id;
  }catch(e){}
  return 'savedBills';
}

async function getLocalSavedBills(){
  const key = await getLocalStorageKey();
  try{ return JSON.parse(localStorage.getItem(key) || '[]'); }catch(e){ return []; }
}

async function setLocalSavedBills(arr){
  const key = await getLocalStorageKey();
  try{ localStorage.setItem(key, JSON.stringify(arr)); return true; }catch(e){ console.warn('Failed to save local bills', e); return false; }
}

window.getLocalStorageKey = getLocalStorageKey;
window.getLocalSavedBills = getLocalSavedBills;
window.setLocalSavedBills = setLocalSavedBills;
