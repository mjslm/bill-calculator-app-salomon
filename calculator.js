async function calculateBill() {
  const monthEl = document.getElementById("month");
  const kwhEl = document.getElementById("kwh");
  const rateEl = document.getElementById("rate");
  const display = document.getElementById("totalDisplay");

  const month = monthEl.value.trim();
  const kwh = parseFloat(kwhEl.value);
  const rate = parseFloat(rateEl.value);

  if (!month || isNaN(kwh) || isNaN(rate)) {
    display.innerText = "₱0.00";
    return;
  }

  // --- More detailed Philippine-style breakdown (configurable defaults) ---
  // These default components are placeholders to create a realistic breakdown.
  // Adjust the rates below to match your provider/region or fetch real tariff data.
  const defaults = {
    transmissionRate: 0.10,    // ₱ per kWh (example)
    distributionRate: 0.15,    // ₱ per kWh (example)
    universalChargeRate: 0.02, // ₱ per kWh
    otherChargesRate: 0.01,    // ₱ per kWh (environmental, etc.)
    taxRate: 0.12              // 12% VAT-like tax (adjust if not applicable)
  };

  const generation = kwh * rate;
  const transmission = kwh * defaults.transmissionRate;
  const distribution = kwh * defaults.distributionRate;
  const universal = kwh * defaults.universalChargeRate;
  const otherCharges = kwh * defaults.otherChargesRate;

  const subtotal = generation + transmission + distribution + universal + otherCharges;
  const tax = subtotal * defaults.taxRate;
  const total = subtotal + tax;

  display.innerText = "₱ " + total.toFixed(2);

  // Save result to localStorage so save-results.html and dashboard can show it
  const key = 'savedBills';
  const record = {
    month: month,
    kwh: Number(kwh.toFixed(2)),
    rate: Number(rate.toFixed(2)),
    breakdown: {
      generation: Number(generation.toFixed(2)),
      transmission: Number(transmission.toFixed(2)),
      distribution: Number(distribution.toFixed(2)),
      universal: Number(universal.toFixed(2)),
      other: Number(otherCharges.toFixed(2)),
      subtotal: Number(subtotal.toFixed(2)),
      tax: Number(tax.toFixed(2))
    },
    total: Number(total.toFixed(2)),
    timestamp: new Date().toISOString()
  };

  try {
    // use helper that namespaces local storage by user when possible
    if (window.getLocalSavedBills && window.setLocalSavedBills){
      const existing = await window.getLocalSavedBills();
      existing.unshift(record);
      await window.setLocalSavedBills(existing);
    } else {
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.unshift(record); // newest first
      localStorage.setItem(key, JSON.stringify(existing));
    }
  } catch (e) {
    console.error('Failed to save result locally:', e);
  }

  // Also attempt to save to Supabase if client lib is configured and user is authenticated
  try {
    if (window.saveCalculationToSupabase && typeof window.saveCalculationToSupabase === 'function') {
      // show status while saving
      setSupabaseStatus('Saving to Supabase...');
      window.saveCalculationToSupabase(record).then(res => {
        if (res && res.success) {
          console.log('Saved calculation to Supabase', res);
          setSupabaseStatus('Saved to Supabase');
          // clear status after a short delay
          setTimeout(()=> setSupabaseStatus(''), 2500);
        } else if (res && res.error) {
          console.warn('Supabase save failed or unauthenticated:', res.error);
          setSupabaseStatus('Supabase save failed: ' + (res.error.message || res.error));
        }
      }).catch(err => {
        console.warn('Supabase save error:', err);
        setSupabaseStatus('Supabase save error: ' + (err.message || err));
      });
    } else {
      // client helper not available
      setSupabaseStatus('Supabase client not loaded');
    }
  } catch (e) {
    console.warn('Supabase save attempt failed:', e);
    setSupabaseStatus('Supabase save attempt failed');
  }

  // Clear inputs after saving (keeps UI clean, design unchanged)
  monthEl.value = '';
  kwhEl.value = '';
  rateEl.value = '';
}

// Small UI helpers for Supabase status and auth checks
function setSupabaseStatus(text){
  const el = document.getElementById('supabaseStatus');
  if (!el) return;
  el.innerText = text || '';
}

async function updateSupabaseStatus(){
  try{
    if (!window.supabaseClient){ setSupabaseStatus('Supabase not initialized'); return; }
    const { data, error } = await window.supabaseClient.auth.getUser();
    if (error){ setSupabaseStatus('Supabase auth error'); console.warn(error); return; }
    const user = data && data.user ? data.user : null;
    if (user){
      setSupabaseStatus('Signed in as ' + (user.email || user.id));
    } else {
      setSupabaseStatus('Not signed in (calculations will save locally)');
    }
  }catch(e){ console.warn('updateSupabaseStatus error', e); setSupabaseStatus('Supabase status unknown'); }
}

document.addEventListener('DOMContentLoaded', function(){
  // Load and display user's name
  loadUserGreeting();
  // Update status on load
  updateSupabaseStatus();
  // refresh status occasionally in case auth changes
  setInterval(updateSupabaseStatus, 5000);
});

async function loadUserGreeting(){
  try{
    const user = await getCurrentUser();
    if (user){
      const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
      const greetingEl = document.getElementById('userGreeting');
      if (greetingEl){
        greetingEl.innerText = `Welcome, ${fullName}`;
      }
    }
  }catch(e){
    console.warn('Error loading user greeting:', e);
  }
}

// Listen for profile updates from other pages/tabs
window.addEventListener('storage', (event) => {
  if (event.key === 'userProfileUpdated'){
    console.log('Profile was updated, refreshing greeting...');
    loadUserGreeting();
  }
});
