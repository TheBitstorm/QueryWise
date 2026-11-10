/**
 * QueryWise SQL Validation & Execution Safety Module
 * 
 * Enforces strict read-only execution boundaries to protect against SQL injection,
 * data modification, schema alterations, and multi-statement attacks.
 */

// Forbidden commands that alter data, schema, transaction state, or privileges
const FORBIDDEN_KEYWORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE',
  'CREATE', 'GRANT', 'REVOKE', 'RENAME', 'EXEC', 'EXECUTE',
  'CALL', 'COPY', 'VACUUM', 'REINDEX', 'CLUSTER', 'LOCK',
  'SET', 'RESET', 'DISCARD', 'DO', 'PREPARE', 'DEALLOCATE',
  'LISTEN', 'NOTIFY', 'UNLISTEN', 'SECURITY'
];

/**
 * Remove SQL single-line and multi-line comments safely
 */
export function stripComments(sql) {
  // Remove multi-line /* ... */
  let cleaned = sql.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove single-line -- ...
  cleaned = cleaned.replace(/--.*$/gm, '');
  return cleaned.trim();
}

/**
 * Validates a SQL query for safety and compliance
 * @param {string} sql
 * @returns {{ isValid: boolean, error?: string, sanitizedSql: string }}
 */
export function validateSql(sql) {
  if (!sql || typeof sql !== 'string') {
    return { isValid: false, error: 'SQL query cannot be empty.' };
  }

  const trimmed = sql.trim();
  if (trimmed.length > 8000) {
    return { isValid: false, error: 'SQL query exceeds the maximum allowed length of 8,000 characters.' };
  }

  const stripped = stripComments(trimmed);
  if (!stripped) {
    return { isValid: false, error: 'Query contains only comments or whitespace.' };
  }

  // Check for semicolon statement chaining (e.g. SELECT 1; DROP TABLE users;)
  // Remove trailing semicolon if present
  let cleanSemicolon = stripped;
  if (cleanSemicolon.endsWith(';')) {
    cleanSemicolon = cleanSemicolon.slice(0, -1).trim();
  }

  // If there is still a semicolon inside, verify it isn't chaining multiple statements
  if (cleanSemicolon.includes(';')) {
    // Semicolon outside of quotes
    const outsideQuotesSemicolon = /;(?=(?:[^']*'[^']*')*[^']*$)(?=(?:[^"]*"[^"]*")*[^"]*$)/;
    if (outsideQuotesSemicolon.test(cleanSemicolon)) {
      return {
        isValid: false,
        error: 'Multiple SQL statements are not permitted in a single request. Please submit one query at a time.'
      };
    }
  }

  // Verify the query starts with SELECT or WITH (for CTEs)
  const normalizedStart = cleanSemicolon.trim().replace(/^\s*\(\s*/, '').toUpperCase();
  if (!normalizedStart.startsWith('SELECT') && !normalizedStart.startsWith('WITH')) {
    return {
      isValid: false,
      error: 'Only read-only SELECT or WITH (CTE) queries are permitted. Modifying or administrative statements are strictly blocked.'
    };
  }

  // Scan for forbidden mutation keywords outside of literal string literals
  // Mask strings inside single quotes first to avoid false positives on literal values like 'Active User'
  const sqlWithoutLiterals = cleanSemicolon.replace(/'(?:''|[^'])*'/g, "''");

  for (const keyword of FORBIDDEN_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(sqlWithoutLiterals)) {
      return {
        isValid: false,
        error: `Query contains forbidden operation '${keyword}'. Only read-only SELECT statements are supported.`
      };
    }
  }

  return {
    isValid: true,
    sanitizedSql: cleanSemicolon
  };
}

