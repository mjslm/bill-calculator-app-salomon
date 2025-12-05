// Supabase Configuration
// Note: Replace the publishable key below with your actual publishable key from Supabase dashboard
const supabaseUrl = "https://rnxugkmsobyaddbmkkpw.supabase.co";
const supabaseKey = "sb_publishable_Dqs-x1icBMDhYU6N0f19WA_BKBydQci";

// Create Supabase client (supabase is available globally from CDN)
const { createClient } = (typeof supabase !== 'undefined' ? supabase : window.supabase || {});
const supabaseClient = (typeof createClient === 'function') ? createClient(supabaseUrl, supabaseKey) : null;

// Attach client to window for other modules
if (typeof window !== 'undefined') window.supabaseClient = supabaseClient;

// Authentication helper functions
async function checkAuth() {
    if (!supabaseClient) return null;
    const {
        data: { session },
        error,
    } = await supabaseClient.auth.getSession();
    if (error) {
        console.error("Error checking auth:", error);
        return null;
    }
    return session;
}

async function getCurrentUser() {
    if (!supabaseClient) return null;
    const {
        data: { user },
        error,
    } = await supabaseClient.auth.getUser();
    if (error) {
        console.error("Error getting user:", error);
        return null;
    }
    return user;
}

async function signOut() {
    if (!supabaseClient) return false;
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        console.error("Error signing out:", error);
        return false;
    }
    return true;
}

// Expose helpers globally for existing code
if (typeof window !== 'undefined'){
    window.supabaseClient = supabaseClient;
    window.checkAuth = checkAuth;
    window.getCurrentUser = getCurrentUser;
    window.signOut = signOut;
}

// Helpful console message when client isn't initialized
if (!supabaseClient && typeof console !== 'undefined') console.warn('Supabase client not initialized. Ensure the Supabase CDN script is loaded before js/supabase-config.js');
