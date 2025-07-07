// Supabase client configuration
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;

// Initialize Supabase only if credentials are provided
if (supabaseUrl && supabaseAnonKey && 
    supabaseUrl !== 'your_supabase_project_url_here' && 
    supabaseAnonKey !== 'your_supabase_anon_key_here') {
  
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✅ Supabase initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Supabase:', error.message);
  }
} else {
  console.log('⚠️ Supabase not configured - authentication disabled');
}

// Check if Supabase is configured
function isSupabaseConfigured() {
  return supabase !== null;
}

// Get Supabase client
function getSupabaseClient() {
  return supabase;
}

module.exports = {
  supabase,
  isSupabaseConfigured,
  getSupabaseClient
};
