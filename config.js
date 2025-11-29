/**
 * Frontend Configuration
 * Supabase client for browser
 */

// Supabase configuration
const SUPABASE_URL = 'https://yrgeujkmnqsedikezgso.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZ2V1amttbnFzZWRpa2V6Z3NvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNDI1ODgsImV4cCI6MjA3OTkxODU4OH0.FSDPJZK9bGS7M4lYHWuOiKSj-msnPUuN87WHmSqnv20';

// Initialize Supabase client (loaded from CDN in HTML)
let supabaseClient;

if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase client initialized');
} else {
    console.warn('⚠️ Supabase library not loaded. Add CDN script to HTML.');
}

// API Base URL (your Express backend)
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : 'https://your-production-url.com';

// Export for use in other scripts
window.FINCOACH_CONFIG = {
    supabase: supabaseClient,
    apiUrl: API_BASE_URL,
    supabaseUrl: SUPABASE_URL
};
