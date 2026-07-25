// ===== Bagr — shared client & helpers =====
// Fill these in from your Supabase project (Settings > API)
const SUPABASE_URL = 'https://dqorsxfqokzuwmuwipov.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VJHdqDmN3SMZilRU8olqqg_28AxAtbL';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ---- Auth ----
async function requireSession(redirectTo = 'login.html') {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    window.location.href = redirectTo;
    return null;
  }
  return session;
}

async function signInWithGithub() {
  await sb.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: new URL('today.html', window.location.href).href }
  });
}

async function sendMagicLink(email) {
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: new URL('today.html', window.location.href).href }
  });
  return error;
}

async function signOut() {
  await sb.auth.signOut();
  window.location.href = 'index.html';
}

// ---- Data: items ----
// items table: id, user_id, name, category, location ('home'|'away'), updated_at
async function fetchItems(userId) {
  const { data, error } = await sb
    .from('items')
    .select('*')
    .eq('user_id', userId)
    .order('name');
  if (error) throw error;
  return data;
}

async function setItemLocation(itemId, location) {
  const { error } = await sb
    .from('items')
    .update({ location, updated_at: new Date().toISOString() })
    .eq('id', itemId);
  if (error) throw error;
}

// ---- Data: timetable ----
// slots table: id, user_id, day_of_week (0-6, Mon=0), label, required_item_ids (int[])
async function fetchSlots(userId) {
  const { data, error } = await sb
    .from('slots')
    .select('*')
    .eq('user_id', userId)
    .order('day_of_week');
  if (error) throw error;
  return data;
}

// ---- Derived: what do I need for a given day ----
function itemsNeededForDay(slots, items, dayIndex) {
  const daySlots = slots.filter(s => s.day_of_week === dayIndex);
  const neededIds = new Set(daySlots.flatMap(s => s.required_item_ids || []));
  return items.filter(i => neededIds.has(i.id));
}

// ---- Drawer nav (shared across app pages) ----
const NAV_ICONS = {
  today: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
  timetable: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  items: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/></svg>'
};

function renderDrawerNav(activePage) {
  const pages = [
    { key: 'today', label: 'Today', href: 'today.html' },
    { key: 'timetable', label: 'Timetable', href: 'timetable.html' },
    { key: 'items', label: 'Items', href: 'items.html' }
  ];
  document.querySelector('.app-nav').innerHTML = `
    <button class="hamburger" onclick="openDrawer()" aria-label="Open menu"><span></span><span></span><span></span></button>
    <a class="logo-mark" href="today.html">bagr<span class="dot">.</span></a>
    <span></span>
  `;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="drawer-overlay" id="drawer-overlay" onclick="closeDrawer()"></div>
    <nav class="drawer" id="drawer">
      <button class="drawer-close" onclick="closeDrawer()" aria-label="Close menu">&times;</button>
      <div class="drawer-dot"></div>
      <div class="drawer-label">My manifest</div>
      ${pages.map(p => `
        <a class="drawer-link ${p.key === activePage ? 'active' : ''}" href="${p.href}">
          ${NAV_ICONS[p.key]} ${p.label}
        </a>`).join('')}
      <a class="drawer-link" href="#" onclick="signOut()" style="margin-top:1.5rem;">Sign out</a>
    </nav>
  `);
}

function openDrawer() {
  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawer-overlay').classList.add('open');
}
function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawer-overlay').classList.remove('open');
}
