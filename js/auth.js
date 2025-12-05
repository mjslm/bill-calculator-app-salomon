// js/auth.js
// Authentication helpers modeled after your instructor sample.
// Uses the existing SUPABASE_URL and SUPABASE_ANON_KEY from js/supabase-config.js

(function(){
  // Ensure supabase client exists; try to create if the global lib is present
  try{
    if (!window.supabaseClient) {
      if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
        window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      } else if (typeof window.supabaseJs !== 'undefined' && typeof window.supabaseJs.createClient === 'function') {
        window.supabaseClient = window.supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      } else {
        // supabase client not available yet; leave window.supabaseClient as-is
        console.warn('Supabase library not found when loading js/auth.js. Ensure the CDN is included before auth.js');
      }
    }
  }catch(e){ console.error('auth init error', e); }

  // Authentication helpers
  async function checkAuth(){
    if (!window.supabaseClient) { console.warn('Supabase client not initialized'); return null; }
    try{
      const { data: { session }, error } = await window.supabaseClient.auth.getSession();
      if (error) { console.error('Error checking auth:', error); return null; }
      return session;
    }catch(e){ console.error('checkAuth error', e); return null; }
  }

  async function getCurrentUser(){
    if (!window.supabaseClient) { console.warn('Supabase client not initialized'); return null; }
    try{
      const { data: { user }, error } = await window.supabaseClient.auth.getUser();
      if (error) { console.error('Error getting user:', error); return null; }
      return user;
    }catch(e){ console.error('getCurrentUser error', e); return null; }
  }

  async function signOut(){
    if (!window.supabaseClient) { console.warn('Supabase client not initialized'); return false; }
    try{
      const { error } = await window.supabaseClient.auth.signOut();
      if (error) { console.error('Error signing out:', error); return false; }
      return true;
    }catch(e){ console.error('signOut error', e); return false; }
  }

  // Page protection helpers
  async function requireAuth(){
    const session = await checkAuth();
    if (!session) { window.location.href = 'login.html'; return false; }
    return true;
  }

  async function initAuth(){
    const session = await checkAuth();
    if (!session) { window.location.href = 'login.html'; }
    return session;
  }

  async function redirectIfAuthenticated(){
    const session = await checkAuth();
    if (session) { window.location.href = 'dashboard.html'; }
  }

  // Expose functions globally (so other scripts can call them)
  window.checkAuth = checkAuth;
  window.getCurrentUser = getCurrentUser;
  window.signOut = signOut;
  window.requireAuth = requireAuth;
  window.initAuth = initAuth;
  window.redirectIfAuthenticated = redirectIfAuthenticated;

})();

// Attach logout handlers to elements with class 'logout-link'
document.addEventListener('DOMContentLoaded', () => {
  try {
    const els = document.querySelectorAll('.logout-link');
    els.forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.preventDefault();
        try {
          if (window.signOut) await window.signOut();
        } catch (e) { console.warn('signOut failed', e); }
        // Do NOT remove local savedBills here; keep local copies until user decides
        // Redirect to login page after sign out
        window.location.href = 'login.html';
      });
    });
  } catch (e) { console.warn('logout handler attach error', e); }
});
