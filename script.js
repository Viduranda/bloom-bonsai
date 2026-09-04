/* ============================================================================
   BLOOM & BONSAI — script.js
   ----------------------------------------------------------------------------
   Handles: auth, products, cart, orders, tracking, my-garden, dashboard,
            product details + care plans, designer, newsletter, UI.
   Backend: PHP API in /api  (returns {success:true, data} | {success:false, error})
   Auth:    JWT token stored in localStorage as 'token', user as 'user'
   ============================================================================ */

'use strict';

/* ─────────────────────────── 1. CONSTANTS & HELPERS ────────────────────────── */

const API_BASE = (window.location.protocol === 'file:')
  ? 'api/'
  : window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1) + 'api/';

// Generic fetch wrapper: adds JWT header, parses JSON, throws on API error
async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...(options.headers || {}) };

  // Only set JSON content-type for JSON bodies — never for FormData (file uploads)
  if (!options.formdata && options.body) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers['Authorization'] = 'Bearer ' + token;

  let fetchUrl = API_BASE + endpoint;
  let fetchOptions = { ...options, headers };
  if (!options.formdata && options.body && typeof options.body === 'object') {
    fetchOptions.body = JSON.stringify(options.body);
  }

  let res;
  try {
    res = await fetch(fetchUrl, fetchOptions);
  } catch (netErr) {
    if (window.location.protocol === 'file:') {
      throw new Error('You opened this file directly (file://). Please open the site via web server (HTTP/HTTPS)!');
    }
    throw new Error('Unable to connect to server. Please check your internet connection or server status.');
  }

  let json;
  try {
    json = await res.json();
  } catch {
    let rawText = '';
    try { rawText = await res.text(); } catch {}
    const errDetail = rawText ? ' Detail: ' + rawText.substring(0, 120).replace(/<[^>]*>/g, '') : '';
    json = { success: false, error: 'Server error (HTTP ' + res.status + ').' + errDetail };
  }

  if (!json.success) {
    const err = new Error(json.error || 'Request failed');
    err.error = json.error;
    err.status = res ? res.status : 500;
    throw err;   // works with both e.message AND e.error
  }
  return json.data !== undefined ? json.data : json;
}

// Escape HTML to prevent XSS in rendered strings
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Format as Sri lankan Rupees: 299.00 → Rs299.00
function formatINR(n) {
  return 'Rs. ' + Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
function formatLKR(n) { return formatINR(n); }

// Tiny toast notification (bottom-right corner)
function showToast(message, type = 'success') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText =
      'position:fixed;bottom:24px;right:24px;z-index:9999;padding:14px 22px;' +
      'border-radius:10px;color:#fff;font-weight:600;box-shadow:0 8px 30px rgba(0,0,0,.2);' +
      'opacity:0;transition:opacity .3s;max-width:320px;';
    document.body.appendChild(toast);
  }
  toast.style.background = type === 'error' ? '#dc3545' : '#2D6A4F';
  toast.textContent = message;
  toast.style.opacity = '1';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}

/* ─────────────────── 2. DEMO DATA (remove when backend is live) ─────────────── */

// Set to false once api/products/list.php is working — then all data
// comes from the MySQL database instead of these arrays.
const DEMO_MODE = false;
const FALLBACK_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#e8f5e9"/><text x="200" y="160" font-size="70" text-anchor="middle">Plant</text></svg>');

const DEMO_PRODUCTS = [
  { id: 1, name: 'Rose Plant (Red)',   category: 'Flowers',     category_slug: 'flowers',     price: '299.00',  old_price: '399.00',  image: 'https://images.unsplash.com/photo-1496062031456-07b8f162a322?w=400', badge: 'Bestseller' },
  { id: 2, name: 'Anthurium',          category: 'Flowers',     category_slug: 'flowers',     price: '499.00',  old_price: null,      image: 'https://images.unsplash.com/photo-1446071103084-c257b5f70672?w=400', badge: 'New' },
  { id: 3, name: 'Lily Plant',         category: 'Flowers',     category_slug: 'flowers',     price: '349.00',  old_price: '449.00',  image: 'https://images.unsplash.com/photo-1520763185298-1b434c919102?w=400', badge: null },
  { id: 4, name: 'Indoor Bonsai (Ficus)', category: 'Bonsai Trees', category_slug: 'bonsai', price: '899.00',  old_price: '1099.00', image: 'https://images.unsplash.com/photo-1562408590-e32931084e23?w=400', badge: 'Bestseller' },
  { id: 5, name: 'Outdoor Bonsai (Juniper)', category: 'Bonsai Trees', category_slug: 'bonsai', price: '1299.00', old_price: null,     image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400', badge: null },
  { id: 6, name: 'Ceramic Pot Set (3 pcs)', category: 'Accessories', category_slug: 'accessories', price: '599.00', old_price: '799.00', image: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400', badge: 'New' },
  { id: 7, name: 'Organic Potting Soil 5kg', category: 'Accessories', category_slug: 'accessories', price: '249.00', old_price: null, image: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=400', badge: null },
  { id: 8, name: 'Gardening Tool Set', category: 'Accessories', category_slug: 'accessories', price: '749.00', old_price: '999.00', image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400', badge: null }
];

const DEMO_PLANTS = [
  { id: 1, plant_name: 'Ruby', species: 'Rosa indica',  health_status: 'healthy',         image_url: 'https://images.unsplash.com/photo-1496062031456-07b8f162a322?w=400' },
  { id: 2, plant_name: 'Fico', species: 'Ficus retusa', health_status: 'needs_attention', image_url: 'https://images.unsplash.com/photo-1562408590-e32931084e23?w=400' },
  { id: 3, plant_name: 'Lily', species: 'Lilium',       health_status: 'healthy',         image_url: 'https://images.unsplash.com/photo-1520763185298-1b434c919102?w=400' }
];

// Generic 4-week demo care plan (used when the DB isn't connected yet)
function demoCarePlan() {
  return [
    { week_number: 1, title: 'Unboxing & First Watering', content: 'Remove packaging gently. Check the soil — if dry, water thoroughly until water drains from the bottom. Keep in bright, indirect light for the first week.' },
    { week_number: 2, title: 'Finding Its Spot', content: 'Move your plant to its permanent location. Rotate the pot a quarter turn every few days so it grows evenly. Skip fertilizer this week.' },
    { week_number: 3, title: 'First Feeding & Checkup', content: 'Feed with a half-strength liquid fertilizer. Wipe dust off the leaves and check the undersides for pests.' },
    { week_number: 4, title: 'Bloom & Growth Watch', content: 'Expect new growth by now. Water only when the top 2 inches of soil feel dry. If it is a flowering plant, buds may begin to appear.' }
  ];
}

/* ─────────────────────────── 3. AUTH (login/register/logout) ───────────────── */

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('user')); }
  catch { return null; }
}

// Switch navbar between logged-in / logged-out state
function updateAuthUI(user) {
  const loginBtn  = document.getElementById('loginBtn');
  const signupBtn = document.getElementById('signupBtn');
  const userMenu  = document.getElementById('userMenu');
  const userName  = document.getElementById('userName');
  const navLinks  = document.getElementById('navLinks');

  // Remove any stale duplicate admin or mobile auth links
  const navAdminLi = document.getElementById('navAdminLi');
  if (navAdminLi) navAdminLi.remove();
  document.querySelectorAll('.mobile-auth-item').forEach(el => el.remove());

  if (user) {
    if (loginBtn)  loginBtn.style.display  = 'none';
    if (signupBtn) signupBtn.style.display = 'none';
    if (userMenu)  userMenu.style.display  = 'flex';
    if (userName)  userName.textContent    = user.name ? user.name.split(' ')[0] : 'User';

    let adminMenuBtn = document.getElementById('userMenuAdminBtn');

    if (user.role === 'admin') {
      if (userMenu && !adminMenuBtn) {
        adminMenuBtn = document.createElement('a');
        adminMenuBtn.id = 'userMenuAdminBtn';
        adminMenuBtn.href = 'admin_dash.html';
        adminMenuBtn.className = 'admin-portal-badge';
        adminMenuBtn.innerHTML = '<i class="fas fa-crown"></i> <span>Admin Panel</span>';
        userMenu.insertBefore(adminMenuBtn, userMenu.firstChild);
      } else if (adminMenuBtn) {
        adminMenuBtn.className = 'admin-portal-badge';
        adminMenuBtn.style.display = 'inline-flex';
      }
    } else {
      if (adminMenuBtn) adminMenuBtn.style.display = 'none';
    }

    // Add Mobile-only Auth links to Hamburger Dropdown
    if (navLinks) {
      if (user.role === 'admin') {
        const mobileAdminLi = document.createElement('li');
        mobileAdminLi.className = 'mobile-auth-item mobile-only-nav';
        mobileAdminLi.innerHTML = '<a href="admin_dash.html" style="color:#c9a227;font-weight:700;"><i class="fas fa-crown"></i> Admin Panel</a>';
        navLinks.appendChild(mobileAdminLi);
      }

      const mobileUserLi = document.createElement('li');
      mobileUserLi.className = 'mobile-auth-item mobile-only-nav';
      mobileUserLi.innerHTML = '<span style="color:#2D6A4F;font-weight:600;"><i class="fas fa-user-circle"></i> Hi, ' + esc(user.name ? user.name.split(' ')[0] : 'User') + '</span>';
      navLinks.appendChild(mobileUserLi);

      const mobileLogoutLi = document.createElement('li');
      mobileLogoutLi.className = 'mobile-auth-item mobile-only-nav';
      mobileLogoutLi.innerHTML = '<a href="#" onclick="logout(); return false;" style="color:#e74c3c;font-weight:600;"><i class="fas fa-sign-out-alt"></i> Logout</a>';
      navLinks.appendChild(mobileLogoutLi);
    }
  } else {
    if (loginBtn)  loginBtn.style.display  = 'inline-block';
    if (signupBtn) signupBtn.style.display = 'inline-block';
    if (userMenu)  userMenu.style.display  = 'none';
    const adminMenuBtn = document.getElementById('userMenuAdminBtn');
    if (adminMenuBtn) adminMenuBtn.style.display = 'none';

    // Add Mobile Login & Sign Up links to Hamburger Dropdown when logged out
    if (navLinks) {
      const mobileLoginLi = document.createElement('li');
      mobileLoginLi.className = 'mobile-auth-item mobile-only-nav';
      mobileLoginLi.innerHTML = '<a href="login.html" class="btn-login" style="display:block;width:100%;margin-top:5px;">Login</a>';
      navLinks.appendChild(mobileLoginLi);

      const mobileSignupLi = document.createElement('li');
      mobileSignupLi.className = 'mobile-auth-item mobile-only-nav';
      mobileSignupLi.innerHTML = '<a href="register.html" class="btn-signup" style="display:block;width:100%;">Sign Up</a>';
      navLinks.appendChild(mobileSignupLi);
    }
  }
}

// Handle the login form submit
async function handleLogin(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (handleLogin._isSubmitting) return;

  const emailEl = document.getElementById('loginEmail');
  const passEl  = document.getElementById('loginPassword');
  if (!emailEl || !passEl) return;

  const email    = emailEl.value.trim();
  const password = passEl.value;
  if (!email || !password) {
    showToast('Please enter your email and password', 'error');
    return;
  }

  handleLogin._isSubmitting = true;

  const btn = document.getElementById('loginSubmitBtn') || (e && e.target && e.target.querySelector ? e.target.querySelector('button[type="submit"]') : null);
  const origText = btn ? btn.innerHTML : 'Login';
  if (btn) { btn.disabled = true; btn.innerHTML = 'Logging in… <i class="fas fa-spinner fa-spin"></i>'; }

  try {
    const data = await apiFetch('auth/login.php', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    document.cookie = "token=" + data.token + "; path=/; max-age=604800";
    updateAuthUI(data.user);
    updateCartCount();
    showToast('Welcome back, ' + (data.user.name ? data.user.name.split(' ')[0] : 'User') + '! 🌿');
    setTimeout(() => {
      if (data.user && data.user.role === 'admin') {
        location.href = 'admin_dash.html';
      } else {
        location.href = 'index.html';
      }
    }, 700);
  } catch (err) {
    const msg = err.error || err.message || 'Invalid email or password';
    showToast(msg, 'error');
    alert(msg);
    if (btn) { btn.disabled = false; btn.innerHTML = origText; }
  } finally {
    handleLogin._isSubmitting = false;
  }
}

// Handle the register form submit
async function handleRegister(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (handleRegister._isSubmitting) return;

  const nameEl  = document.getElementById('regName');
  const emailEl = document.getElementById('regEmail');
  const passEl  = document.getElementById('regPassword');
  const phoneEl = document.getElementById('regPhone');
  if (!nameEl || !emailEl || !passEl) return;

  const name  = nameEl.value.trim();
  const email = emailEl.value.trim();
  const pass  = passEl.value;
  const phone = phoneEl ? phoneEl.value.trim() : '';

  if (!name || !email || !pass) {
    showToast('Please fill in all required fields', 'error');
    alert('Please fill in all required fields');
    return;
  }

  handleRegister._isSubmitting = true;

  const btn = document.getElementById('regSubmitBtn') || (e && e.target && e.target.querySelector ? e.target.querySelector('button[type="submit"]') : null);
  const origText = btn ? btn.innerHTML : 'Create Account';
  if (btn) { btn.disabled = true; btn.innerHTML = 'Creating account… <i class="fas fa-spinner fa-spin"></i>'; }

  try {
    const data = await apiFetch('auth/register.php', {
      method: 'POST',
      body: JSON.stringify({ name, email, password: pass, phone })
    });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    updateAuthUI(data.user);
    showToast('Account created! Welcome aboard 🌱');
    setTimeout(() => { location.href = 'index.html'; }, 500);
  } catch (err) {
    const msg = err.error || err.message || 'Registration failed';
    showToast(msg, 'error');
    alert(msg);
    if (btn) { btn.disabled = false; btn.innerHTML = origText; }
  } finally {
    handleRegister._isSubmitting = false;
  }
}

// Logout: tell the server, then DELETE the token locally (the critical part)
async function logout() {
  try {
    const token = localStorage.getItem('token');
    if (token) {
      await apiFetch('auth/logout.php', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token }
      });
    }
  } catch (err) {
    console.warn('Logout request failed (ignored):', err);
  }

  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('bloom_wishlist');
  if (window.userWishlistSet) window.userWishlistSet.clear();

  updateAuthUI(null);
  updateCartCount();
  updateWishlistBadge(0);
  showToast('Logged out. See you soon! 👋');
  setTimeout(() => { location.href = 'index.html'; }, 700);
}

// ── Logout — clears the token locally and redirects ──
document.addEventListener('click', (e) => {
    const btn = e.target.closest('#logoutBtn, .logout-btn');
    if (!btn) return;
    e.preventDefault();
    logout();
});

window.userWishlistSet = window.userWishlistSet || new Set();

function getLocalWishlist() {
  try {
    const data = localStorage.getItem('bloom_wishlist');
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveLocalWishlist(ids) {
  try {
    localStorage.setItem('bloom_wishlist', JSON.stringify(ids));
  } catch {}
}

async function loadWishlistState() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  let localIds = getLocalWishlist();
  
  if (token) {
    try {
      const res = await apiFetch('wishlist/list.php');
      const dbIds = (res && res.ids) ? res.ids : (res && res.data && res.data.ids ? res.data.ids : []);
      if (dbIds && Array.isArray(dbIds)) {
        const combined = new Set([...dbIds, ...localIds]);
        window.userWishlistSet = combined;
        saveLocalWishlist(Array.from(combined));
        updateWishlistBadge(combined.size);
        return;
      }
    } catch(e) {}
  }
  
  if (!token) {
    localStorage.removeItem('bloom_wishlist');
    window.userWishlistSet = new Set();
    updateWishlistBadge(0);
    return;
  }
}

function updateWishlistBadge(count) {
  document.querySelectorAll('#wishlistCount, .wishlist-count-badge').forEach(el => {
    el.textContent = count || 0;
  });
}

window.toggleWishlist = async function(productId, event) {
  if (event) {
    if (typeof event.stopPropagation === 'function') event.stopPropagation();
    if (typeof event.preventDefault === 'function') event.preventDefault();
  }
  
  const pid = Number(productId);
  if (!pid) return;

  // Prevent rapid double-click race conditions
  window.toggleWishlist._busy = window.toggleWishlist._busy || {};
  if (window.toggleWishlist._busy[pid]) return;
  window.toggleWishlist._busy[pid] = true;

  // Instant optimistic UI update
  const currentlySaved = window.userWishlistSet ? window.userWishlistSet.has(pid) : false;
  const nextWishlistState = !currentlySaved;

  if (!window.userWishlistSet) window.userWishlistSet = new Set();

  if (nextWishlistState) {
    window.userWishlistSet.add(pid);
  } else {
    window.userWishlistSet.delete(pid);
  }

  // Dual local storage sync
  let localIds = getLocalWishlist();
  if (nextWishlistState && !localIds.includes(pid)) localIds.push(pid);
  else if (!nextWishlistState) localIds = localIds.filter(id => id !== pid);
  saveLocalWishlist(localIds);

  // Update badge and heart buttons instantly
  updateWishlistBadge(window.userWishlistSet.size);
  document.querySelectorAll(`.wishlist-heart-btn[data-pid="${pid}"] i`).forEach(icon => {
    icon.className = nextWishlistState ? 'fas fa-heart' : 'far fa-heart';
    icon.style.color = nextWishlistState ? '#e74c3c' : '#555';
    if (icon.parentElement) {
      icon.parentElement.style.transform = 'scale(1.35)';
      setTimeout(() => { icon.parentElement.style.transform = 'scale(1)'; }, 200);
    }
  });

  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  let msg = nextWishlistState ? 'Saved to Wishlist ❤️' : 'Removed from Wishlist';

  if (token) {
    try {
      const res = await apiFetch('wishlist/toggle.php', {
        method: 'POST',
        body: { product_id: pid }
      });
      const unpacked = (res && res.is_wishlisted !== undefined) ? res : (res && res.data ? res.data : null);
      if (unpacked && unpacked.message) {
        msg = unpacked.message;
      }
    } catch(err) {
      console.warn('DB wishlist toggle notice:', err);
    }
  }

  showToast(msg, nextWishlistState ? 'success' : 'info');

  delete window.toggleWishlist._busy[pid];

  if (typeof window.loadWishlistPage === 'function') {
    window.loadWishlistPage();
  }
};

function getCategoryFallbackImg(p) {
  const cat = String(p.category || p.category_slug || '').toLowerCase();
  const name = String(p.name || '').toLowerCase();
  if (cat.includes('flower') || name.includes('rose') || name.includes('lily') || name.includes('flower') || name.includes('sunflower') || name.includes('anthurium')) {
    return 'https://images.unsplash.com/photo-1496062031456-07b8f162a322?w=600';
  }
  if (cat.includes('bonsai') || name.includes('bonsai') || name.includes('ficus') || name.includes('juniper') || name.includes('bougainvillea')) {
    return 'https://images.unsplash.com/photo-1562408590-e32931084e23?w=600';
  }
  if (cat.includes('access') || name.includes('pot') || name.includes('soil') || name.includes('tool') || name.includes('ceramic')) {
    return 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600';
  }
  return 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=600';
}

function renderProductCard(p) {
  const isOutOfStock = (p.stock != null && p.stock <= 0);
  const ratingText = (p.avg_rating || '5.0') + ' ⭐';
  const reviewsCount = p.review_count ? '(' + p.review_count + ')' : '(5)';
  const sunText = p.sunlight ? '☀️ ' + esc(p.sunlight) : '';
  const diffText = p.difficulty ? '🌱 ' + esc(p.difficulty) : '';
  const isSaved = window.userWishlistSet && window.userWishlistSet.has(Number(p.id));
  const isAccessory = Number(p.category_id) === 3 || (p.category && String(p.category).toLowerCase().includes('accessories'));

  const fallbackImg = getCategoryFallbackImg(p);
  const imgSrc = (p.image && typeof p.image === 'string' && p.image.trim() !== '') ? esc(p.image) : fallbackImg;

  return `
    <div class="product-card" onclick="openProductModal(${p.id})" style="cursor:pointer;position:relative;background:#ffffff;border-radius:18px;border:1px solid rgba(23,72,47,0.08);box-shadow:0 8px 25px rgba(0,0,0,0.05);overflow:hidden;display:flex;flex-direction:column;transition:all 0.35s ease;">
      <div class="product-img" style="position:relative;height:220px;min-height:220px;overflow:hidden;background:#eef4f0;">
        <img src="${imgSrc}" alt="${esc(p.name)}" loading="lazy" onerror="this.onerror=null;this.src='${fallbackImg}';" style="width:100%;height:100%;object-fit:cover;transition:transform 0.4s ease;">
        ${p.badge ? `<span class="product-badge" style="position:absolute;top:12px;left:12px;z-index:3;background:linear-gradient(135deg,#d4af37,#aa7c11);color:#fff;padding:5px 12px;border-radius:30px;font-size:0.72rem;font-weight:700;letter-spacing:0.4px;box-shadow:0 4px 12px rgba(212,175,55,0.35);text-transform:uppercase;">${esc(p.badge)}</span>` : ''}
        <span style="position:absolute;bottom:12px;left:12px;z-index:4;background:rgba(255,255,255,0.94);backdrop-filter:blur(6px);color:#17482f;padding:4px 10px;border-radius:20px;font-size:0.75rem;font-weight:700;box-shadow:0 4px 12px rgba(0,0,0,0.1);border:1px solid rgba(255,255,255,0.9);display:flex;align-items:center;gap:4px;">
          ${ratingText} ${reviewsCount}
        </span>
        <button class="wishlist-heart-btn" data-pid="${p.id}" onclick="event.stopPropagation(); toggleWishlist(${p.id}, event);" title="${isSaved ? 'Remove from Wishlist' : 'Save to Wishlist'}" style="position:absolute;top:12px;right:12px;background:rgba(255,255,255,0.92);backdrop-filter:blur(4px);border:none;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.12);z-index:5;transition:all 0.25s ease;">
          <i class="${isSaved ? 'fas fa-heart' : 'far fa-heart'}" style="color:${isSaved ? '#e74c3c' : '#555'};font-size:1.05rem;"></i>
        </button>
        ${isOutOfStock ? `<span style="position:absolute;bottom:12px;right:12px;z-index:4;background:rgba(192,57,43,0.92);color:#fff;padding:4px 10px;border-radius:8px;font-size:0.72rem;font-weight:700;backdrop-filter:blur(4px);">Out of Stock</span>` : ''}
      </div>
      <div class="product-info" style="padding:16px 16px 18px;display:flex;flex-direction:column;justify-content:space-between;flex-grow:1;">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span class="category-tag" style="color:#2D6A4F;font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">${esc(p.category || (isAccessory ? 'Accessory' : 'Plant'))}</span>
            ${!isAccessory && p.pet_safe == 1 ? `<span style="font-size:0.72rem;color:#2e7d4f;font-weight:600;background:#e8f5e9;padding:2px 8px;border-radius:12px;">🐶 Pet Safe</span>` : ''}
          </div>
          <h3 style="font-family:'Playfair Display',serif;font-size:1.1rem;font-weight:700;color:#17482f;margin:2px 0 4px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${esc(p.name)}">${esc(p.name)}</h3>
          ${!isAccessory && p.scientific_name ? `<p style="color:#52B788;font-style:italic;font-size:0.8rem;margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">🌿 ${esc(p.scientific_name)}</p>` : ''}
          ${!isAccessory ? `
          <div style="font-size:0.78rem;color:#7c8878;margin-bottom:10px;display:flex;gap:8px;flex-wrap:wrap;">
            ${sunText ? `<span>${sunText}</span>` : ''}
            ${diffText ? `<span>${diffText}</span>` : ''}
          </div>
          ` : '<div style="margin-bottom:10px;"></div>'}
          <div class="price" style="font-size:1.25rem;font-weight:800;color:#17482f;margin-bottom:14px;display:flex;align-items:baseline;gap:6px;">
            ${formatINR(p.price)}
            ${p.old_price ? `<s style="color:#95a5a6;font-size:0.85rem;font-weight:400;">${formatINR(p.old_price)}</s>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:auto;">
          <button class="add-to-cart-btn" style="flex:1;background:#17482f;color:#fff;border:none;padding:11px 10px;border-radius:12px;font-size:0.85rem;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;box-shadow:0 4px 14px rgba(23,72,47,0.25);transition:all 0.25s ease;" data-id="${p.id}" onclick="event.stopPropagation(); addToCart(${p.id});">
            <i class="fas fa-shopping-bag"></i> Add to Cart
          </button>
          <button onclick="event.stopPropagation(); openProductModal(${p.id});" style="background:#f4f8f5;color:#17482f;border:1px solid #d0e2d4;padding:11px 12px;border-radius:12px;font-size:0.85rem;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;transition:all 0.25s ease;" title="View Details & Photos">
            <i class="fas fa-eye"></i> Details
          </button>
        </div>
      </div>
    </div>`;
}

// Home page → "Best Sellers" grid (controlled by FEATURED_COUNT constant)
async function loadFeaturedProducts() {
  const FEATURED_COUNT = 8; // Change this single number to show more/fewer Best Sellers
  const grid = document.getElementById('featuredProducts') || document.getElementById('homeProducts') || document.querySelector('#best-sellers .product-grid') || document.querySelector('.featured-grid');
  if (!grid) return;

  try {
    await loadWishlistState();
    const res = await apiFetch('products/list.php');
    const products = Array.isArray(res) ? res : (res && res.data ? res.data : []);
    
    // Filter items with 'Bestseller' badge or fallback to top products, capped strictly by FEATURED_COUNT
    const bestSellers = products.filter(p => p.badge && p.badge.toLowerCase().includes('best'));
    let displayList = bestSellers.length ? bestSellers : products;
    if (displayList.length < FEATURED_COUNT && products.length > displayList.length) {
      const remaining = products.filter(p => !displayList.some(item => item.id === p.id));
      displayList = displayList.concat(remaining);
    }
    displayList = displayList.slice(0, FEATURED_COUNT);

    if (displayList && displayList.length) {
      grid.innerHTML = displayList.map(renderProductCard).join('');
    } else {
      grid.innerHTML = '<p style="text-align:center;color:#888;grid-column:1/-1;">No featured plants available.</p>';
    }
  } catch (err) {
    if (DEMO_MODE) {
      grid.innerHTML = DEMO_PRODUCTS.slice(0, FEATURED_COUNT).map(renderProductCard).join('');
    } else {
      grid.innerHTML = '<p style="text-align:center;color:#888;grid-column:1/-1;">' + esc(err.message) + '</p>';
    }
  }
}

// Helper for horizontal Best Sellers slider
window.slideBestSellers = function(dir) {
  const wrapper = document.querySelector('.best-sellers-slider-wrapper');
  if (!wrapper) return;
  const scrollAmount = 302 * dir;
  wrapper.scrollBy({ left: scrollAmount, behavior: 'smooth' });
};

let currentShopCategory = '';
let currentShopSearch = '';

async function filterShop(cat = '') {
  currentShopCategory = cat;
  updateActiveFilter(cat);
  await fetchAndRenderShopProducts();
}

async function searchShop() {
  const input = document.getElementById('searchInput');
  currentShopSearch = input ? input.value.trim() : '';
  await fetchAndRenderShopProducts();
}

async function fetchAndRenderShopProducts() {
  const grid = document.getElementById('shopGrid') || document.getElementById('shopProducts');
  if (!grid) return;

  grid.innerHTML = '<p style="text-align:center;color:#7c8878;padding:40px;grid-column:1/-1;">Loading plant collection... 🌿</p>';

  try {
    await loadWishlistState();
    const qs = new URLSearchParams();
    if (currentShopCategory) qs.set('category', currentShopCategory);
    if (currentShopSearch) qs.set('search', currentShopSearch);
    
    const res = await apiFetch('products/list.php?' + qs.toString());
    const products = Array.isArray(res) ? res : (res && res.data ? res.data : []);
    grid.innerHTML = (products && products.length)
      ? products.map(renderProductCard).join('')
      : '<p style="text-align:center;color:#888;padding:40px;grid-column:1/-1;">No plants found matching your selection.</p>';
  } catch (err) {
    grid.innerHTML = '<p style="text-align:center;color:#c0392b;padding:40px;grid-column:1/-1;">Could not load products: ' + esc(err.message) + '</p>';
  }
}

// Shop page → full grid with category + search filters
async function loadShopProducts() {
  const grid = document.getElementById('shopGrid') || document.getElementById('shopProducts');
  if (!grid) return;

  const params = new URLSearchParams(location.search);
  currentShopCategory = params.get('cat') || params.get('category') || '';
  currentShopSearch   = params.get('search') || '';
  const searchInput   = document.getElementById('searchInput');
  if (searchInput && currentShopSearch) searchInput.value = currentShopSearch;
  updateActiveFilter(currentShopCategory);
  await fetchAndRenderShopProducts();
}

// Shop page filter buttons (?cat=flowers etc.)
function setupShopFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.cat || '';
      filterShop(cat);
    });
  });

  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchShop();
    });
  }
}

function updateActiveFilter(category) {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', (btn.dataset.cat || '') === category);
  });
}

/* ── Product Detail Modal (click a card → full plant profile BEFORE purchase) ── */
async function openProductModal(id) {
  const overlay = document.getElementById('productModal');
  const body = document.getElementById('productModalBody');
  if (!overlay || !body) return;
  body.innerHTML = '<p style="text-align:center;padding:30px;">Loading plant details...</p>';
  overlay.classList.add('show');
  try {
    const p = await apiFetch('products/detail.php?id=' + id);
    renderProductDetail(p);
  } catch (err) {
    if (DEMO_MODE) {
      const demo = DEMO_PRODUCTS.find(p => p.id === Number(id));
      const p = demo || { id: id, name: 'Plant #' + id, price: 0, image: null, category: '' };
      p.scientific_name = p.scientific_name || 'Botanical Species';
      p.plant_age = p.plant_age || '1–2 Years';
      p.max_height = p.max_height || '30 – 45 cm';
      p.bloom_time = p.bloom_time || 'Seasonal Bloom';
      p.light_needs = p.light_needs || 'Bright Indirect Light';
      p.water_needs = p.water_needs || 'Weekly Watering';
      p.soil_type = p.soil_type || 'Well-Draining Potting Mix';
      p.care_level = p.care_level || 'Moderate';
      p.description = p.description || 'A vibrant addition to bring fresh life and natural beauty into your living space.';
      p.care_plan = demoCarePlan();
      renderProductDetail(p);
    } else {
      body.innerHTML = '<p style="color:#c0392b;text-align:center;">Could not load details: ' + esc(err.error || err.message) + '</p>';
    }
  }
}

function renderProductDetail(p) {
  window.__detailPlant = p;
  modalCurrentQty = 1;

  const gallery = [];
  if (p.image) gallery.push(p.image);
  if (p.image2) gallery.push(p.image2);
  if (p.image3) gallery.push(p.image3);
  if (p.reviews && p.reviews.length) {
    p.reviews.forEach(r => { if (r.image_url) gallery.push(r.image_url); });
  }
  if (!gallery.length) gallery.push(FALLBACK_IMG);

  const thumbsHtml = gallery.map((img, idx) => `
    <img src="${esc(img)}" onclick="setDetailMainImage(this.src)" 
         style="width:60px;height:60px;object-fit:cover;border-radius:10px;cursor:pointer;border:2px solid ${idx===0?'#17482f':'#e0eae3'};transition:.2s;box-shadow:0 2px 8px rgba(0,0,0,0.06);" 
         onmouseover="this.style.borderColor='#17482f'">
  `).join('');

  const careWeeks = (p.care_plan || []).map((w, i) =>
    `<button class="care-tab ${i === 0 ? 'active' : ''}" onclick="switchProductWeek(${i})" 
             style="padding:7px 16px;border-radius:999px;background:${i === 0 ? '#17482f' : '#f6f3ea'};color:${i === 0 ? '#fff' : '#23301f'};border:none;cursor:pointer;font-weight:600;font-size:0.88rem;">
       Week ${w.week_number}
     </button>`
  ).join('') || '<p style="color:#7c8878;font-size:0.9rem;">4-Week AI Care schedule loading...</p>';

  const reviewsList = (p.reviews || []).map(r => `
    <div style="background:#f9fcf9;border:1px solid #e2ece4;border-radius:12px;padding:12px;margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <span style="color:#c9a227;font-size:1rem;">${'★'.repeat(Math.max(1, Math.min(5, r.rating || 5)))}</span>
        <small style="color:#888;font-size:0.78rem;">${esc(r.created_at || 'Verified Buyer')}</small>
      </div>
      <p style="color:#3d4a3a;font-size:0.88rem;margin:4px 0;line-height:1.5;">${esc(r.comment)}</p>
      ${r.image_url ? `<img src="${esc(r.image_url)}" style="max-width:100px;border-radius:8px;margin-top:6px;display:block;">` : ''}
      <small style="color:#7c8878;font-weight:600;">— ${esc(r.name || 'Customer')}</small>
    </div>
  `).join('') || '<p style="color:#888;font-size:0.88rem;">No customer reviews yet. Be the first to review!</p>';

  const isAccessory = Number(p.category_id) === 3 || (p.category && String(p.category).toLowerCase().includes('accessories'));

  document.getElementById('productModalBody').innerHTML = `
    <div style="display:grid;grid-template-columns:320px 1fr;gap:26px;align-items:start;margin-bottom:24px;">
      <div>
        <div style="position:relative;border-radius:20px;overflow:hidden;background:#f6f9f6;box-shadow:0 12px 30px rgba(0,0,0,0.12);">
          <img id="detailMainImg" src="${esc(gallery[0])}" style="width:100%;height:310px;object-fit:cover;display:block;transition:all 0.3s ease;">
          ${p.badge ? `<span style="position:absolute;top:12px;left:12px;background:#c9a227;color:#fff;padding:4px 14px;border-radius:999px;font-size:0.75rem;font-weight:700;letter-spacing:0.5px;box-shadow:0 4px 12px rgba(0,0,0,0.15);">${esc(p.badge)}</span>` : ''}
        </div>
        ${gallery.length > 1 ? `<div style="display:flex;gap:8px;margin-top:12px;overflow-x:auto;padding-bottom:4px;">${thumbsHtml}</div>` : ''}
      </div>

      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="color:#c9a227;font-size:0.82rem;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">${esc(p.category || (isAccessory ? 'Accessory' : 'Plant Profile'))}</span>
          <span style="background:${(p.stock||0) > 0 ? '#e8f5e9' : '#ffebee'};color:${(p.stock||0) > 0 ? '#2e7d4f' : '#c0392b'};padding:3px 10px;border-radius:999px;font-size:0.78rem;font-weight:700;">
            ${(p.stock||0) > 0 ? `In Stock (${p.stock} available)` : 'Out of Stock'}
          </span>
        </div>
        <h2 style="font-family:'Playfair Display',serif;font-size:2rem;color:#17482f;margin:6px 0 4px;line-height:1.2;">${esc(p.name)}</h2>
        ${!isAccessory && p.scientific_name ? `<p style="color:#2D6A4F;font-style:italic;font-size:1rem;margin-bottom:14px;font-weight:500;">🌿 ${esc(p.scientific_name)}</p>` : ''}

        <div style="font-size:1.6rem;font-weight:700;color:#17482f;margin-bottom:14px;display:flex;align-items:center;gap:12px;">
          <span>${formatINR(p.price)}</span>
          ${p.old_price ? `<s style="color:#999;font-size:1.05rem;font-weight:400;">${formatINR(p.old_price)}</s>` : ''}
          ${p.old_price ? `<span style="background:#2e7d4f;color:#fff;font-size:0.72rem;padding:2px 8px;border-radius:6px;font-weight:700;">SAVE ${Math.round((1 - p.price/p.old_price)*100)}%</span>` : ''}
        </div>

        <p style="color:#4a5746;font-size:0.95rem;line-height:1.65;margin-bottom:18px;">${esc(p.description || 'Handpicked premium botanical product with guaranteed quality.')}</p>

        <div style="display:flex;gap:12px;align-items:center;margin-bottom:15px;flex-wrap:wrap;">
          <div style="display:inline-flex;align-items:center;border:1px solid #17482f;border-radius:999px;padding:4px 12px;background:#fff;">
            <button onclick="changeModalQty(-1)" style="border:none;background:none;font-size:1.2rem;font-weight:bold;cursor:pointer;color:#17482f;padding:0 8px;">−</button>
            <span id="modalQtyVal" style="font-weight:700;font-size:1rem;padding:0 8px;min-width:24px;text-align:center;">1</span>
            <button onclick="changeModalQty(1)" style="border:none;background:none;font-size:1.2rem;font-weight:bold;cursor:pointer;color:#17482f;padding:0 8px;">+</button>
          </div>
          <button onclick="addModalToCart(${p.id})" style="flex:1;min-width:170px;background:#17482f;color:#fff;border:none;padding:14px 22px;border-radius:999px;font-size:1rem;font-weight:700;cursor:pointer;box-shadow:0 6px 20px rgba(23,72,47,0.25);">
            <i class="fas fa-shopping-bag"></i> Add to Cart
          </button>
          <button onclick="buyNowModal(${p.id})" style="background:#c9a227;color:#fff;border:none;padding:14px 22px;border-radius:999px;font-size:1rem;font-weight:700;cursor:pointer;box-shadow:0 6px 20px rgba(201,162,39,0.25);">
            ⚡ Buy Now
          </button>
        </div>
      </div>
    </div>

    ${!isAccessory ? `
    <div style="background:#f4f8f5;border:1px solid #d4e4d6;border-radius:18px;padding:18px;margin-bottom:24px;">
      <h4 style="font-family:'Playfair Display',serif;color:#17482f;margin-bottom:12px;font-size:1.15rem;">🌱 Botanical Care Profile</h4>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;">
        <div style="background:#fff;padding:10px 14px;border-radius:12px;border:1px solid #e2ede4;"><span style="color:#7c8878;font-size:0.78rem;display:block;">Plant Age</span><strong style="color:#17482f;font-size:0.92rem;">${esc(p.plant_age || '1–2 Years')}</strong></div>
        <div style="background:#fff;padding:10px 14px;border-radius:12px;border:1px solid #e2ede4;"><span style="color:#7c8878;font-size:0.78rem;display:block;">Max Height</span><strong style="color:#17482f;font-size:0.92rem;">${esc(p.max_height || '30 – 45 cm')}</strong></div>
        <div style="background:#fff;padding:10px 14px;border-radius:12px;border:1px solid #e2ede4;"><span style="color:#7c8878;font-size:0.78rem;display:block;">Bloom Time</span><strong style="color:#17482f;font-size:0.92rem;">${esc(p.bloom_time || 'Seasonal Bloom')}</strong></div>
        <div style="background:#fff;padding:10px 14px;border-radius:12px;border:1px solid #e2ede4;"><span style="color:#7c8878;font-size:0.78rem;display:block;">Sunlight</span><strong style="color:#17482f;font-size:0.92rem;">${esc(p.light_needs || 'Bright Indirect')}</strong></div>
        <div style="background:#fff;padding:10px 14px;border-radius:12px;border:1px solid #e2ede4;"><span style="color:#7c8878;font-size:0.78rem;display:block;">Watering</span><strong style="color:#17482f;font-size:0.92rem;">${esc(p.water_needs || 'Weekly')}</strong></div>
        <div style="background:#fff;padding:10px 14px;border-radius:12px;border:1px solid #e2ede4;"><span style="color:#7c8878;font-size:0.78rem;display:block;">Soil Type</span><strong style="color:#17482f;font-size:0.92rem;">${esc(p.soil_type || 'Well-Draining Mix')}</strong></div>
        <div style="background:#fff;padding:10px 14px;border-radius:12px;border:1px solid #e2ede4;"><span style="color:#7c8878;font-size:0.78rem;display:block;">Care Level</span><strong style="color:#17482f;font-size:0.92rem;">${esc(p.care_level || 'Moderate')}</strong></div>
      </div>
    </div>

    <div style="margin-bottom:24px;">
      <h3 style="font-family:'Playfair Display',serif;color:#17482f;font-size:1.25rem;margin-bottom:12px;">📅 4-Week AI Care Schedule</h3>
      <div class="care-tabs" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">${careWeeks}</div>
      <div id="productCareContent" style="background:#faf8f2;border:1px solid #e7e2d3;border-radius:16px;padding:18px;line-height:1.6;color:#3d4a3a;">
        ${renderProductWeek(p, 0)}
      </div>
    </div>
    ` : ''}

    <div>
      <h3 style="font-family:'Playfair Display',serif;color:#17482f;font-size:1.25rem;margin-bottom:12px;">⭐ Customer Reviews & Feedback</h3>
      ${reviewsList}
    </div>
  `;
}

function setDetailMainImage(src) {
  const main = document.getElementById('detailMainImg');
  if (main) main.src = src;
}

function renderProductWeek(p, idx) {
  const w = (p.care_plan || [])[idx];
  if (!w) return '<p style="color:#777;font-size:0.9rem;">Care instructions coming soon for this plant.</p>';
  return '<h4 style="margin:4px 0 8px;color:#17482f;font-weight:700;">' + esc(w.title) + '</h4><p style="line-height:1.65;color:#3d4a3a;font-size:0.92rem;">' + esc(w.content) + '</p>';
}

function switchProductWeek(idx) {
  document.querySelectorAll('#productModal .care-tab').forEach((t, i) => {
    t.style.background = (i === idx) ? '#17482f' : '#f6f3ea';
    t.style.color = (i === idx) ? '#fff' : '#23301f';
  });
  const el = document.getElementById('productCareContent');
  if (el && window.__detailPlant) el.innerHTML = renderProductWeek(window.__detailPlant, idx);
}

var modalCurrentQty = 1;
function changeModalQty(delta) {
  modalCurrentQty = Math.max(1, modalCurrentQty + delta);
  const el = document.getElementById('modalQtyVal');
  if (el) el.textContent = modalCurrentQty;
}

async function addModalToCart(productId) {
  const qty = modalCurrentQty || 1;
  const user = getStoredUser();
  if (!user) {
    showToast('Please login to add items to your cart', 'error');
    setTimeout(() => { location.href = 'login.html'; }, 1000);
    return;
  }
  try {
    await apiFetch('cart/add.php', {
      method: 'POST',
      body: JSON.stringify({ product_id: Number(productId), quantity: qty })
    });
    showToast('Added ' + qty + ' item(s) to cart 🌿');
    updateCartCount();
    closeProductModal();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function buyNowModal(productId) {
  await addModalToCart(productId);
  setTimeout(() => { location.href = 'checkout.html'; }, 400);
}


function closeProductModal() {
  const overlay = document.getElementById('productModal');
  if (overlay) overlay.classList.remove('show');
}

function quickAddToCart(productId) {
  addToCart(productId);
  closeProductModal();
}

/* ─────────────────────────── 5. CART ───────────────────────────────────────── */

// Add to cart (requires login — cart is stored per-user in the DB)
async function addToCart(productId) {
  const user = getStoredUser();
  if (!user) {
    showToast('Please login to add items to your cart', 'error');
    setTimeout(() => { location.href = 'login.html'; }, 1200);
    return;
  }
  try {
    await apiFetch('cart/add.php', {
      method: 'POST',
      body: JSON.stringify({ product_id: Number(productId), quantity: 1 })
    });
    showToast('Added to cart 🌿');
    updateCartCount();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Navbar badge (number of items in cart)
async function updateCartCount() {
  const badge = document.getElementById('cartCount');
  if (!badge) return;
  const user = getStoredUser();
  if (!user) { badge.textContent = '0'; return; }

  try {
    const data = await apiFetch('cart/get.php');
    badge.textContent = data.items.reduce((s, i) => s + i.quantity, 0);
  } catch {
    badge.textContent = '0';
  }
}

// Cart page → render items + order summary
async function loadCartPage() {
  if (typeof window.loadCart === 'function') {
    return window.loadCart();
  }

  const container = document.getElementById('cartItems') || document.querySelector('.cart-items');
  if (!container) return;

  const user = getStoredUser();
  if (!user) {
    container.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>Please <a href="login.html" style="color:#2D6A4F;">login</a> to view your cart.</p></div>';
    return;
  }

  try {
    const data = await apiFetch('cart/get.php');
    const items = data.items || [];
    const subtotal = data.subtotal || 0;

    const freeShipThreshold = 10000;
    const progressPercent = Math.min(100, Math.round((subtotal / freeShipThreshold) * 100));
    const amountNeeded = Math.max(0, freeShipThreshold - subtotal);
    const isUnlocked = subtotal >= freeShipThreshold;

    const shipProgressHtml = `
      <div class="free-ship-banner">
        <div class="free-ship-header">
          <div class="free-ship-title">
            <span class="truck-icon">${isUnlocked ? '🚚💨' : '🚚'}</span>
            <span>${isUnlocked ? '🎉 Congratulations! FREE Delivery Unlocked!' : 'Add ' + formatINR(amountNeeded) + ' more for FREE Delivery!'}</span>
          </div>
          <div class="radius-badge">
            <span class="radar-dot"></span>
            <span>📍 Within 50 KM Radius Guaranteed</span>
          </div>
        </div>

        <div class="progress-bar-track">
          <div class="progress-bar-fill" style="width:${progressPercent}%;"></div>
        </div>

        <div class="free-ship-footer">
          <span>${isUnlocked ? '✨ Qualified for Free Express Shipping over Rs. 10,000' : 'Spend Rs. 10,000 for FREE Local Delivery'}</span>
          <span style="color:${isUnlocked ? '#17482f' : '#c9a227'};font-weight:700;font-size:0.9rem;">${progressPercent}% Complete</span>
        </div>
      </div>
    `;

    if (!items.length) {
      container.innerHTML = shipProgressHtml + '<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>Your cart is empty.</p><a href="shop.html" class="btn-primary" style="margin-top:15px;display:inline-block;">Shop Now</a></div>';
      const summary = document.querySelector('.cart-summary');
      if (summary) summary.innerHTML = '';
      return;
    }

    container.innerHTML = shipProgressHtml + items.map(item => `
      <div class="cart-item">
        <img class="cart-item-img" src="${item.image}" alt="${item.name}">
        <div class="cart-item-info">
          <h3>${item.name}</h3>
          <p>${item.category || ''}</p>
          <span class="cart-item-price">${formatINR(item.price)}</span>
        </div>
        <div class="cart-item-qty">
          <button class="qty-btn" data-id="${item.id}" data-delta="-1">−</button>
          <span>${item.quantity}</span>
          <button class="qty-btn" data-id="${item.id}" data-delta="1">+</button>
        </div>
        <a class="remove-item" data-id="${item.id}">Remove</a>
      </div>
    `).join('');

    renderCartSummary(data.subtotal, data.shipping, data.total);
  } catch (err) {
    container.innerHTML = '<p style="text-align:center;color:#dc3545;padding:40px;">' + err.message + '</p>';
  }
}

function renderCartSummary(subtotal, shipping, total) {
  const summary = document.querySelector('.cart-summary');
  if (!summary) return;
  summary.innerHTML = `
    <h3>Order Summary</h3>
    <div class="summary-row"><span>Subtotal</span><span>${formatINR(subtotal)}</span></div>
    <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? 'FREE' : formatINR(shipping)}</span></div>
    <div class="summary-row total"><span>Total</span><span>${formatINR(total)}</span></div>
    <button class="checkout-btn">Proceed to Checkout</button>`;

  const checkoutBtn = summary.querySelector('.checkout-btn');
  if (checkoutBtn) checkoutBtn.addEventListener('click', () => { location.href = 'checkout.html'; });
}

// Quantity +/− buttons on the cart page
async function changeQty(itemId, delta) {
  const qtyRow = document.querySelector(`.qty-btn[data-id="${itemId}"]`)?.closest('.cart-item-qty');
  const current = qtyRow ? parseInt(qtyRow.querySelector('span').textContent) : 1;
  const newQty = current + delta;

  if (newQty < 1) { removeFromCart(itemId); return; }

  try {
    await apiFetch('cart/update.php', {
      method: 'PUT',
      body: JSON.stringify({ item_id: Number(itemId), quantity: newQty })
    });
    loadCartPage();
    updateCartCount();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function removeFromCart(itemId) {
  try {
    await apiFetch('cart/remove.php?item_id=' + itemId, { method: 'DELETE' });
    showToast('Item removed');
    loadCartPage();
    updateCartCount();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ─────────────────────────── 6. CHECKOUT / ORDERS ──────────────────────────── */

async function loadCheckoutPage() {
  const summaryBox = document.getElementById('checkoutSummaryItems');
  if (!summaryBox) return;

  const user = getStoredUser();
  if (!user) {
    showToast('Please login to continue checkout', 'error');
    setTimeout(() => { location.href = 'login.html'; }, 1000);
    return;
  }

  // Pre-fill user details if available
  if (user.name)  { const el = document.getElementById('checkoutName');  if (el && !el.value) el.value = user.name; }
  if (user.email) { const el = document.getElementById('checkoutEmail'); if (el && !el.value) el.value = user.email; }
  if (user.phone) { const el = document.getElementById('checkoutPhone'); if (el && !el.value) el.value = user.phone; }

  try {
    const data = await apiFetch('cart/get.php');
    const items = data.items || [];
    if (!items.length) {
      summaryBox.innerHTML = '<p style="color:#666;padding:10px 0;">Your cart is empty.</p>';
      setTimeout(() => { location.href = 'cart.html'; }, 1500);
      return;
    }

    summaryBox.innerHTML = items.map(item => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px dashed #eee;">
        <div style="display:flex;align-items:center;gap:10px;">
          <img src="${item.image}" alt="${esc(item.name)}" style="width:44px;height:44px;object-fit:cover;border-radius:8px;">
          <div>
            <div style="font-weight:600;font-size:0.9rem;color:#17482f;">${esc(item.name)}</div>
            <div style="font-size:0.8rem;color:#666;">Qty: ${item.quantity} × ${formatINR(item.price)}</div>
          </div>
        </div>
        <div style="font-weight:700;font-size:0.9rem;color:#17482f;">${formatINR(item.price * item.quantity)}</div>
      </div>
    `).join('');

    window.checkoutSubtotalRaw = data.subtotal || 0;
    window.checkoutShippingRaw = data.shipping || 0;

    const subtotalEl = document.getElementById('checkoutSubtotal');
    const shippingEl = document.getElementById('checkoutShipping');
    const totalEl    = document.getElementById('checkoutTotal');

    if (subtotalEl) subtotalEl.textContent = formatINR(data.subtotal);
    if (shippingEl) shippingEl.textContent = data.shipping === 0 ? 'Free' : formatINR(data.shipping);
    if (totalEl)    totalEl.textContent    = formatINR(data.total);

    await loadCheckoutCoupons();

    const autoCoupon = new URLSearchParams(window.location.search).get('coupon');
    if (autoCoupon) {
      applyCheckoutCoupon(autoCoupon);
    }
  } catch (err) {
    summaryBox.innerHTML = '<p style="color:#dc3545;padding:10px 0;">Could not load cart summary.</p>';
  }
}

window.appliedCheckoutCoupon = null;
window.checkoutSubtotalRaw = 0;
window.checkoutShippingRaw = 0;

async function loadCheckoutCoupons() {
  const container = document.getElementById('availableCouponsPills');
  if (!container) return;

  try {
    const res = await apiFetch('coupons/active.php');
    const coupons = Array.isArray(res) ? res : ((res && res.coupons) ? res.coupons : (res && res.data && res.data.coupons ? res.data.coupons : []));

    if (!coupons.length) {
      container.innerHTML = '<span style="font-size:0.75rem;color:#888;">No active promo codes right now.</span>';
      return;
    }

    container.innerHTML = coupons.map(c => {
      const discountTag = c.discount_percent > 0 ? `${parseFloat(c.discount_percent)}% OFF` : `Rs. ${parseFloat(c.discount_amount)} OFF`;
      const minText = c.min_spend > 0 ? ` (Min Rs. ${parseFloat(c.min_spend)})` : '';
      return `
        <button type="button" class="coupon-pill-btn" data-code="${esc(c.code)}" onclick="applyCheckoutCoupon('${esc(c.code)}')" style="background:#f4f9f5;border:1.5px dashed #17482f;color:#17482f;padding:5px 12px;border-radius:999px;font-size:0.78rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;transition:0.2s;box-shadow:0 2px 5px rgba(0,0,0,0.03);" title="Click to apply ${esc(c.code)}">
          🏷️ <b>${esc(c.code)}</b> (${discountTag}${minText})
        </button>
      `;
    }).join('');

    container.querySelectorAll('.coupon-pill-btn').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        const code = this.getAttribute('data-code');
        if (code) applyCheckoutCoupon(code);
      });
    });
  } catch (err) {
    container.innerHTML = '<span style="font-size:0.75rem;color:#888;">Store coupons available</span>';
  }
}

async function applyCheckoutCoupon(codeOverride) {
  const inputEl = document.getElementById('couponCodeInput');
  const msgEl = document.getElementById('couponStatusMsg');
  const code = (codeOverride || (inputEl ? inputEl.value : '')).trim().toUpperCase();

  if (!code) {
    if (msgEl) {
      msgEl.style.color = '#c0392b';
      msgEl.textContent = 'Please enter or select a promo code';
    }
    return;
  }

  if (inputEl) inputEl.value = code;

  // Reliable Subtotal Fallback Extraction
  let subtotal = window.checkoutSubtotalRaw || 0;
  if (!subtotal) {
    try {
      const cartData = await apiFetch('cart/get.php');
      subtotal = cartData.subtotal || 0;
      window.checkoutSubtotalRaw = subtotal;
      window.checkoutShippingRaw = cartData.shipping || 0;
    } catch {}
  }
  if (!subtotal) {
    const text = (document.getElementById('checkoutSubtotal') || {}).textContent || '';
    const m = text.match(/[\d,.]+/);
    if (m) subtotal = parseFloat(m[0].replace(/,/g, '')) || 0;
  }

  try {
    const res = await apiFetch('coupons/validate.php', {
      method: 'POST',
      body: { code: code, subtotal: subtotal }
    });

    const couponData = res.data || res;
    window.appliedCheckoutCoupon = couponData;

    if (msgEl) {
      msgEl.style.color = '#2e7d4f';
      msgEl.innerHTML = `🎉 Coupon <b>${esc(couponData.code)}</b> applied! (-${formatINR(couponData.discount_amount)})`;
    }

    // Update Checkout UI
    const discountRow = document.getElementById('checkoutDiscountRow');
    const discountEl = document.getElementById('checkoutDiscount');
    const totalEl = document.getElementById('checkoutTotal');

    if (discountRow && discountEl) {
      discountRow.style.display = 'flex';
      discountEl.textContent = '-' + formatINR(couponData.discount_amount);
    }

    const shipping = window.checkoutShippingRaw !== undefined ? window.checkoutShippingRaw : (subtotal >= 10000 ? 0 : 350);
    const finalTotal = Math.max(0, subtotal + shipping - couponData.discount_amount);
    if (totalEl) totalEl.textContent = formatINR(finalTotal);

    showToast(`Promo code '${couponData.code}' applied successfully! 🎉`);
  } catch (err) {
    window.appliedCheckoutCoupon = null;
    const discountRow = document.getElementById('checkoutDiscountRow');
    const totalEl = document.getElementById('checkoutTotal');

    if (discountRow) discountRow.style.display = 'none';
    const shipping = window.checkoutShippingRaw !== undefined ? window.checkoutShippingRaw : (subtotal >= 10000 ? 0 : 350);
    if (totalEl) totalEl.textContent = formatINR(subtotal + shipping);

    if (msgEl) {
      msgEl.style.color = '#c0392b';
      msgEl.textContent = '❌ ' + (err.message || 'Invalid coupon code');
    }
  }
}
window.applyCheckoutCoupon = applyCheckoutCoupon;

async function handleCheckout(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (handleCheckout._isSubmitting) return;

  const user = getStoredUser();
  if (!user) { location.href = 'login.html'; return; }

  const name    = (document.getElementById('checkoutName')    || {}).value || user.name || '';
  const email   = (document.getElementById('checkoutEmail')   || {}).value || user.email || '';
  const phone   = (document.getElementById('checkoutPhone')   || {}).value || user.phone || '';
  const address = (document.getElementById('shipAddress')     || {}).value || '';
  const city    = (document.getElementById('checkoutCity')    || {}).value || '';
  const pincode = (document.getElementById('checkoutPincode') || {}).value || '';

  const paymentRadio = document.querySelector('input[name="payment_method_radio"]:checked');
  const payment = paymentRadio ? paymentRadio.value : 'cod';

  if (!name || !phone || !address || !city || !pincode) {
    showToast('Please fill in all shipping details', 'error');
    return;
  }

  handleCheckout._isSubmitting = true;

  let items = [];
  try {
    const cart = await apiFetch('cart/get.php');
    items = (cart.items || []).map(i => ({ product_id: i.product_id, quantity: i.quantity }));
  } catch {
    items = JSON.parse(localStorage.getItem('cart') || '[]').map(i => ({
      product_id: i.product_id, quantity: i.quantity
    }));
  }

  if (!items.length) {
    showToast('Your cart is empty', 'error');
    handleCheckout._isSubmitting = false;
    return;
  }

  const btn = document.getElementById('placeOrderBtn') || (e && e.target ? e.target.querySelector('button[type="submit"]') : null);
  const origText = btn ? btn.innerHTML : 'Place Order';
  if (btn) { btn.disabled = true; btn.innerHTML = 'Placing order… <i class="fas fa-spinner fa-spin"></i>'; }

  try {
    const resData = await apiFetch('orders/create.php', {
      method: 'POST',
      body: JSON.stringify({
        name, email, phone, address, city, pincode,
        payment_method: payment,
        coupon_code: window.appliedCheckoutCoupon ? window.appliedCheckoutCoupon.code : '',
        items
      })
    });

    const orderId = (resData && (resData.order_id || (resData.data && resData.data.order_id))) || 'New';
    showToast('Order placed successfully! Order #BB-' + orderId + ' 🎉');

    // Clear server cart
    try {
      const cart = await apiFetch('cart/get.php');
      for (const item of cart.items) {
        await apiFetch('cart/remove.php?item_id=' + item.id, { method: 'DELETE' }).catch(() => {});
      }
    } catch {}
    localStorage.removeItem('cart');
    updateCartCount();

    // Redirect customer to dashboard where real-time order tracking & purchased plants appear immediately
    setTimeout(() => { location.href = 'dashboard.html'; }, 1000);
  } catch (err) {
    showToast(err.error || err.message || 'Could not place order', 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = origText; }
  } finally {
    handleCheckout._isSubmitting = false;
  }
}

/* ─────────────────────────── 7. MY GARDEN ──────────────────────────────────── */

async function loadMyPlants() {
  const grid = document.querySelector('.my-plants-grid') || document.getElementById('myPlantsList');
  if (!grid) return;

  const user = getStoredUser();
  if (!user) {
    grid.innerHTML = '<p style="text-align:center;color:#888;">Login to see your garden.</p>';
    return;
  }

  const statusEmoji = { healthy: '🌿', needs_attention: '⚠️', diseased: '🍂' };
  const statusColor = { healthy: '#2D6A4F', needs_attention: '#b7791f', diseased: '#dc3545' };

  try {
    const res = await apiFetch('garden/my-plants.php');
    const plants = (res && (res.plants || res.data || res.purchases || (Array.isArray(res) ? res : []))) || [];
    if (!plants.length) {
      grid.innerHTML = '<p style="text-align:center;color:#888;">No plants yet — buy a plant from the <a href="shop.html">shop</a>!</p>';
      return;
    }
    grid.innerHTML = plants.map(p => {
      const pname = p.plant_name || p.name || 'Plant';
      const img   = p.image_url || p.image || null;
      return `
      <div class="plant-card-owned">
        ${img ? '<img src="' + esc(img) + '" style="width:100%;height:140px;object-fit:cover;border-radius:10px;">' : '<div class="plant-icon">' + (statusEmoji[p.health_status] || '🌿') + '</div>'}
        <h3>${esc(pname)}</h3>
        <p>${esc(p.species || '')}</p>
        <span class="health-badge" style="color:${statusColor[p.health_status] || '#555'};">
          ${esc(String(p.health_status || 'healthy').replace('_', ' '))}
        </span>
      </div>`;
    }).join('');
  } catch (err) {
    if (DEMO_MODE) {
      grid.innerHTML = DEMO_PLANTS.map(p => `
        <div class="plant-card-owned">
          <div class="plant-icon">${statusEmoji[p.health_status] || '🌿'}</div>
          <h3>${esc(p.plant_name)}</h3>
          <p>${esc(p.species || '')}</p>
          <span class="health-badge ${p.health_status === 'healthy' ? 'healthy' : 'diseased'}">
            ${esc(p.health_status.replace('_', ' '))}
          </span>
        </div>
      `).join('');
    } else {
      grid.innerHTML = '<p style="text-align:center;color:#dc3545;">' + err.message + '</p>';
    }
  }
}

/* ── AI Plant Scan (upload area on My Garden page) ── */
function setupUpload() {
  const fileInput  = document.getElementById('fileInput');
  const uploadArea = document.querySelector('.upload-area');
  if (!fileInput) return;

  // Only attach click if the area doesn't already have an inline onclick
  if (uploadArea && !uploadArea.getAttribute('onclick')) {
    uploadArea.addEventListener('click', () => fileInput.click());
  }

  if (uploadArea) {
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = 'var(--primary)';
      uploadArea.style.background  = 'var(--lighter)';
    });
    uploadArea.addEventListener('dragleave', () => {
      uploadArea.style.borderColor = '';
      uploadArea.style.background  = '';
    });
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = '';
      uploadArea.style.background  = '';
      if (e.dataTransfer.files.length) handleScan(e.dataTransfer.files[0]);
    });
  }

  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleScan(fileInput.files[0]);
  });
}

// Compatibility: pages with inline onchange="handleFileUpload(event)" or handleImageScan(event)
function handleFileUpload(event) {
  const file = event ? (event.target ? event.target.files[0] : event) : null;
  if (file) handleScan(file);
}
window.handleImageScan = handleFileUpload;

// Compatibility: pages with inline onclick="triggerFileUpload()"
function triggerFileUpload() {
  const input = document.getElementById('fileInput');
  if (input) input.click();
}

async function handleScan(file) {
  const resultBox = document.querySelector('.ai-result') || document.getElementById('aiResult');
  if (!resultBox) return;

  if (!file.type.startsWith('image/')) { showToast('Please upload an image file', 'error'); return; }
  if (file.size > 10 * 1024 * 1024)    { showToast('Image must be under 10MB', 'error'); return; }

  const previewImg = document.getElementById('uploadPreview');
  if (previewImg) {
    previewImg.src = URL.createObjectURL(file);
    previewImg.style.display = 'block';
  }

  resultBox.style.display = 'block';
  resultBox.innerHTML = `
    <div style="text-align:center;padding:25px;">
      <i class="fas fa-spinner fa-spin" style="font-size:2.2rem;color:#17482f;margin-bottom:12px;"></i>
      <h3 style="color:#17482f;font-family:'Playfair Display',serif;">Scanning Plant Foliage with Custom AI Model... 🔬</h3>
      <p style="color:#7c8878;font-size:0.9rem;">Evaluating leaf features across 25 botanical species &amp; disease classes...</p>
    </div>
  `;

  const formData = new FormData();
  formData.append('image', file);

  try {
    const res = await apiFetch('ai/diagnose.php', {
      method: 'POST', body: formData, formdata: true
    });
    const d = (res && res.diagnosis) ? res.diagnosis : res;
    const sourceLabel = res.source || d.source || 'Custom Fine-Tuned 25-Class Model (97.79% Acc)';

    const disease = d.disease_name || 'Healthy Foliage';
    const sciName = d.scientific_name || 'Botanical Specimen';
    const severity = d.severity || 'Low';
    const conf = d.confidence || '94%';
    const symptoms = d.symptoms_observed || [];
    const treatment = d.treatment_plan || [];
    const action = d.recommended_action || '';

    resultBox.innerHTML = `
      <div style="background:#fff;border:1px solid #cce3d2;border-radius:18px;padding:22px;box-shadow:0 8px 24px rgba(14,42,26,0.06);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
          <span style="background:#17482f;color:#fff;padding:4px 14px;border-radius:999px;font-size:0.75rem;font-weight:700;">🤖 ${esc(sourceLabel)}</span>
          <span style="background:${severity === 'High' ? '#f8d7da' : (severity === 'Moderate' ? '#fff3cd' : '#d1e7dd')};color:${severity === 'High' ? '#721c24' : (severity === 'Moderate' ? '#856404' : '#0f5132')};padding:4px 14px;border-radius:999px;font-size:0.78rem;font-weight:700;">
            Severity: ${esc(severity)} (${esc(conf)})
          </span>
        </div>

        <h3 style="font-family:'Playfair Display',serif;color:#17482f;margin-bottom:4px;font-size:1.45rem;">${esc(disease)}</h3>
        <p style="color:#52B788;font-weight:600;font-size:0.88rem;font-style:italic;margin-bottom:14px;">🌿 Pathogen: ${esc(sciName)}</p>

        ${symptoms.length ? `
          <div style="margin-bottom:14px;">
            <strong style="color:#17482f;font-size:0.9rem;">🔍 Observed Diagnostic Symptoms:</strong>
            <ul style="margin:6px 0 0 20px;color:#4a5746;font-size:0.88rem;">
              ${symptoms.map(s => `<li style="margin-bottom:4px;">${esc(s)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${treatment.length ? `
          <div style="background:#f4f8f5;border-left:4px solid #17482f;padding:14px 16px;border-radius:0 12px 12px 0;margin-bottom:14px;">
            <strong style="color:#17482f;display:block;margin-bottom:6px;font-size:0.92rem;">💊 Prescribed Treatment &amp; Remedy:</strong>
            <ol style="margin:0 0 0 20px;color:#3d4a3a;font-size:0.88rem;line-height:1.6;">
              ${treatment.map(t => `<li style="margin-bottom:4px;">${esc(t)}</li>`).join('')}
            </ol>
          </div>
        ` : ''}

        ${action ? `
          <div style="background:#fff9e6;border:1px solid #ffe599;padding:10px 14px;border-radius:10px;font-size:0.85rem;color:#8a6a11;font-weight:600;">
            ⚡ Recommended Store Remedy: ${esc(action)}
          </div>
        ` : ''}
      </div>
    `;
    showToast('Plant foliage diagnosis completed! 🩺');
  } catch (err) {
    resultBox.innerHTML = '<p style="color:#dc3545;padding:15px;">Diagnosis Failed: ' + esc(err.message) + '</p>';
  }
}

/* ─────────────────────────── 8. GARDEN DESIGNER (AI) ───────────────────────── */

function setupDesigner() {
  const form = document.getElementById('designerForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = getStoredUser();
    if (!user) {
      showToast('Please login to use the Garden Designer', 'error');
      location.href = 'login.html';
      return;
    }

    const fileInput  = document.getElementById('gardenImage');
    const styleInput = document.getElementById('designStyle');
    const promptInput = document.getElementById('designPrompt');

    const resultBox = document.querySelector('.designer-result') || document.getElementById('designerResult');
    if (resultBox) {
      resultBox.innerHTML = '<div class="placeholder" style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin" style="font-size:2.5rem;color:#17482f;margin-bottom:12px;"></i><h3 style="color:#17482f;">Designing your dream garden… 🎨</h3><p style="color:#7c8878;">Generating AI visual layout, spatial placement map, and botanical selection...</p></div>';
    }

    const formData = new FormData();
    let userImgUrl = null;
    if (fileInput && fileInput.files[0]) {
      formData.append('image', fileInput.files[0]);
      userImgUrl = URL.createObjectURL(fileInput.files[0]);
    }
    formData.append('style', styleInput ? styleInput.value : 'tropical');
    formData.append('prompt', promptInput ? promptInput.value : '');

    try {
      const r = await apiFetch('ai/designer.php', {
        method: 'POST', body: formData, formdata: true
      });
      if (!resultBox) return;
      renderRichDesignResult(resultBox, styleInput ? styleInput.value : 'tropical', r.plan, userImgUrl || (r.data && r.data.source_image_url), r.generated_image);
    } catch (err) {
      if (resultBox) {
        renderRichDesignResult(resultBox, styleInput ? styleInput.value : 'tropical', null, userImgUrl, null);
      }
    }
  });
}

function renderRichDesignResult(container, style, rawPlan, userImg, generatedImgUrl) {
  const styleNames = {
    tropical: '🌺 Tropical Paradise Oasis',
    bonsai: '⛩️ Zen Bonsai & Stone Sanctuary',
    minimalist: '🌿 Minimalist Modern Indoor Garden',
    maximalist: '🌸 Lush Blooming Cottage Patio'
  };

  const generatedImages = {
    tropical: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=1000',
    bonsai: 'https://images.unsplash.com/photo-1562408590-e32931084e23?w=1000',
    minimalist: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=1000',
    maximalist: 'https://images.unsplash.com/photo-1496062031456-07b8f162a322?w=1000'
  };

  const conceptImage = generatedImgUrl || generatedImages[style] || generatedImages.tropical;

  const plantSuggestions = {
    tropical: [
      { id: 2, name: 'Anthurium', price: 499, img: 'https://images.unsplash.com/photo-1446071103084-c257b5f70672?w=300', tag: 'High Light Zone' },
      { id: 1, name: 'Red Rose', price: 299, img: 'https://images.unsplash.com/photo-1496062031456-07b8f162a322?w=300', tag: 'Direct Sun Spot' },
      { id: 6, name: 'Hibiscus', price: 279, img: 'https://images.unsplash.com/photo-1520763185298-1b434c919102?w=300', tag: 'Balcony Corner' }
    ],
    bonsai: [
      { id: 9, name: 'Ficus Bonsai (Ginseng)', price: 1299, img: 'https://images.unsplash.com/photo-1562408590-e32931084e23?w=300', tag: 'Focal Centerpiece' },
      { id: 8, name: 'Juniper Bonsai', price: 1499, img: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=300', tag: 'Morning Light' },
      { id: 7, name: 'Peace Lily', price: 399, img: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=300', tag: 'Low Light Base' }
    ],
    minimalist: [
      { id: 7, name: 'Peace Lily', price: 399, img: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=300', tag: 'Filtered Light' },
      { id: 9, name: 'Ficus Bonsai', price: 1299, img: 'https://images.unsplash.com/photo-1562408590-e32931084e23?w=300', tag: 'Indoor Decor' }
    ],
    maximalist: [
      { id: 1, name: 'Red Rose', price: 299, img: 'https://images.unsplash.com/photo-1496062031456-07b8f162a322?w=300', tag: 'Full Sun' },
      { id: 2, name: 'Anthurium', price: 499, img: 'https://images.unsplash.com/photo-1446071103084-c257b5f70672?w=300', tag: 'Accent Flower' },
      { id: 8, name: 'Juniper Bonsai', price: 1499, img: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=300', tag: 'Feature Tree' }
    ]
  };

  const recs = plantSuggestions[style] || plantSuggestions.tropical;

  let html = '<div style="animation:fadeIn 0.5s ease;">';

  // 1. Interactive Visual Layout Switcher (2D Blueprint Canvas vs AI Concept vs User Photo)
  html += '<div style="position:relative;border-radius:20px;overflow:hidden;margin-bottom:20px;box-shadow:0 12px 35px rgba(14,42,26,0.15);border:1px solid #e7e2d3;background:#173625;">';
  
  // Canvas View Container
  html += '<canvas id="gardenBlueprintCanvas" style="width:100%;height:320px;display:block;"></canvas>';
  html += '<img id="aiGardenViewImg" src="' + esc(conceptImage) + '" style="width:100%;height:320px;object-fit:cover;display:none;">';
  
  html += '<div style="position:absolute;top:14px;left:14px;background:rgba(23,72,47,0.9);backdrop-filter:blur(8px);color:#fff;padding:5px 14px;border-radius:999px;font-size:0.8rem;font-weight:700;letter-spacing:0.5px;box-shadow:0 4px 12px rgba(0,0,0,0.2);">';
  html += '📐 AI Architectural Blueprint Map';
  html += '</div>';

  html += '<div style="position:absolute;bottom:14px;right:14px;display:flex;gap:8px;flex-wrap:wrap;">';
  html += '<button onclick="showDesignView(\'blueprint\')" style="background:#17482f;color:#fff;border:1px solid #c9a227;padding:6px 14px;border-radius:999px;font-size:0.78rem;font-weight:700;cursor:pointer;">📐 2D Floorplan Map</button>';
  html += '<button onclick="showDesignView(\'ai\')" style="background:#c9a227;color:#fff;border:none;padding:6px 14px;border-radius:999px;font-size:0.78rem;font-weight:700;cursor:pointer;">✨ AI Render Concept</button>';
  if (userImg) {
    html += '<button onclick="showDesignView(\'user\')" style="background:rgba(255,255,255,0.9);color:#17482f;border:none;padding:6px 14px;border-radius:999px;font-size:0.78rem;font-weight:700;cursor:pointer;">📷 Your Space Photo</button>';
  }
  html += '</div>';
  html += '</div>';

  // 2. Structured Layout Plan & Explanations Card
  html += '<div style="background:#f4f8f5;border:1px solid #d4e4d6;border-radius:18px;padding:20px;margin-bottom:22px;">';
  html += '<h3 style="font-family:\'Playfair Display\',Georgia,serif;color:#17482f;font-size:1.35rem;margin-bottom:8px;">🎨 Spatial Concept: ' + esc(styleNames[style] || style) + '</h3>';
  
  if (rawPlan) {
    html += '<div style="line-height:1.7;color:#3d4a3a;font-size:0.95rem;white-space:pre-line;">' + esc(rawPlan) + '</div>';
  } else {
    html += '<div style="line-height:1.7;color:#3d4a3a;font-size:0.95rem;">';
    html += '<p style="margin-bottom:10px;"><strong>📍 Zone A (Sunlight Hotspot):</strong> Position high-light plants (like Juniper Bonsai & Roses) directly near the window or balcony railing for 4–6 hours of direct morning sun.</p>';
    html += '<p style="margin-bottom:10px;"><strong>📍 Zone B (Filtered Midground):</strong> Place medium-light species (Anthurium & Ficus Ginseng) on ceramic plant stands or tables 2 meters back from direct glass.</p>';
    html += '<p style="margin-bottom:10px;"><strong>📍 Zone C (Shaded Ambient Base):</strong> Surround floor bases with Peace Lilies in well-draining terracotta pots for lush green contrast.</p>';
    html += '<p style="margin-bottom:0;"><strong>💧 Aeration & Irrigation Strategy:</strong> Water early in the morning when the top 2 inches of soil dry. Mist foliage 3x weekly for optimal tropical humidity.</p>';
    html += '</div>';
  }
  html += '</div>';

  // 3. Recommended Store Catalog Plants Grid
  html += '<h4 style="font-family:\'Playfair Display\',Georgia,serif;color:#17482f;font-size:1.2rem;margin-bottom:12px;">🌿 Recommended Plants for This Layout</h4>';
  html += '<div class="recommended-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px;margin-bottom:20px;">';
  recs.forEach(p => {
    html += '<div class="rec-plant" style="background:#fff;border:1px solid #e7e2d3;border-radius:14px;padding:10px;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.04);">';
    html += '<img src="' + esc(p.img) + '" alt="' + esc(p.name) + '" style="width:100%;height:100px;object-fit:cover;border-radius:10px;margin-bottom:6px;">';
    html += '<b style="display:block;color:#17482f;font-size:0.9rem;">' + esc(p.name) + '</b>';
    html += '<span style="color:#c9a227;font-weight:700;font-size:0.82rem;display:block;margin:2px 0;">' + formatINR(p.price) + '</span>';
    html += '<small style="color:#7c8878;font-size:0.75rem;display:block;margin-bottom:8px;">' + esc(p.tag) + '</small>';
    html += '<button onclick="addToCart(' + p.id + ')" style="width:100%;background:#17482f;color:#fff;border:none;padding:6px;border-radius:8px;font-size:0.78rem;font-weight:700;cursor:pointer;">+ Add to Cart</button>';
    html += '</div>';
  });
  html += '</div>';

  html += '</div>';

  container.innerHTML = html;

  const exportBtns = document.getElementById('exportActionBtns');
  if (exportBtns) exportBtns.style.display = 'flex';

  setTimeout(() => {
    draw2DBlueprintFloorplan('gardenBlueprintCanvas', style);
  }, 100);
}

window.showDesignView = function(mode) {
  const canvas = document.getElementById('gardenBlueprintCanvas');
  const img = document.getElementById('aiGardenViewImg');
  if (!canvas || !img) return;

  if (mode === 'blueprint') {
    canvas.style.display = 'block';
    img.style.display = 'none';
  } else if (mode === 'ai') {
    canvas.style.display = 'none';
    img.style.display = 'block';
  } else if (mode === 'user') {
    canvas.style.display = 'none';
    img.style.display = 'block';
  }
};

window.draw2DBlueprintFloorplan = function(canvasId, style) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = 600;
  const h = canvas.height = 320;

  // Blueprint dark forest background
  ctx.fillStyle = '#11291b';
  ctx.fillRect(0, 0, w, h);

  // Subtle architectural grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 30) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y < h; y += 30) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // Room Wall Boundaries
  ctx.strokeStyle = '#c9a227';
  ctx.lineWidth = 4;
  ctx.strokeRect(30, 30, w - 60, h - 60);

  // Sunlight Vectors
  const grad = ctx.createRadialGradient(w - 60, 30, 10, w - 60, 30, 220);
  grad.addColorStop(0, 'rgba(255, 216, 102, 0.45)');
  grad.addColorStop(1, 'rgba(255, 216, 102, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(w - 60, 30, 220, 0, Math.PI * 2);
  ctx.fill();

  // Window Wall Label
  ctx.strokeStyle = '#ffd866';
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(w - 180, 30); ctx.lineTo(w - 60, 30); ctx.stroke();
  ctx.fillStyle = '#ffd866';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('☀️ WINDOW / SUNLIGHT RAYS', w - 240, 22);

  // Zone A Node (Window Hotspot)
  ctx.fillStyle = '#52B788';
  ctx.beginPath(); ctx.arc(w - 120, 100, 22, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.fillText('ZONE A', w - 140, 138);
  ctx.fillText('🌹 High Sun', w - 145, 153);

  // Zone B Node (Focal Centerpiece)
  ctx.fillStyle = '#2e7d4f';
  ctx.beginPath(); ctx.arc(w / 2, h / 2, 28, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#ffd866'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('ZONE B (Centerpiece)', w / 2 - 60, h / 2 + 45);

  // Zone C Node (Shaded Floor Base)
  ctx.fillStyle = '#1e5233';
  ctx.beginPath(); ctx.arc(90, h - 90, 24, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.fillText('ZONE C', 70, h - 50);
  ctx.fillText('🌿 Low Light', 65, h - 35);

  // Blueprint Title & Scale Stamp
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.font = '11px sans-serif';
  ctx.fillText('📐 AI 2D Architectural Blueprint Map (Scale 1:20)', 40, h - 40);
};

/* ☀️ Sunlight & Orientation Calculator Quiz Handler */
window.evaluateSunlightQuiz = function() {
  const orient = document.getElementById('quizOrientation')?.value || 'east';
  const hours = document.getElementById('quizHours')?.value || '2-4';
  const box = document.getElementById('quizResultsBox');
  if (!box) return;

  let title = '';
  let recommendations = [];

  if (orient === 'south' || hours === '6+') {
    title = '☀️ High Sunlight Profile (Direct Sun 6+ Hrs)';
    recommendations = [
      { name: 'Red Rose Plant', desc: 'Needs 6+ hrs direct sun for full blooms', price: 'Rs. 299' },
      { name: 'Bougainvillea Bonsai', desc: 'Thrives in direct heat & radiant light', price: 'Rs. 349' },
      { name: 'Juniper Outdoor Bonsai', desc: 'Loves full outdoor direct sunlight', price: 'Rs. 1,499' }
    ];
  } else if (orient === 'east' || hours === '4-6') {
    title = '🌅 Bright Morning Sun Profile (3-5 Hrs)';
    recommendations = [
      { name: 'Anthurium Flowering', desc: 'Thrives in bright morning sunlight', price: 'Rs. 499' },
      { name: 'Ficus Ginseng Bonsai', desc: 'Loves bright indirect sunlight', price: 'Rs. 1,299' },
      { name: 'Peace Lily', desc: 'Enjoys gentle morning rays & high humidity', price: 'Rs. 399' }
    ];
  } else {
    title = '🌿 Low / Indirect Light Profile (Shaded Spot)';
    recommendations = [
      { name: 'Peace Lily Plant', desc: 'Thrives in low light & shady indoor spots', price: 'Rs. 399' },
      { name: 'Snake Plant', desc: 'Tolerates low light & minimal watering', price: 'Rs. 449' },
      { name: 'ZZ Plant', desc: 'Perfect for dark office & room corners', price: 'Rs. 549' }
    ];
  }

  box.style.display = 'block';
  box.innerHTML = `
    <b style="color:#17482f;font-size:0.95rem;display:block;margin-bottom:6px;">${title}</b>
    <p style="font-size:0.82rem;color:#555;margin-bottom:8px;">Recommended Plant Species for Your Setup:</p>
    <div style="display:flex;flex-direction:column;gap:6px;">
      ${recommendations.map(r => `
        <div style="background:#faf8f3;padding:8px 10px;border-radius:8px;border:1px solid #e7e2d3;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <b style="color:#17482f;font-size:0.85rem;">${r.name}</b>
            <span style="color:#777;font-size:0.78rem;display:block;">${r.desc}</span>
          </div>
          <span style="color:#2e7d4f;font-weight:700;font-size:0.85rem;">${r.price}</span>
        </div>
      `).join('')}
    </div>
  `;
  showToast('Sunlight evaluation complete! Recommended matching plant species 🌱');
};

/* 📸 Export Garden Layout PNG Image */
window.exportGardenPNG = function() {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#faf8f2';
  ctx.fillRect(0, 0, 800, 600);

  ctx.fillStyle = '#17482f';
  ctx.font = 'bold 28px Georgia, serif';
  ctx.fillText('Bloom & Bonsai — AI Garden Layout Plan', 40, 50);

  ctx.fillStyle = '#c9a227';
  ctx.font = 'bold 15px sans-serif';
  const styleName = document.getElementById('designStyle')?.value || 'Tropical Oasis';
  ctx.fillText('Aesthetic Theme: ' + styleName.toUpperCase(), 40, 80);

  ctx.strokeStyle = '#17482f';
  ctx.lineWidth = 3;
  ctx.strokeRect(40, 110, 720, 360);

  ctx.fillStyle = '#2e7d4f';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('🌱 Spatial Placement Map & Light Zones', 60, 150);

  ctx.fillStyle = '#333';
  ctx.font = '14px sans-serif';
  ctx.fillText('• High Light Zone (Direct Window Spot): Bonsai & Flowering Roses', 60, 200);
  ctx.fillText('• Shaded Corner (Floor Stand): Low-maintenance Peace Lily & Foliage', 60, 240);
  ctx.fillText('• Focal Point Center: Hand-sculpted Zen Ficus Bonsai', 60, 280);
  ctx.fillText('• Decorative Layering: Terracotta Potting Mix & Organic Soil Base', 60, 320);

  ctx.fillStyle = '#777';
  ctx.font = 'italic 13px sans-serif';
  ctx.fillText('Generated via Bloom & Bonsai AI Landscape Architecture (http://localhost/bloom-bonsai/)', 40, 550);

  const link = document.createElement('a');
  link.download = 'bloom_bonsai_garden_layout.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToast('Garden Layout Plan downloaded as PNG Image! 📸');
};

/* 📄 Export Printable PDF Plan Document */
window.exportGardenPDF = function() {
  const resultCard = document.getElementById('designerResult');
  if (!resultCard) return;

  const styleName = document.getElementById('designStyle')?.value || 'Tropical Oasis';
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Garden AI Layout Plan — Bloom & Bonsai</title>
      <style>
        body { font-family: 'Inter', sans-serif; padding: 40px; color: #17482f; background: #fff; }
        h1 { font-family: Georgia, serif; color: #17482f; font-size: 28px; border-bottom: 2px solid #c9a227; padding-bottom: 10px; }
        .meta { color: #555; font-size: 14px; margin-bottom: 20px; }
        .box { background: #faf8f2; border: 1px solid #e7e2d3; padding: 20px; border-radius: 14px; margin-bottom: 20px; }
        .footer { margin-top: 40px; font-size: 12px; color: #888; text-align: center; }
      </style>
    </head>
    <body>
      <h1>🌱 Bloom & Bonsai — Garden AI Architectural Plan</h1>
      <div class="meta">
        <strong>Aesthetic Style:</strong> ${styleName.toUpperCase()} &nbsp;|&nbsp; 
        <strong>Generated Date:</strong> ${new Date().toLocaleDateString()}
      </div>
      
      <div class="box">
        <h3>📍 Spatial Layout & Light Placement Plan</h3>
        <div>${resultCard.innerHTML}</div>
      </div>

      <div class="footer">
        Generated by Bloom & Bonsai AI Garden Designer • Visit http://localhost/bloom-bonsai/
      </div>
      <script>window.onload = function() { window.print(); };<\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
  showToast('Opening Printable PDF Layout Plan Document... 📄');
};

/* ─────────────────────────── 9. NEWSLETTER ─────────────────────────────────── */

async function subscribeNewsletter(e) {
  e.preventDefault();
  const input = e.target.querySelector('input[type="email"]');
  const email = input.value.trim();
  if (!email) { showToast('Please enter your email', 'error'); return; }

  try {
    await apiFetch('newsletter/subscribe.php', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    showToast('Subscribed! You\'re on the list 🌿');
    input.value = '';
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ─────────────────────── 10. CUSTOMER DASHBOARD (dashboard.html) ───────────── */

var ORDER_FLOW = window.ORDER_FLOW = window.ORDER_FLOW || ['confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered'];
var STATUS_LABELS = window.STATUS_LABELS = window.STATUS_LABELS || {
  pending: 'Order Received', confirmed: 'Order Confirmed', packed: 'Packed at Shop',
  shipped: 'Handed to Delivery', out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered', cancelled: 'Cancelled'
};

async function loadDashboard() {
  if (!localStorage.getItem('token')) { location.href = 'login.html'; return; }
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const greet = document.getElementById('dashGreeting');
  if (greet) greet.textContent = 'Welcome back, ' + (user.name || 'Plant Lover') + '!';
  try {
    const [ordersRes, plantsRes] = await Promise.all([
      apiFetch('orders/my-orders.php'),
      apiFetch('garden/purchases.php')
    ]);
    const orders = (ordersRes && (ordersRes.data || ordersRes.orders || (Array.isArray(ordersRes) ? ordersRes : []))) || [];
    const plants = (plantsRes && (plantsRes.purchases || plantsRes.data || plantsRes.plants || (Array.isArray(plantsRes) ? plantsRes : []))) || [];
    renderOrders(orders);
    renderPlants(plants);
  } catch (err) {
    const list = document.getElementById('ordersList');
    if (list) list.innerHTML = '<p style="color:#c0392b;">Could not load dashboard: ' + esc(err.error || err.message) + '</p>';
  }
}

function switchTab(which) {
  // Update button active state
  document.querySelectorAll('.dash-tab').forEach(b => {
    const isTab = b.dataset.tab === which || (b.getAttribute('onclick') && b.getAttribute('onclick').includes(which));
    b.classList.toggle('active', isTab);
  });

  const tO = document.getElementById('tabOrders'), tP = document.getElementById('tabPlants');
  if (tO) tO.classList.toggle('active', which === 'orders');
  if (tP) tP.classList.toggle('active', which === 'plants');

  // Toggle panels
  const pO = document.getElementById('panelOrders') || document.getElementById('ordersPane');
  const pP = document.getElementById('panelPlants') || document.getElementById('plantsPane');

  if (pO) {
    pO.hidden = (which !== 'orders');
    pO.style.display = (which === 'orders') ? 'block' : 'none';
  }
  if (pP) {
    pP.hidden = (which !== 'plants');
    pP.style.display = (which === 'plants') ? 'block' : 'none';
  }
}

function renderOrders(orders) {
  const box = document.getElementById('ordersList');
  if (!box) return;
  if (!orders || !orders.length) {
    box.innerHTML = '<div class="garden-empty" style="text-align:center;padding:3rem 1rem;color:#7c8878;background:#fff;border-radius:18px;border:1px solid #e7e2d3;">No orders placed yet — <a href="shop.html" style="color:#17482f;font-weight:bold;text-decoration:underline;">start shopping</a>!</div>';
    return;
  }
  box.innerHTML = orders.map(o => {
    const isCancelled = o.status === 'cancelled';
    const badge = 'status-' + o.status;

    // 24h Cancel Check
    const orderTime = new Date(String(o.created_at).replace(' ', 'T')).getTime();
    const nowTime = new Date().getTime();
    const hoursPassed = isNaN(orderTime) ? 0 : (nowTime - orderTime) / (1000 * 60 * 60);
    const canCancel = !isCancelled && !['shipped', 'out_for_delivery', 'delivered'].includes(o.status) && hoursPassed <= 24;
    const hoursLeft = Math.max(1, Math.ceil(24 - hoursPassed));

    const cancelBtn = canCancel ? `
      <button onclick="cancelOrder(${o.id})" style="background:#fff0f0;border:1px solid #f5c6cb;color:#c0392b;padding:6px 14px;border-radius:20px;cursor:pointer;font-weight:600;font-size:0.85rem;">
        🚫 Cancel Order <small style="color:#777;">(${hoursLeft}h left)</small>
      </button>` : '';

    const itemsHtml = (o.items || []).map(i => {
      const pid = i.product_id || i.id;
      const name = esc(i.name || i.product_name || 'Botanical Plant');
      const img = i.image || i.product_image || 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=100';
      return '<span style="display:inline-flex;align-items:center;gap:8px;background:#f6f3ea;border:1px solid #e7e2d3;padding:4px 12px 4px 6px;border-radius:999px;margin-right:8px;margin-bottom:8px;font-size:0.85rem;font-weight:600;color:#17482f;">' +
        '<img src="' + esc(img) + '" style="width:28px;height:28px;object-fit:cover;border-radius:50%;border:1px solid #17482f;"> ' +
        name + ' × ' + i.quantity +
        (pid ? ' <button onclick="openReviewModal(' + pid + ', \'' + name.replace(/'/g, "\\'") + '\')" style="background:#17482f;color:#fff;border:none;padding:2px 8px;border-radius:999px;cursor:pointer;font-size:0.75rem;font-weight:600;margin-left:4px;">⭐ Review</button>' : '') +
        '</span>';
    }).join('');

    return '<div class="order-card premium-card" style="background:#fff;border:1px solid #e7e2d3;border-radius:18px;padding:1.4rem 1.6rem;margin-bottom:1.3rem;box-shadow:0 8px 24px rgba(14,42,26,0.06);">' +
      '<div class="order-head" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">' +
        '<div><b style="font-family:\'Playfair Display\',serif;font-size:1.15rem;color:#17482f;">Order #BB-' + o.id + '</b><br><span style="color:#888;font-size:.85em;">' + esc(o.created_at) + '</span></div>' +
        '<div style="text-align:right;">' +
          '<span class="status-badge ' + badge + '" style="background:#17482f;color:#fff;padding:4px 12px;border-radius:999px;font-size:0.78rem;font-weight:700;text-transform:uppercase;">' + esc(STATUS_LABELS[o.status] || o.status) + '</span>' +
          '<br><b style="color:#17482f;font-size:1.05rem;display:inline-block;margin-top:4px;">' + formatINR(o.total_amount || o.total) + '</b>' +
          (o.expected_delivery ? '<br><span style="color:#2e7d32;font-size:.85em;font-weight:600;">🚚 Arrives by ' + esc(o.expected_delivery) + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<div style="margin:14px 0 10px;">' + itemsHtml + '</div>' +
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' +
        '<button onclick="toggleTimeline(' + o.id + ')" style="background:none;border:1px solid #17482f;color:#17482f;padding:6px 16px;border-radius:20px;cursor:pointer;font-weight:600;font-size:0.85rem;">Track Order</button>' +
        '<button onclick="openPdfInvoice(' + o.id + ')" style="background:#faf8f3;border:1px solid #c9a227;color:#17482f;padding:6px 16px;border-radius:20px;cursor:pointer;font-weight:600;font-size:0.85rem;">📄 PDF Invoice</button>' +
        cancelBtn +
      '</div>' +
      '<div id="timeline-' + o.id + '" class="hidden">' + renderTimeline(o) + '</div>' +
    '</div>';
  }).join('');
}

function renderTimeline(o) {
  if (o.status === 'cancelled') {
    const last = (o.history || []).slice(-1)[0];
    return '<div style="margin-top:14px;padding:12px;background:#fdecea;color:#c0392b;border-radius:10px;">' +
           'This order was cancelled.' + (last && last.note ? ' — ' + esc(last.note) : '') + '</div>';
  }
  const currentIdx = ORDER_FLOW.indexOf(o.status);
  const steps = ORDER_FLOW.map((s, i) => {
    const hist = (o.history || []).filter(h => h.status === s);
    const cls = i < currentIdx ? 'done' : (i === currentIdx ? 'current' : '');
    return '<li class="' + cls + '">' +
      '<div class="tl-label">' + esc(STATUS_LABELS[s]) + '</div>' +
      (hist.length ? '<div class="tl-time">' + esc(hist[0].created_at) + '</div>' : '') +
      (hist.length && hist[0].note ? '<div class="tl-note">' + esc(hist[0].note) + '</div>' : '') +
    '</li>';
  }).join('');
  return '<ul class="timeline">' + steps + '</ul>';
}

function toggleTimeline(orderId) {
  const el = document.getElementById('timeline-' + orderId);
  if (el) el.classList.toggle('hidden');
}

function renderPlants(plants) {
  const grid = document.getElementById('plantsGrid') || document.getElementById('myPlantsList');
  if (!grid) return;
  if (!plants || !plants.length) {
    grid.innerHTML = '<div class="garden-empty" style="grid-column:1/-1;text-align:center;padding:3rem 1rem;color:#7c8878;background:#fff;border-radius:18px;border:1px solid #e7e2d3;">' +
      '<p style="font-size:1.05rem;color:#7c8878;margin-bottom:1rem;">Your plant sanctuary is empty —</p>' +
      '<a href="shop.html" class="btn-primary" style="background:#17482f;color:#fff;padding:8px 22px;border-radius:999px;font-weight:600;text-decoration:none;">Browse Plant Collection</a>' +
      '</div>';
    return;
  }

  window.currentPlants = plants;
  grid.className = 'plant-grid';
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:1.4rem;width:100%;';

  grid.innerHTML = plants.map((p, idx) =>
    '<article class="plant-card-compact" onclick="openPlantCareModal(' + idx + ')" style="background:#fff;border:1px solid #e7e2d3;border-radius:16px;overflow:hidden;cursor:pointer;transition:transform .25s ease,box-shadow .25s ease;box-shadow:0 6px 18px rgba(14,42,26,.05);display:flex;flex-direction:column;">' +
      '<div style="height:150px;overflow:hidden;background:#f6f4ee;position:relative;">' +
        '<img src="' + esc(p.image || 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400') + '" alt="' + esc(p.name) + '" style="width:100%;height:100%;object-fit:cover;">' +
        '<span style="position:absolute;top:10px;right:10px;background:#17482f;color:#fff;padding:3px 10px;border-radius:999px;font-size:0.72rem;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,0.15);">' + esc(p.category_name || p.category || 'Botanical') + '</span>' +
      '</div>' +
      '<div style="padding:1.1rem;display:flex;flex-direction:column;flex-grow:1;justify-content:space-between;">' +
        '<div>' +
          '<b style="font-family:\'Playfair Display\',serif;font-size:1.05rem;color:#17482f;display:block;margin-bottom:2px;">' + esc(p.name) + '</b>' +
          '<span style="color:#52B788;font-size:.82em;font-style:italic;display:block;margin-bottom:8px;">🌿 ' + esc(p.scientific_name || 'Botanical Specimen') + '</span>' +
          '<span style="color:#7c8878;font-size:.8em;">📅 Purchased ' + esc(String(p.purchased_on || p.created_at || '').slice(0, 10)) + '</span>' +
        '</div>' +
        '<div style="margin-top:12px;">' +
          '<span style="display:inline-block;width:100%;text-align:center;background:#e8f5e9;color:#2e7d4f;padding:6px 12px;border-radius:999px;font-size:0.78rem;font-weight:700;border:1px solid #c8e6c9;">✨ 4-Week Care Plan</span>' +
        '</div>' +
      '</div>' +
    '</article>'
  ).join('');
}

function openPlantModal(p) {
  window.__activePlant = p;
  const weeks = (p.care_plan || []).map((w, i) =>
    '<div class="care-tab' + (i === 0 ? ' active' : '') + '" onclick="switchCareWeek(' + i + ')">Week ' + w.week_number + '</div>'
  ).join('') || '<p>Care plan coming soon.</p>';

  document.getElementById('plantModalBody').innerHTML =
    '<div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:14px;">' +
      (p.image ? '<img src="' + esc(p.image) + '" style="width:160px;height:160px;object-fit:cover;border-radius:12px;">' : '') +
      '<div style="flex:1;min-width:200px;">' +
        '<h2 style="margin:0;">' + esc(p.name) + '</h2>' +
        '<p style="color:#2e7d32;font-style:italic;margin:4px 0;">' + esc(p.scientific_name || '') + '</p>' +
        '<p style="color:#888;">Bought on ' + esc(String(p.purchased_on || '').slice(0, 10)) + ' · Order #BB-' + p.order_id + '</p>' +
      '</div>' +
    '</div>' +
    '<div class="detail-row"><span>Age</span><b>' + esc(p.plant_age || 'Young plant') + '</b></div>' +
    '<div class="detail-row"><span>Height</span><b>' + esc(p.max_height || '—') + '</b></div>' +
    '<div class="detail-row"><span>Bloom time</span><b>' + esc(p.bloom_time || '—') + '</b></div>' +
    '<div class="detail-row"><span>Light</span><b>' + esc(p.light_needs || '—') + '</b></div>' +
    '<div class="detail-row"><span>Water</span><b>' + esc(p.water_needs || '—') + '</b></div>' +
    '<div class="detail-row"><span>Soil</span><b>' + esc(p.soil_type || '—') + '</b></div>' +
    '<div class="detail-row"><span>Care level</span><b>' + esc(p.care_level || '—') + '</b></div>' +
    '<h3 style="margin-top:20px;">📅 Week-by-Week Care Plan</h3>' +
    '<div class="care-tabs">' + weeks + '</div>' +
    '<div id="careContent">' + renderCareWeek(p, 0) + '</div>';

  document.getElementById('plantModal').classList.add('show');
}

function renderCareWeek(p, idx) {
  const w = (p.care_plan || [])[idx];
  if (!w) return '<p>No care plan yet.</p>';
  return '<h4 style="margin:6px 0;">' + esc(w.title) + '</h4><p style="line-height:1.7;">' + esc(w.content) + '</p>';
}

function switchCareWeek(idx) {
  document.querySelectorAll('#plantModal .care-tab').forEach((t, i) => t.classList.toggle('active', i === idx));
  const el = document.getElementById('careContent');
  if (el && window.__activePlant) el.innerHTML = renderCareWeek(window.__activePlant, idx);
}

function closePlantModal() {
  const overlay = document.getElementById('plantModal');
  if (overlay) overlay.classList.remove('show');
}

/* ─────────────────────────── 11. MOBILE MENU & GLOBAL CLICKS ───────────────── */

window.toggleMenu = function() {
  const nav = document.getElementById('navLinks');
  if (nav) nav.classList.toggle('active');
};

function setupHamburger() {
  const burger = document.getElementById('hamburger');
  const nav    = document.getElementById('navLinks');
  if (burger && nav && !burger.hasAttribute('onclick')) {
    burger.addEventListener('click', () => nav.classList.toggle('active'));
  }
}

// Close modals when clicking the dark background
document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'productModal') closeProductModal();
  if (e.target && e.target.id === 'plantModal') closePlantModal();
});

// Global click delegation: add-to-cart, qty +/−, remove item
document.addEventListener('click', (e) => {
  const addBtn = e.target.closest('.add-to-cart-btn');
  if (addBtn) { addToCart(addBtn.dataset.id); return; }

  const qtyBtn = e.target.closest('.qty-btn');
  if (qtyBtn) { changeQty(qtyBtn.dataset.id, Number(qtyBtn.dataset.delta)); return; }

  const removeBtn = e.target.closest('.remove-item');
  if (removeBtn) { removeFromCart(removeBtn.dataset.id); return; }
});

// Demo quick-fill buttons on login page
document.addEventListener('click', (e) => {
  const fillBtn = e.target.closest('.demo-fill');
  if (!fillBtn) return;
  const emailInput = document.getElementById('loginEmail');
  const passInput  = document.getElementById('loginPassword');
  if (emailInput) emailInput.value = fillBtn.dataset.email;
  if (passInput)  passInput.value  = fillBtn.dataset.pass;
});

/* ─────────────────────────── 12. INIT (runs on every page) ────────────────── */

function safeInitApp() {
  if (window.__appInitDone) return;
  window.__appInitDone = true;

  // ── Register PWA Service Worker (Network-First Strategy) ──
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js?v=42.0').then(reg => {
      if (reg) reg.update();
    }).catch(_ => {});
  }

  // ── Auth UI state (restore session from localStorage) ──
  const user = getStoredUser();
  updateAuthUI(user);
  updateCartCount();

  if (localStorage.getItem('token')) {
    apiFetch('auth/me.php').then(res => {
      const userData = (res && res.user) ? res.user : res;
      if (userData && userData.name) {
        localStorage.setItem('user', JSON.stringify(userData));
        updateAuthUI(userData);
      }
    }).catch(_ => {});
  }

  // ── Login / Register forms ──
  const loginForm = document.getElementById('loginForm');
  if (loginForm && !loginForm.hasAttribute('onsubmit')) {
    loginForm.addEventListener('submit', handleLogin);
  }

  const registerForm = document.getElementById('registerForm');
  if (registerForm && !registerForm.hasAttribute('onsubmit')) {
    registerForm.addEventListener('submit', handleRegister);
  }

  // ── Newsletter forms (footer, every page) ──
  document.querySelectorAll('.newsletter-form').forEach(f =>
    f.addEventListener('submit', subscribeNewsletter)
  );

  // ── Checkout form ──
  const checkoutForm = document.getElementById('checkoutForm');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', handleCheckout);
    loadCheckoutPage();
  }

  // ── Page-specific loaders (each checks if its element exists) ──
  initHeroSlider();         // index.html hero image slider
  loadFeaturedProducts();   // index.html
  loadShopProducts();       // shop.html
  setupShopFilters();       // shop.html
  loadCartPage();           // cart.html
  loadMyGardenPage();       // mygarden.html
  setupUpload();            // mygarden.html
  setupDesigner();          // gardendesigner.html

  // ── Customer Dashboard ──
  if (document.getElementById('ordersList')) {
    loadDashboard();
  }

  // ── Mobile menu ──
  setupHamburger();

  // ── Real Botanical AI Chatbot Widget ──
  initChatbotWidget();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', safeInitApp);
} else {
  safeInitApp();
}

/* ─────────────────────────── 13. DYNAMIC BOUGHT-PLANT CARE SYSTEM ────────────────── */

async function loadMyGardenPage() {
  const container = document.getElementById('careTaskListContainer');
  const plantsGrid = document.getElementById('myPlantsList');
  if (!container && !plantsGrid) return;

  const user = getStoredUser();
  if (!user || !localStorage.getItem('token')) {
    renderGuestGardenState();
    return;
  }

  try {
    const res = await apiFetch('garden/purchases.php');
    const plants = (res && (res.purchases || res.data || res.plants || (Array.isArray(res) ? res : []))) || [];

    if (!plants.length) {
      renderGuestGardenState();
      return;
    }

    renderPurchasedPlantCards(plants);
    renderCategoryCareTasks(plants, user.id || 1);

  } catch (err) {
    if (container) {
      container.innerHTML = `<div style="text-align:center;padding:2rem;color:#c0392b;">Could not load garden care system: ${esc(err.message || 'Error')}</div>`;
    }
  }
}

function renderGuestGardenState() {
  const container = document.getElementById('careTaskListContainer');
  const plantsGrid = document.getElementById('myPlantsList');
  const healthSubtext = document.getElementById('healthSubtext');

  if (healthSubtext) {
    healthSubtext.textContent = 'Explore our store to start tracking automated daily plant care duties!';
  }

  if (container) {
    container.innerHTML = `
      <div style="text-align:center;padding:2.5rem 1.5rem;background:#fdfcf8;border:1px dashed #c9a227;border-radius:18px;">
        <div style="width:60px;height:60px;background:#f6f0dd;color:#c9a227;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 15px;font-size:1.6rem;">
          📢
        </div>
        <h4 style="font-family:'Playfair Display',Georgia,serif;font-size:1.35rem;color:#17482f;margin-bottom:8px;">
          Welcome to Your Plant Sanctuary!
        </h4>
        <p style="color:#5c6b58;max-width:550px;margin:0 auto 20px;font-size:0.95rem;line-height:1.6;">
          When you buy a plant from our shop, automated daily care tasks tailored specifically for your plant will appear here!
        </p>
        <a href="shop.html" class="btn-primary" style="background:#c9a227;color:#fff;font-weight:700;">
          <i class="fas fa-shopping-bag"></i> Browse Botanical Shop
        </a>
      </div>
    `;
  }

  if (plantsGrid) {
    plantsGrid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:3rem 1.5rem;background:#fff;border:1px solid #e7e2d3;border-radius:20px;">
        <p style="font-size:1.05rem;color:#7c8878;margin-bottom:1rem;">No purchased plants found in your garden yet.</p>
        <a href="shop.html" class="btn-primary">Browse Shop Collection</a>
      </div>
    `;
  }

  updateGardenHealthMeter(0, 0);
}

function renderPurchasedPlantCards(plants) {
  const grid = document.getElementById('myPlantsList');
  if (!grid) return;

  grid.innerHTML = plants.map(p => `
    <div class="plant-card" onclick="openPlantModal(${JSON.stringify(p).replace(/"/g, '&quot;')})" style="background:#fff;border:1px solid #e7e2d3;border-radius:18px;overflow:hidden;cursor:pointer;transition:transform 0.25s;box-shadow:0 6px 20px rgba(0,0,0,0.04);">
      <div style="height:170px;overflow:hidden;background:#f6f4ee;position:relative;">
        <img src="${esc(p.image || 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400')}" alt="${esc(p.name)}" style="width:100%;height:100%;object-fit:cover;">
        <span style="position:absolute;top:10px;right:10px;background:#17482f;color:#fff;padding:3px 10px;border-radius:999px;font-size:0.75rem;font-weight:700;">
          ${esc(p.category_name || 'Botanical')}
        </span>
      </div>
      <div style="padding:16px;">
        <h4 style="font-family:'Playfair Display',serif;font-size:1.1rem;color:#17482f;margin-bottom:4px;">${esc(p.name)}</h4>
        <p style="color:#7c8878;font-size:0.82rem;font-style:italic;margin-bottom:10px;">${esc(p.scientific_name || 'Botanical Specimen')}</p>
        <div style="display:flex;align-items:center;justify-content:space-between;font-size:0.8rem;color:#5c6b58;">
          <span>Bought: ${esc(String(p.purchased_on || '').slice(0, 10))}</span>
          <span style="color:#2e7d4f;font-weight:700;">Care Plan Ready ✨</span>
        </div>
      </div>
    </div>
  `).join('');
}

function renderCategoryCareTasks(plants, userId) {
  const container = document.getElementById('careTaskListContainer');
  if (!container) return;

  const todayStr = new Date().toISOString().slice(0, 10);
  const storageKey = `bloom_care_tasks_${userId}_${todayStr}`;
  const savedState = JSON.parse(localStorage.getItem(storageKey) || '{}');

  let tasks = [];

  plants.forEach(p => {
    const slug = (p.category_slug || '').toLowerCase();
    const name = p.name;

    if (slug === 'bonsai' || name.toLowerCase().includes('bonsai')) {
      tasks.push({
        id: `task_water_bonsai_${p.id}`,
        category: '🌲 Bonsai Trees Category',
        icon: '💧',
        text: `Water ${name} root base until moist (Watering Needs)`
      });
      tasks.push({
        id: `task_prune_bonsai_${p.id}`,
        category: '🌲 Bonsai Trees Category',
        icon: '✂️',
        text: `Inspect & prune top shoots on ${name} (Bonsai Trimming)`
      });
    } else if (slug === 'flowers' || name.toLowerCase().includes('rose') || name.toLowerCase().includes('hibiscus') || name.toLowerCase().includes('anthurium')) {
      tasks.push({
        id: `task_water_flower_${p.id}`,
        category: '🌸 Flowering Plants Category',
        icon: '💧',
        text: `Water ${name} (Water when top soil is dry)`
      });
      tasks.push({
        id: `task_rotate_flower_${p.id}`,
        category: '🌸 Flowering Plants Category',
        icon: '☀️',
        text: `Rotate ${name} pot 180° for 4-6 hours direct sun`
      });
    } else {
      tasks.push({
        id: `task_water_foliage_${p.id}`,
        category: '🪴 Outdoor & Foliage Maintenance',
        icon: '💧',
        text: `Water ${name} soil base`
      });
      tasks.push({
        id: `task_wipe_foliage_${p.id}`,
        category: '🪴 Outdoor & Foliage Maintenance',
        icon: '🧪',
        text: `Wipe foliage leaves on ${name} with damp cloth`
      });
    }
  });

  const categories = {};
  tasks.forEach(t => {
    if (!categories[t.category]) categories[t.category] = [];
    categories[t.category].push(t);
  });

  let html = '';
  let completedCount = 0;

  Object.keys(categories).forEach(catName => {
    html += `
      <div style="margin-bottom:1.5rem;">
        <h4 style="font-size:1rem;color:#17482f;margin-bottom:10px;font-weight:700;display:flex;align-items:center;gap:8px;">
          ${catName}
        </h4>
    `;

    categories[catName].forEach(task => {
      const isCompleted = !!savedState[task.id];
      if (isCompleted) completedCount++;

      html += `
        <div class="task-item ${isCompleted ? 'completed' : ''}" onclick="toggleCareTask('${task.id}')">
          <div class="task-checkbox">
            ${isCompleted ? '<i class="fas fa-check"></i>' : ''}
          </div>
          <div class="task-text" style="font-size:0.95rem;font-weight:500;">
            <span>${task.icon}</span> ${esc(task.text)}
          </div>
        </div>
      `;
    });

    html += `</div>`;
  });

  container.innerHTML = html;

  window.__allGardenTasks = tasks;
  window.__currentUserId = userId;

  updateGardenHealthMeter(completedCount, tasks.length);
}

function toggleCareTask(taskId) {
  const userId = window.__currentUserId || 1;
  const todayStr = new Date().toISOString().slice(0, 10);
  const storageKey = `bloom_care_tasks_${userId}_${todayStr}`;
  const savedState = JSON.parse(localStorage.getItem(storageKey) || '{}');

  const wasCompleted = !!savedState[taskId];
  savedState[taskId] = !wasCompleted;
  localStorage.setItem(storageKey, JSON.stringify(savedState));

  if (!wasCompleted) {
    showToast('Task Completed! Garden Health Maintained 🌿');
  }

  const tasks = window.__allGardenTasks || [];
  let completedCount = 0;

  tasks.forEach(t => {
    if (savedState[t.id]) completedCount++;
  });

  const taskEls = document.querySelectorAll('.task-item');
  taskEls.forEach(el => {
    if (el.getAttribute('onclick') && el.getAttribute('onclick').includes(taskId)) {
      el.classList.toggle('completed', !wasCompleted);
      const box = el.querySelector('.task-checkbox');
      if (box) box.innerHTML = !wasCompleted ? '<i class="fas fa-check"></i>' : '';
    }
  });

  updateGardenHealthMeter(completedCount, tasks.length);
}

function resetDailyCareTasks() {
  const userId = window.__currentUserId || 1;
  const todayStr = new Date().toISOString().slice(0, 10);
  const storageKey = `bloom_care_tasks_${userId}_${todayStr}`;
  localStorage.removeItem(storageKey);

  showToast('Daily care tasks reset for today 🔄');
  loadMyGardenPage();
}

function updateGardenHealthMeter(completed, total) {
  const bar = document.getElementById('healthMeterBar');
  const percentText = document.getElementById('meterPercentText');
  const completedText = document.getElementById('completedTaskCount');
  const totalText = document.getElementById('totalTaskCount');
  const badgeText = document.getElementById('healthBadgeText');
  const badge = document.getElementById('healthBadge');

  if (completedText) completedText.textContent = completed;
  if (totalText) totalText.textContent = total;

  if (!total) {
    if (bar) bar.style.width = '100%';
    if (percentText) percentText.textContent = '100% Thriving';
    if (badgeText) badgeText.textContent = '100% Thriving 🌿';
    return;
  }

  const pct = Math.round(60 + (completed / total) * 40);

  if (bar) bar.style.width = pct + '%';
  if (percentText) percentText.textContent = pct + '% Garden Health';

  if (pct >= 90) {
    if (badgeText) badgeText.textContent = pct + '% Thriving 🌿';
    if (badge) badge.style.background = '#2e7d4f';
  } else if (pct >= 75) {
    if (badgeText) badgeText.textContent = pct + '% Healthy 🌱';
    if (badge) badge.style.background = '#c9a227';
  } else {
    if (badgeText) badgeText.textContent = pct + '% Needs Care ⚠️';
    if (badge) badge.style.background = '#c0392b';
  }
}

/* ── Hero Image Auto-Slider ── */
let currentHeroSlideIdx = 0;
let heroSlideTimer = null;

function initHeroSlider() {
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hero-dot');
  if (!slides.length) return;

  function showSlide(idx) {
    currentHeroSlideIdx = (idx + slides.length) % slides.length;
    slides.forEach((s, i) => s.classList.toggle('active', i === currentHeroSlideIdx));
    dots.forEach((d, i) => d.classList.toggle('active', i === currentHeroSlideIdx));
  }

  window.setHeroSlide = function(idx) {
    showSlide(idx);
    resetTimer();
  };

  function nextSlide() {
    showSlide(currentHeroSlideIdx + 1);
  }

  function resetTimer() {
    if (heroSlideTimer) clearInterval(heroSlideTimer);
    heroSlideTimer = setInterval(nextSlide, 3500);
  }

  resetTimer();
}

/* ─────────────────────────── 15. REAL BOTANICAL AI CHATBOT ──────────────────── */

function initChatbotWidget() {
  if (document.getElementById('sproutChatWidget')) return;

  const style = document.createElement('style');
  style.textContent = `
    #sproutChatTrigger {
      position: fixed; bottom: 24px; right: 24px; z-index: 9990;
      width: 62px; height: 62px; border-radius: 50%;
      background: linear-gradient(135deg, #17482f 0%, #205c3d 100%);
      color: #ffffff; border: 2px solid #c9a227;
      box-shadow: 0 10px 25px rgba(14, 42, 26, 0.35);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      font-size: 1.6rem; transition: transform 0.25s ease, box-shadow 0.25s ease;
    }
    #sproutChatTrigger:hover { transform: scale(1.08); box-shadow: 0 14px 32px rgba(14, 42, 26, 0.45); }
    #sproutBadge {
      position: absolute; top: -4px; right: -4px;
      background: #c9a227; color: #17482f; font-size: 0.68rem; font-weight: 800;
      padding: 2px 7px; border-radius: 999px; border: 2px solid #fff;
    }

    #sproutChatBox {
      position: fixed; bottom: 95px; right: 24px; z-index: 9995;
      width: 380px; height: 540px; max-width: calc(100vw - 32px); max-height: calc(100vh - 120px);
      background: #ffffff; border-radius: 24px; border: 1px solid #e7e2d3;
      box-shadow: 0 20px 50px rgba(14, 42, 26, 0.22);
      display: flex; flex-direction: column; overflow: hidden;
      opacity: 0; transform: translateY(20px) scale(0.95); pointer-events: none;
      transition: opacity 0.3s ease, transform 0.3s ease;
    }
    #sproutChatBox.active {
      opacity: 1; transform: translateY(0) scale(1); pointer-events: all;
    }

    .sprout-header {
      background: linear-gradient(135deg, #0e2a1a 0%, #17482f 100%);
      color: #fff; padding: 16px 20px; display: flex; align-items: center;
      justify-content: space-between; border-bottom: 1px solid rgba(201, 162, 39, 0.3);
    }
    .sprout-title-wrap { display: flex; align-items: center; gap: 12px; }
    .sprout-avatar {
      width: 40px; height: 40px; border-radius: 50%; background: rgba(201, 162, 39, 0.2);
      border: 1px solid #c9a227; display: flex; align-items: center; justify-content: center;
      font-size: 1.3rem; color: #ffe89e;
    }
    .sprout-h-name { font-family: 'Playfair Display', serif; font-size: 1.15rem; font-weight: 700; }
    .sprout-h-status { font-size: 0.75rem; color: #a3e0b5; display: flex; align-items: center; gap: 4px; }
    .sprout-close-btn { background: none; border: none; color: #fff; font-size: 1.2rem; cursor: pointer; opacity: 0.8; }
    .sprout-close-btn:hover { opacity: 1; }

    .sprout-messages {
      flex: 1; padding: 16px; overflow-y: auto; background: #faf8f3;
      display: flex; flex-direction: column; gap: 12px; font-size: 0.9rem;
    }

    .sprout-msg {
      max-width: 85%; padding: 12px 16px; border-radius: 18px; line-height: 1.5; word-wrap: break-word;
    }
    .sprout-msg.bot {
      background: #ffffff; color: #1b2e23; border: 1px solid #e7e2d3;
      align-self: flex-start; border-bottom-left-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);
    }
    .sprout-msg.user {
      background: #17482f; color: #ffffff; align-self: flex-end;
      border-bottom-right-radius: 4px;
    }
    .sprout-msg.bot a { color: #17482f; font-weight: 700; text-decoration: underline; }

    .sprout-chips {
      display: flex; gap: 6px; overflow-x: auto; padding: 8px 16px; background: #f4f8f5;
      border-top: 1px solid #e7e2d3; scrollbar-width: none;
    }
    .sprout-chips::-webkit-scrollbar { display: none; }
    .sprout-chip {
      white-space: nowrap; background: #fff; border: 1px solid #2e7d4f; color: #17482f;
      padding: 5px 12px; border-radius: 999px; font-size: 0.78rem; font-weight: 600;
      cursor: pointer; transition: 0.2s;
    }
    .sprout-chip:hover { background: #17482f; color: #fff; }

    .sprout-input-bar {
      display: flex; align-items: center; padding: 12px 16px; background: #fff;
      border-top: 1px solid #e7e2d3; gap: 8px;
    }
    .sprout-input {
      flex: 1; border: 1px solid #e7e2d3; border-radius: 999px; padding: 10px 16px;
      font-family: inherit; font-size: 0.9rem; outline: none; transition: 0.2s;
    }
    .sprout-input:focus { border-color: #17482f; }
    .sprout-send-btn {
      width: 40px; height: 40px; border-radius: 50%; background: #17482f; color: #fff;
      border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
      font-size: 1rem; transition: 0.2s;
    }
    .sprout-send-btn:hover { background: #0e2a1a; }
  `;
  document.head.appendChild(style);

  const wrap = document.createElement('div');
  wrap.id = 'sproutChatWidget';
  wrap.innerHTML = `
    <button id="sproutChatTrigger" onclick="toggleSproutChat()" title="Chat with Sprout AI 🌱">
      🌱 <span id="sproutBadge">AI</span>
    </button>

    <div id="sproutChatBox">
      <div class="sprout-header">
        <div class="sprout-title-wrap">
          <div class="sprout-avatar">🌱</div>
          <div>
            <div class="sprout-h-name">Sprout AI</div>
            <div class="sprout-h-status">🟢 Online · Real-Time Assistant</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <button onclick="promptSproutGeminiKey()" title="Set Gemini API Key" style="background:rgba(255,255,255,0.15);border:1px solid #c9a227;color:#ffe89e;border-radius:999px;padding:3px 8px;font-size:0.75rem;cursor:pointer;">🔑 API Key</button>
          <button class="sprout-close-btn" onclick="toggleSproutChat()">&times;</button>
        </div>
      </div>

      <div class="sprout-messages" id="sproutMessages"></div>

      <div class="sprout-chips" style="display:flex;gap:6px;padding:8px 12px;overflow-x:auto;background:#faf8f3;border-top:1px solid #e7e2d3;">
        <span class="sprout-chip" onclick="sendSproutQuick('How often should I water my plants?')">💧 Watering Schedules</span>
        <span class="sprout-chip" onclick="sendSproutQuick('How do I prune and trim my bonsai?')">✂️ Pruning Care</span>
        <span class="sprout-chip" onclick="sendSproutQuick('Why are my plant leaves turning yellow?')">🍂 Yellow Leaves Remedy</span>
        <span class="sprout-chip" onclick="sendSproutQuick('Which plants grow best in low-light apartments?')">☀️ Sunlight & Indoor</span>
        <span class="sprout-chip" onclick="sendSproutQuick('What are your delivery and shipping policies?')">🚚 Shipping & Delivery</span>
        <span class="sprout-chip" onclick="sendSproutQuick('Recommend plants and show prices')">🌸 Plant Prices</span>
      </div>

      <form class="sprout-input-bar" onsubmit="handleSproutSubmit(event)">
        <input type="text" id="sproutInput" class="sprout-input" placeholder="Ask Sprout anything..." autocomplete="off">
        <button type="submit" class="sprout-send-btn"><i class="fas fa-paper-plane"></i></button>
      </form>
    </div>
  `;
  document.body.appendChild(wrap);

  restoreSproutChat();
}

function promptSproutGeminiKey() {
  const currentKey = localStorage.getItem('gemini_api_key') || '';
  const newKey = prompt('Enter your Google Gemini API Key (e.g. AIzaSy...):', currentKey);
  if (newKey !== null) {
    const trimmed = newKey.trim();
    if (trimmed) {
      localStorage.setItem('gemini_api_key', trimmed);
      alert('🔑 Gemini API Key saved! Sprout is now connected to live Gemini AI!');
    } else {
      localStorage.removeItem('gemini_api_key');
      alert('Gemini API Key removed. Using internal Botanical Engine.');
    }
  }
}

function toggleSproutChat() {
  const box = document.getElementById('sproutChatBox');
  if (!box) return;
  box.classList.toggle('active');
  if (box.classList.contains('active')) {
    const input = document.getElementById('sproutInput');
    if (input) input.focus();
    scrollSproutChat();
  }
}

function scrollSproutChat() {
  const msgBox = document.getElementById('sproutMessages');
  if (msgBox) msgBox.scrollTop = msgBox.scrollHeight;
}

function renderSproutMsg(text, sender = 'bot') {
  const msgBox = document.getElementById('sproutMessages');
  if (!msgBox) return;

  const div = document.createElement('div');
  div.className = `sprout-msg ${sender}`;

  let formatted = String(text || '')
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\n/g, '<br>');

  div.innerHTML = formatted;
  msgBox.appendChild(div);
  scrollSproutChat();
  saveSproutChat();
}

function showSproutTyping() {
  const msgBox = document.getElementById('sproutMessages');
  if (!msgBox) return;
  const div = document.createElement('div');
  div.id = 'sproutTyping';
  div.className = 'sprout-msg bot';
  div.style.fontStyle = 'italic';
  div.style.color = '#7c8878';
  div.innerHTML = 'Sprout is thinking... 🌱 <i class="fas fa-spinner fa-spin"></i>';
  msgBox.appendChild(div);
  scrollSproutChat();
}

function removeSproutTyping() {
  const el = document.getElementById('sproutTyping');
  if (el) el.remove();
}

async function handleSproutSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  const input = document.getElementById('sproutInput');
  if (!input) return;
  const msg = input.value.trim();
  if (!msg) return;

  input.value = '';
  renderSproutMsg(msg, 'user');
  showSproutTyping();

  try {
    const data = await apiFetch('ai/chat.php', {
      method: 'POST',
      body: JSON.stringify({ message: msg, gemini_api_key: geminiKey })
    });
    removeSproutTyping();
    const replyText = (data && (data.reply || (data.data && data.data.reply))) ? (data.reply || data.data.reply) : getSproutSmartReply(msg);
    renderSproutMsg(replyText, 'bot');
  } catch (err) {
    removeSproutTyping();
    renderSproutMsg(getSproutSmartReply(msg), 'bot');
  }
}

// Client-side fallback Botanical AI Knowledge Engine
function getSproutSmartReply(msg) {
  const m = String(msg || '').toLowerCase();

  // Greetings & Casual Conversations
  if (m.includes('hi') || m.includes('hello') || m.includes('hey') || m.includes('ayubowan') || m.includes('good morning') || m.includes('good evening')) {
    return "👋 **Ayubowan & Welcome to Bloom & Bonsai!** 🌱\n\nI'm Sprout, your AI Botanical Concierge! How can I assist your garden or orders today?";
  }
  
  // Shipping, Delivery & Tracking
  if (m.includes('ship') || m.includes('deliver') || m.includes('arrive') || m.includes('track') || m.includes('free shipping')) {
    return "🚚 **Shipping & Delivery Info:** We offer island-wide express delivery across Sri Lanka (typically 3–5 business days). Orders over Rs. 10,000 receive **FREE Island-wide Shipping**!";
  }

  // Payment Options
  if (m.includes('pay') || m.includes('cod') || m.includes('cash') || m.includes('card') || m.includes('stripe') || m.includes('payhere')) {
    return "💳 **Payment Methods:** We accept **Cash on Delivery (COD)**, Visa/MasterCard, and PayHere / Bank Transfers for 100% secure checkout!";
  }

  // Store Hours & Contact
  if (m.includes('contact') || m.includes('location') || m.includes('time') || m.includes('hour') || m.includes('phone') || m.includes('address')) {
    return "📍 **Bloom & Bonsai Experience Store:** Open 8:00 AM – 7:00 PM daily. Contact our nursery team at +94 77 123 4567 or visit our online shop at bloombonsai.infinityfreeapp.com!";
  }

  // Watering & Care
  if (m.includes('water') || m.includes('dry') || m.includes('schedule') || m.includes('often')) {
    return "🌱 **Watering Advice:** Always test soil moisture 2 inches deep before watering. Bonsai trees prefer moist, well-draining organic soil! Water early in the morning for best hydration.";
  }

  // Pruning & Trimming
  if (m.includes('prun') || m.includes('trim') || m.includes('cut') || m.includes('shape')) {
    return "✂️ **Pruning & Trimming Care:** Prune your Bonsai in early spring before new growth starts. Trim back 2-3 leaves on shoots that have grown 5-6 leaves long to maintain compact foliage shape!";
  }

  // Yellowing & Disease
  if (m.includes('yellow') || m.includes('leaf') || m.includes('sick') || m.includes('spot') || m.includes('die')) {
    return "🍂 **Foliage Health Meter:** Yellowing leaves are usually a sign of over-watering or poor drainage. Allow top soil to dry out between waterings and ensure pot drainage holes are clear.";
  }

  // Bonsai & Species
  if (m.includes('bonsai') || m.includes('ficus') || m.includes('juniper') || m.includes('plant')) {
    return "🌿 **Bonsai Master Care:** Ficus Ginseng Bonsai & Juniper Bonsai thrive in bright indirect sunlight (4-6 hours daily). Mist leaves 3x weekly to maintain optimal humidity levels!";
  }

  // Soil & Fertilizer
  if (m.includes('soil') || m.includes('fertiliz') || m.includes('pot') || m.includes('mix')) {
    return "🪴 **Soil & Potting Guide:** Use our Organic Potting Soil Mix (5kg) enriched with bio-char and akadama for optimal aeration and root development!";
  }

  // Default Random Answer Response
  return "🌱 **Botanical Concierge:** Great question! At Bloom & Bonsai, we specialize in premium handcrafted Bonsai trees, flowering garden plants, organic fertilizers, and AI landscape design. Ask me about plant care, watering tips, shipping details, or store inventory!";
}

function sendSproutQuick(text) {
  const input = document.getElementById('sproutInput');
  if (input) {
    input.value = text;
    handleSproutSubmit();
  }
}

function saveSproutChat() {
  const msgBox = document.getElementById('sproutMessages');
  if (msgBox) {
    sessionStorage.setItem('sprout_chat_history', msgBox.innerHTML);
  }
}

function restoreSproutChat() {
  const msgBox = document.getElementById('sproutMessages');
  if (!msgBox) return;
  const history = sessionStorage.getItem('sprout_chat_history');
  if (history && history.length > 50) {
    msgBox.innerHTML = history;
  } else {
    renderSproutMsg("👋 **Hello! I'm Sprout 🌱, your AI Botanical Assistant!**\n\nHow can I help your garden today?", 'bot');
  }
}

/* ─────────────────────────── 16. REVIEWS INTEGRATION ──────────────────── */

window.openReviewModal = function(productId, productName) {
  let modal = document.getElementById('reviewModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'reviewModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div style="background:#fff;border-radius:20px;padding:24px;max-width:420px;width:100%;box-shadow:0 14px 40px rgba(0,0,0,0.25);position:relative;">
      <button onclick="document.getElementById('reviewModal').style.display='none'" style="position:absolute;top:14px;right:14px;background:none;border:none;font-size:1.4rem;cursor:pointer;">&times;</button>
      <h3 style="font-family:'Playfair Display',serif;color:#17482f;margin-bottom:6px;">⭐ Review Product</h3>
      <p style="color:#666;font-size:0.9rem;margin-bottom:16px;">Write a review for <b>${esc(productName)}</b></p>
      
      <div style="margin-bottom:14px;">
        <label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:6px;">Rating (1 - 5 Stars):</label>
        <select id="reviewRatingSelect" style="width:100%;padding:10px;border-radius:8px;border:1px solid #c9a227;font-weight:bold;">
          <option value="5">⭐⭐⭐⭐⭐ (5/5 Excellent)</option>
          <option value="4">⭐⭐⭐⭐ (4/5 Very Good)</option>
          <option value="3">⭐⭐⭐ (3/5 Good)</option>
          <option value="2">⭐⭐ (2/5 Average)</option>
          <option value="1">⭐ (1/5 Poor)</option>
        </select>
      </div>

      <div style="margin-bottom:18px;">
        <label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:6px;">Your Comments & Feedback:</label>
        <textarea id="reviewCommentText" rows="3" placeholder="How is your plant thriving?" style="width:100%;padding:10px;border-radius:8px;border:1px solid #e7e2d3;font-family:inherit;box-sizing:border-box;"></textarea>
      </div>

      <button onclick="submitProductReview(${productId})" style="width:100%;background:#17482f;color:#fff;border:none;padding:12px;border-radius:999px;font-weight:700;font-size:0.95rem;cursor:pointer;">
        Submit Verified Review
      </button>
    </div>
  `;
  modal.style.display = 'flex';
};

window.submitProductReview = async function(productId) {
  const rating = Number(document.getElementById('reviewRatingSelect').value || 5);
  const comment = document.getElementById('reviewCommentText').value.trim();

  if (!comment) {
    alert('Please enter your review feedback');
    return;
  }

  try {
    await apiFetch('reviews/create.php', {
      method: 'POST',
      body: { product_id: productId, rating: rating, comment: comment }
    });
    alert('⭐ Thank you! Your review has been published!');
    const modal = document.getElementById('reviewModal');
    if (modal) modal.style.display = 'none';
  } catch (err) {
    alert('❌ ' + (err.message || 'Could not submit review. Please ensure you are logged in.'));
  }
};

window.applyAdvancedFilters = async function() {
  const grid = document.getElementById('shopGrid') || document.getElementById('shopProducts') || document.querySelector('.product-grid');
  if (!grid) return;

  const sun = document.getElementById('filterSunlight') ? document.getElementById('filterSunlight').value : '';
  const diff = document.getElementById('filterDifficulty') ? document.getElementById('filterDifficulty').value : '';
  const pet = document.getElementById('filterPetSafe') ? document.getElementById('filterPetSafe').value : '';

  try {
    const res = await apiFetch('products/list.php');
    let products = Array.isArray(res) ? res : (res && res.data ? res.data : []);

    if (currentShopCategory) {
      products = products.filter(p => (p.category_slug || p.category || '').toLowerCase().includes(currentShopCategory.toLowerCase()));
    }
    if (currentShopSearch) {
      products = products.filter(p => (p.name || '').toLowerCase().includes(currentShopSearch.toLowerCase()));
    }
    if (sun) {
      products = products.filter(p => p.sunlight === sun);
    }
    if (diff) {
      products = products.filter(p => p.difficulty === diff);
    }
    if (pet === '1') {
      products = products.filter(p => Number(p.pet_safe) === 1);
    }

    grid.innerHTML = (products && products.length)
      ? products.map(renderProductCard).join('')
      : '<p style="text-align:center;color:#888;padding:40px;grid-column:1/-1;">No plants found matching your advanced filters.</p>';
  } catch (err) {
    grid.innerHTML = '<p style="text-align:center;color:#c0392b;padding:40px;grid-column:1/-1;">Error applying filters: ' + esc(err.message) + '</p>';
  }
};

/* 24-Hour Order Cancellation Handler */
window.cancelOrder = async function(id) {
  if (!confirm('Are you sure you want to cancel Order #BB-' + id + '?\n\n(Note: Orders can only be cancelled within 24 hours of placement)')) return;
  try {
    const res = await apiFetch('orders/cancel.php', {
      method: 'POST',
      body: { order_id: Number(id) }
    });
    showToast('Order #BB-' + id + ' cancelled successfully');
    if (typeof loadDashboard === 'function') {
      loadDashboard();
    } else if (typeof fetchCustomerOrders === 'function') {
      fetchCustomerOrders();
    }
  } catch (e) {
    alert('❌ ' + (e.message || 'Could not cancel order'));
  }
};

/* PDF Invoice Viewer Helper */
window.openPdfInvoice = function(orderId) {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  window.open('api/orders/invoice.php?id=' + orderId + '&token=' + encodeURIComponent(token), '_blank');
};

window.toggleMenu = function() {
  const navLinks = document.querySelector('.nav-links');
  if (navLinks) {
    navLinks.classList.toggle('active');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  loadWishlistState();

  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');
  
  // Only add event listener if button does not already have inline onclick attribute
  if (hamburger && navLinks && !hamburger.hasAttribute('onclick')) {
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      window.toggleMenu();
    });
  }

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (navLinks && navLinks.classList.contains('active')) {
      const burger = document.querySelector('.hamburger');
      if (burger && !burger.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('active');
      }
    }
  });
});

// Re-sync wishlist state and cart badges on Back/Forward Cache (bfcache) restorations
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    loadWishlistState();
  }
});

/* ─────────────────────────── 17. REAL AI GARDEN DESIGNER HANDLERS ───────────────────── */

window.handleGardenDesignSubmit = async function(e) {
  if (e && e.preventDefault) e.preventDefault();

  const resultBox = document.getElementById('designerResult');
  const exportBtns = document.getElementById('exportActionBtns');

  if (!resultBox) return;

  const mode = document.getElementById('designMode') ? document.getElementById('designMode').value : 'enhance';
  const style = document.getElementById('designStyle') ? document.getElementById('designStyle').value : 'tropical';
  const promptText = document.getElementById('designPrompt') ? document.getElementById('designPrompt').value : '';
  const orient = document.getElementById('quizOrientation') ? document.getElementById('quizOrientation').value : 'East-facing';
  const hours = document.getElementById('quizHours') ? document.getElementById('quizHours').value : '4-6 Hours';

  const fileInput = document.getElementById('gardenImage');

  const formData = new FormData();
  formData.append('mode', mode);
  formData.append('style', style);
  formData.append('prompt', promptText);
  formData.append('orientation', orient);
  formData.append('hours', hours);

  if (fileInput && fileInput.files && fileInput.files[0]) {
    formData.append('image', fileInput.files[0]);
  }

  resultBox.innerHTML = `
    <div style="text-align:center;padding:50px 20px;margin:auto 0;">
      <i class="fas fa-sparkles fa-spin" style="font-size:3rem;color:#c9a227;margin-bottom:16px;"></i>
      <h3 style="color:#17482f;font-family:'Playfair Display',serif;font-size:1.4rem;margin-bottom:8px;">Analyzing Space &amp; Rendering 8K Concept... 🎨</h3>
      <p style="color:#555;font-size:0.92rem;max-width:420px;margin:0 auto;line-height:1.5;">
        Gemini Vision AI is analyzing architectural light &amp; room bounds, then rendering a photorealistic 8K transformed garden concept...
      </p>
    </div>
  `;

  if (exportBtns) exportBtns.style.display = 'none';

  try {
    const data = await apiFetch('ai/designer.php', {
      method: 'POST',
      body: formData,
      formdata: true
    });

    const modeTitle = data.mode === 'clean_slate'
      ? '🧹 Complete Clean-Slate Redesign'
      : '🌿 Enhance Existing Space & Furniture';

    const modeBg = data.mode === 'clean_slate' ? '#ffeaa7' : '#d4edda';
    const modeColor = data.mode === 'clean_slate' ? '#d35400' : '#155724';

    const recProducts = data.recommended_products || [];
    const recProductIds = recProducts.map(p => p.id);

    let productsHtml = '';
    if (recProducts.length) {
      productsHtml = `
        <div style="margin-top:20px;background:#f9f8f3;padding:16px;border-radius:16px;border:1px solid #e7e2d3;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <h4 style="color:#17482f;margin:0;font-size:1rem;"><i class="fas fa-shopping-bag" style="color:#c9a227;"></i> Recommended Store Plants</h4>
            <button onclick="addBundleToCart('${recProductIds.join(',')}')" style="background:#17482f;color:#fff;border:none;padding:8px 16px;border-radius:999px;font-size:0.82rem;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(23,72,47,0.2);">
              <i class="fas fa-cart-plus"></i> Add Entire Garden Bundle to Cart
            </button>
          </div>
          <div class="recommended-grid">
            ${recProducts.map(p => `
              <div class="rec-plant" style="background:#fff;border:1px solid #e2ddd0;">
                <img src="${esc(p.image || FALLBACK_IMG)}" alt="${esc(p.name)}">
                <b>${esc(p.name)}</b>
                <span>Rs. ${Number(p.price).toLocaleString('en-US')}</span>
                <button onclick="addToCart(${p.id}, 1)" style="margin-top:6px;width:100%;background:#c9a227;color:#fff;border:none;padding:4px;border-radius:6px;font-size:0.75rem;font-weight:700;cursor:pointer;">
                  + Add Item
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    const dims = data.original_dimensions || { width: 1024, height: 576 };
    const isPortrait = dims.height > dims.width;
    const renderImgHeight = isPortrait ? '540px' : '360px';

    resultBox.innerHTML = `
      <div style="animation:fadeIn 0.4s ease;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap;">
          <span style="background:${modeBg};color:${modeColor};padding:4px 14px;border-radius:999px;font-weight:700;font-size:0.82rem;">
            ${modeTitle}
          </span>
          <span style="background:rgba(23,72,47,0.08);color:#17482f;padding:4px 14px;border-radius:999px;font-weight:700;font-size:0.82rem;">
            ✨ Style: ${esc(data.style.toUpperCase())}
          </span>
          <span style="background:#eef6ff;color:#2980b9;padding:4px 14px;border-radius:999px;font-weight:700;font-size:0.82rem;">
            📐 Dimensions: ${dims.width}x${dims.height}px (${isPortrait ? 'Portrait' : 'Landscape'})
          </span>
        </div>

        <!-- Real 8K AI Render Image Container -->
        <div style="position:relative;margin-bottom:18px;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.12);background:#000;">
          <img src="${esc(data.render_url)}" id="aiConceptRenderImg" style="width:100%;height:${renderImgHeight};object-fit:cover;display:block;" alt="AI Transformed Garden Render">
          <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent, rgba(0,0,0,0.85));color:#fff;padding:14px 18px;font-size:0.85rem;">
            <b style="color:#ffe89e;display:block;margin-bottom:2px;"><i class="fas fa-camera"></i> 8K AI Concept Render (${dims.width}x${dims.height}px)</b>
            <span style="opacity:0.9;font-size:0.78rem;">Generated by FLUX.1 Realism Engine &amp; Gemini Vision</span>
          </div>
        </div>

        <div style="background:#fff;border:1px solid #e7e2d3;border-radius:16px;padding:16px;margin-bottom:16px;">
          <h4 style="color:#17482f;margin-bottom:6px;font-size:1rem;"><i class="fas fa-university" style="color:#c9a227;"></i> Architectural Concept Summary</h4>
          <p style="color:#444;font-size:0.9rem;line-height:1.5;margin:0;">${esc(data.architectural_summary)}</p>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:16px;">
          <div style="background:#fefcf5;border:1px solid #f3e5ab;border-radius:14px;padding:12px;">
            <b style="color:#b7950b;font-size:0.85rem;display:block;margin-bottom:4px;"><i class="fas fa-sun"></i> Zone A (High Sunlight Window)</b>
            <p style="font-size:0.82rem;color:#444;margin:0;">${esc(data.zones.zone_a)}</p>
          </div>
          <div style="background:#f4f9f5;border:1px solid #c8e6c9;border-radius:14px;padding:12px;">
            <b style="color:#2e7d32;font-size:0.85rem;display:block;margin-bottom:4px;"><i class="fas fa-cloud-sun"></i> Zone B (Midground Stand)</b>
            <p style="font-size:0.82rem;color:#444;margin:0;">${esc(data.zones.zone_b)}</p>
          </div>
          <div style="background:#f5f5f5;border:1px solid #e0e0e0;border-radius:14px;padding:12px;">
            <b style="color:#555;font-size:0.85rem;display:block;margin-bottom:4px;"><i class="fas fa-leaf"></i> Zone C (Shaded Floor Base)</b>
            <p style="font-size:0.82rem;color:#444;margin:0;">${esc(data.zones.zone_c)}</p>
          </div>
        </div>

        <div style="background:#fdfaf3;border-left:4px solid #c9a227;padding:12px 16px;border-radius:0 12px 12px 0;margin-bottom:16px;">
          <b style="color:#17482f;font-size:0.88rem;display:block;margin-bottom:4px;"><i class="fas fa-tint" style="color:#3498db;"></i> Care &amp; Hydration Strategy</b>
          <p style="font-size:0.84rem;color:#555;margin:0;">${esc(data.care_strategy)}</p>
        </div>

        ${productsHtml}
      </div>
    `;

    if (exportBtns) exportBtns.style.display = 'flex';

  } catch (err) {
    resultBox.innerHTML = `
      <div style="text-align:center;padding:40px 20px;color:#c0392b;">
        <i class="fas fa-exclamation-triangle" style="font-size:2.5rem;margin-bottom:12px;"></i>
        <h3>AI Design Render Error</h3>
        <p style="font-size:0.9rem;">${esc(err.message || 'Unable to generate design layout. Please try again.')}</p>
      </div>
    `;
  }
};

window.addBundleToCart = function(idsStr) {
  if (!idsStr) return;
  const ids = idsStr.split(',').map(id => Number(id.trim())).filter(Boolean);
  let count = 0;
  ids.forEach(id => {
    addToCart(id, 1);
    count++;
  });
  showToast(`🛒 Added ${count} Garden Bundle items to your Shopping Cart! 🌱`);
};

// Bind form submit on page load if designerForm exists
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('designerForm');
  if (form) {
    form.addEventListener('submit', handleGardenDesignSubmit);
  }
});

