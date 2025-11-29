const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase credentials not found in .env file');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Initialize Supabase database tables
 */
async function initSupabase() {
    console.log('🔄 Initializing Supabase database...');
    
    try {
        // Check connection
        const { data, error } = await supabase.from('users').select('count').limit(1);
        
        if (error && error.code === '42P01') {
            console.log('📋 Tables not found. Please run the SQL setup script in Supabase dashboard.');
            console.log('📄 See: SUPABASE_SETUP.sql');
        } else if (error) {
            console.error('❌ Supabase connection error:', error.message);
        } else {
            console.log('✅ Supabase connected successfully');
        }
    } catch (error) {
        console.error('❌ Supabase initialization error:', error.message);
    }
}

/**
 * Query helper - SELECT
 */
async function supabaseGet(table, filters = {}, options = {}) {
    try {
        let query = supabase.from(table).select(options.select || '*');
        
        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value);
        });
        
        // Apply options
        if (options.single) {
            query = query.single();
        }
        if (options.limit) {
            query = query.limit(options.limit);
        }
        if (options.order) {
            query = query.order(options.order.column, { ascending: options.order.ascending });
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Supabase GET error:', error);
        throw error;
    }
}

/**
 * Query helper - INSERT
 */
async function supabaseInsert(table, data) {
    try {
        const { data: result, error } = await supabase
            .from(table)
            .insert(data)
            .select()
            .single();
        
        if (error) throw error;
        return result;
    } catch (error) {
        console.error('Supabase INSERT error:', error);
        throw error;
    }
}

/**
 * Query helper - UPDATE
 */
async function supabaseUpdate(table, filters, updates) {
    try {
        let query = supabase.from(table).update(updates);
        
        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value);
        });
        
        const { data, error } = await query.select();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Supabase UPDATE error:', error);
        throw error;
    }
}

/**
 * Query helper - DELETE
 */
async function supabaseDelete(table, filters) {
    try {
        let query = supabase.from(table).delete();
        
        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value);
        });
        
        const { data, error } = await query;
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Supabase DELETE error:', error);
        throw error;
    }
}

/**
 * Execute raw SQL (requires service role key)
 */
async function supabaseRawSQL(sql, params = []) {
    try {
        const { data, error } = await supabase.rpc('execute_sql', {
            query: sql,
            params: params
        });
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Supabase SQL error:', error);
        throw error;
    }
}

module.exports = {
    supabase,
    initSupabase,
    supabaseGet,
    supabaseInsert,
    supabaseUpdate,
    supabaseDelete,
    supabaseRawSQL
};
