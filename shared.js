// ===== Bagr — shared client & helpers =====
// Fill these in from your Supabase project (Settings > API)
const SUPABASE_URL = 'https://dqorsxfqokzuwmuwipov.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VJHdqDmN3SMZilRU8olqqg_28AxAtbL';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ---- Auth ----
async function requireSession(redirectTo = 'login.html') {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = redirectTo;
    return null;
  }
  return session;
}

async function signInWithGoogle() {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/today.html' }
  });
}

async function signOut() {
  await supabase.auth.signOut();
  window.location.href = 'index.html';
}

// ---- Data: items ----
// items table: id, user_id, name, category, location ('home'|'away'), updated_at
async function fetchItems(userId) {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', userId)
    .order('name');
  if (error) throw error;
  return data;
}

async function setItemLocation(itemId, location) {
  const { error } = await supabase
    .from('items')
    .update({ location, updated_at: new Date().toISOString() })
    .eq('id', itemId);
  if (error) throw error;
}

// ---- Data: timetable ----
// slots table: id, user_id, day_of_week (0-6, Mon=0), label, required_item_ids (int[])
async function fetchSlots(userId) {
  const { data, error } = await supabase
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

function nextOccurrenceLabel(dayIndex) {
  const today = new Date();
  const todayIdx = (today.getDay() + 6) % 7; // Mon=0
  const delta = (dayIndex - todayIdx + 7) % 7 || 7;
  if (delta === 1) return 'Tomorrow';
  return `Next ${DAYS[dayIndex]}`;
}
