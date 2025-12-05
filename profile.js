const modalBg = document.getElementById("modalBg");
const openModalBtn = document.getElementById("openModalBtn");
const cancelBtn = document.getElementById("cancelBtn");

openModalBtn.addEventListener("click", () => {
  modalBg.classList.add("show");
});

cancelBtn.addEventListener("click", () => {
  modalBg.classList.remove("show");
});

// Also close modal when clicking outside the box
modalBg.addEventListener("click", (e) => {
  if (e.target === modalBg) {
    modalBg.classList.remove("show");
  }
});

// Normalize phone numbers to local 11-digit format (e.g. 09365129459)
function normalizePhone(raw){
  if (!raw) return '';
  // Remove all non-digit chars
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';

  // If starts with country code 63 (e.g. 639xxxxxxxxx), convert to 0xxxxxxxxxx
  if (digits.startsWith('63')){
    const rest = digits.slice(2);
    if (rest.length === 10) return '0' + rest;
    // if rest is longer/shorter, still attempt to normalize by taking last 10 digits
    if (rest.length > 10) return '0' + rest.slice(-10);
  }

  // If starts with 0 and 11 digits, accept
  if (digits.length === 11 && digits.startsWith('0')) return digits;

  // If 10 digits (no leading 0), prefix 0
  if (digits.length === 10) return '0' + digits;

  // If longer than 11, try to take last 11 digits
  if (digits.length > 11){
    const last11 = digits.slice(-11);
    if (last11.startsWith('0')) return last11;
    return last11;
  }

  // Fallback: return digits as-is (validation will catch incorrect lengths on save)
  return digits;
}

// ============ SUPABASE PROFILE INTEGRATION ============

// Load user profile on page load
document.addEventListener('DOMContentLoaded', async () => {
  await initAuth(); // Protect page - redirect if not authenticated
  await loadUserProfile();
});

// Load and display user profile data from Supabase
async function loadUserProfile() {
  const user = await getCurrentUser();
  if (!user) {
    console.log('No user logged in');
    return;
  }

  try {
    // Get user metadata from auth
    const metadata = user.user_metadata || {};
    const email = user.email || '';
    const fullName = metadata.full_name || 'User';
    const rawPhone = metadata.phone || '';
    const phone = normalizePhone(rawPhone);

    // Update display with user info
    const userHeaderDiv = document.querySelector('.user-header div');
    if (userHeaderDiv) {
      userHeaderDiv.innerHTML = `
        <h3 class="section-title">General Information</h3>
        <p><strong>Full Name:</strong> <span id="displayName">${fullName}</span></p>
        <p><strong>Email:</strong> <span id="displayEmail">${email}</span></p>
        <p><strong>Phone Number:</strong> <span id="displayPhone">${phone}</span></p>
      `;
    }

    // Pre-fill modal with current data (use explicit IDs)
    const firstNameInput = document.getElementById('profileFirst');
    const lastNameInput = document.getElementById('profileLast');
    const emailInput = document.getElementById('profileEmail');
    const phoneInput = document.getElementById('profilePhone');

    if (firstNameInput) firstNameInput.value = fullName.split(' ')[0] || '';
    if (lastNameInput) lastNameInput.value = fullName.split(' ').slice(1).join(' ') || '';
    if (emailInput) emailInput.value = email;
    if (phoneInput) phoneInput.value = phone;

  } catch (error) {
    console.error('Error loading profile:', error);
  }
}

// Handle profile update
const updateBtn = document.querySelector('.update-btn');
if (updateBtn) {
  updateBtn.addEventListener('click', async () => {
    const firstNameInput = document.getElementById('profileFirst');
    const lastNameInput = document.getElementById('profileLast');
    const emailInput = document.getElementById('profileEmail');
    const phoneInput = document.getElementById('profilePhone');

    const firstName = firstNameInput?.value.trim() || '';
    const lastName = lastNameInput?.value.trim() || '';
    const email = emailInput?.value.trim() || '';
    const phoneRaw = phoneInput?.value.trim() || '';
    const phone = normalizePhone(phoneRaw);
    const fullName = `${firstName} ${lastName}`.trim();

    if (!firstName || !email) {
      alert('Please enter at least First Name and Email');
      return;
    }

    try {
      const user = await getCurrentUser();
      if (!user) {
        alert('You must be logged in to update profile');
        return;
      }

      // Validate phone is 11 digits (local format) before saving
      if (phone && (!/^[0][0-9]{10}$/.test(phone))) {
        alert('Phone number must be 11 digits in local format (e.g. 09365129459).');
        return;
      }

      // Update user metadata in Supabase Auth
      const { data, error } = await window.supabaseClient.auth.updateUser({
        email: email,
        data: {
          full_name: fullName,
          phone: phone
        }
      });

      if (error) {
        console.error('Profile update error:', error);
        alert('Failed to update profile: ' + error.message);
        return;
      }

      console.log('Profile updated successfully:', data);
      alert('Profile updated successfully!');

      // Broadcast profile update to other pages/tabs
      localStorage.setItem('userProfileUpdated', Date.now().toString());

      // Close modal and reload profile
      modalBg.classList.remove('show');
      await loadUserProfile();

    } catch (e) {
      console.error('Profile update exception:', e);
      alert('Error updating profile');
    }
  });
}

// Listen for profile updates from other pages/tabs
window.addEventListener('storage', (event) => {
  if (event.key === 'userProfileUpdated'){
    console.log('Profile was updated, reloading...');
    loadUserProfile();
  }
});

// Handle password change
const changePasswordBtn = document.getElementById('changePasswordBtn');
if (changePasswordBtn) {
  changePasswordBtn.addEventListener('click', async () => {
    const currentPasswordInput = document.getElementById('currentPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    const currentPassword = currentPasswordInput?.value.trim() || '';
    const newPassword = newPasswordInput?.value.trim() || '';
    const confirmPassword = confirmPasswordInput?.value.trim() || '';

    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('New password and confirm password do not match');
      return;
    }

    if (newPassword.length < 6) {
      alert('New password must be at least 6 characters');
      return;
    }

    try {
      // Update password in Supabase Auth
      const { data, error } = await window.supabaseClient.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('Password change error:', error);
        alert('Failed to change password: ' + error.message);
        return;
      }

      console.log('Password changed successfully');
      alert('Password changed successfully!');

      // Clear password fields
      if (currentPasswordInput) currentPasswordInput.value = '';
      if (newPasswordInput) newPasswordInput.value = '';
      if (confirmPasswordInput) confirmPasswordInput.value = '';

    } catch (e) {
      console.error('Password change exception:', e);
      alert('Error changing password');
    }
  });
}
