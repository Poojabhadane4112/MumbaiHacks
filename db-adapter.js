/**
 * Database Adapter - Unified interface for SQLite and Supabase
 * Automatically switches based on USE_SUPABASE environment variable
 */

const useSupabase = process.env.USE_SUPABASE === 'true';

let dbModule;

if (useSupabase) {
    console.log('📊 Using Supabase as database');
    dbModule = require('./supabase');
} else {
    console.log('📊 Using SQLite as database');
    dbModule = require('./db');
}

/**
 * Initialize database
 */
async function initDatabase() {
    if (useSupabase) {
        await dbModule.initSupabase();
    } else {
        dbModule.initDatabase();
    }
}

/**
 * Get single record
 */
async function dbGet(query, params = []) {
    if (useSupabase) {
        // Parse SQLite query to Supabase format
        const { table, filters } = parseSQLiteQuery(query, params);
        return await dbModule.supabaseGet(table, filters, { single: true });
    } else {
        return await dbModule.dbGet(query, params);
    }
}

/**
 * Get multiple records
 */
async function dbQuery(query, params = []) {
    if (useSupabase) {
        const { table, filters } = parseSQLiteQuery(query, params);
        return await dbModule.supabaseGet(table, filters);
    } else {
        return await dbModule.dbQuery(query, params);
    }
}

/**
 * Insert/Update/Delete
 */
async function dbRun(query, params = []) {
    if (useSupabase) {
        const { operation, table, data, filters } = parseSQLiteQuery(query, params);
        
        switch (operation) {
            case 'INSERT':
                return await dbModule.supabaseInsert(table, data);
            case 'UPDATE':
                return await dbModule.supabaseUpdate(table, filters, data);
            case 'DELETE':
                return await dbModule.supabaseDelete(table, filters);
            default:
                throw new Error('Unsupported operation: ' + operation);
        }
    } else {
        return await dbModule.dbRun(query, params);
    }
}

/**
 * Parse SQLite query to Supabase format
 * This is a simplified parser - you may need to enhance it
 */
function parseSQLiteQuery(query, params) {
    const upperQuery = query.toUpperCase().trim();
    
    // Detect operation
    let operation = 'SELECT';
    if (upperQuery.startsWith('INSERT')) operation = 'INSERT';
    else if (upperQuery.startsWith('UPDATE')) operation = 'UPDATE';
    else if (upperQuery.startsWith('DELETE')) operation = 'DELETE';
    
    // Extract table name
    let table = '';
    if (operation === 'INSERT') {
        const match = query.match(/INSERT INTO (\w+)/i);
        table = match ? match[1] : '';
    } else if (operation === 'UPDATE') {
        const match = query.match(/UPDATE (\w+)/i);
        table = match ? match[1] : '';
    } else if (operation === 'DELETE') {
        const match = query.match(/DELETE FROM (\w+)/i);
        table = match ? match[1] : '';
    } else {
        const match = query.match(/FROM (\w+)/i);
        table = match ? match[1] : '';
    }
    
    // Build filters from WHERE clause
    const filters = {};
    const whereMatch = query.match(/WHERE (.+?)(?:ORDER BY|LIMIT|$)/i);
    if (whereMatch && params.length > 0) {
        const conditions = whereMatch[1].split('AND');
        conditions.forEach((condition, index) => {
            const columnMatch = condition.match(/(\w+)\s*=\s*\?/);
            if (columnMatch && params[index] !== undefined) {
                filters[columnMatch[1]] = params[index];
            }
        });
    }
    
    // Build data object for INSERT/UPDATE
    const data = {};
    if (operation === 'INSERT') {
        const columnsMatch = query.match(/\(([^)]+)\)/);
        if (columnsMatch) {
            const columns = columnsMatch[1].split(',').map(c => c.trim());
            columns.forEach((col, index) => {
                if (params[index] !== undefined) {
                    data[col] = params[index];
                }
            });
        }
    } else if (operation === 'UPDATE') {
        const setMatch = query.match(/SET (.+?) WHERE/i);
        if (setMatch) {
            const sets = setMatch[1].split(',');
            let paramIndex = 0;
            sets.forEach(set => {
                const columnMatch = set.match(/(\w+)\s*=\s*\?/);
                if (columnMatch && params[paramIndex] !== undefined) {
                    data[columnMatch[1]] = params[paramIndex];
                    paramIndex++;
                }
            });
        }
    }
    
    return { operation, table, filters, data };
}

module.exports = {
    initDatabase,
    dbGet,
    dbQuery,
    dbRun,
    useSupabase
};
