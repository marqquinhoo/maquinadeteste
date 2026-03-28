const knexConfig = require('./knexfile');
const knex = require('knex')(knexConfig.development);

/**
 * Saves or updates a test session in MySQL.
 */
async function saveTestSession(session) {
  const { id, url, goal, context, status, logs, screenshots, startTime, endTime, engine } = session;

  const serialized = {
    id,
    url,
    goal,
    context: typeof context === 'string' ? context : JSON.stringify(context),
    status,
    engine: engine || 'playwright',
    logs: JSON.stringify(logs),
    screenshots: JSON.stringify(screenshots),
    startTime: startTime ? new Date(startTime).toISOString().slice(0, 19).replace('T', ' ') : null,
    endTime: endTime ? new Date(endTime).toISOString().slice(0, 19).replace('T', ' ') : null
  };

  try {
    // MySQL Upsert pattern (INSERT ... ON DUPLICATE KEY UPDATE)
    const existing = await knex('TestSessions').where({ id }).first();
    if (existing) {
      await knex('TestSessions').where({ id }).update({
        status: serialized.status,
        engine: serialized.engine,
        logs: serialized.logs,
        screenshots: serialized.screenshots,
        endTime: serialized.endTime
      });
    } else {
      await knex('TestSessions').insert(serialized);
    }
  } catch (err) {
    console.error("DB Error in saveTestSession:", err.message);
  }
}

async function getTestSessions() {
  try {
    const rows = await knex('TestSessions').orderBy('startTime', 'desc');
    return rows.map(row => ({
      ...row,
      context: parseJson(row.context),
      logs: parseJson(row.logs) || [],
      screenshots: parseJson(row.screenshots) || []
    }));
  } catch (err) {
    console.error("DB Error in getTestSessions:", err.message);
    return [];
  }
}

async function getTestSessionById(id) {
  try {
    const row = await knex('TestSessions').where({ id }).first();
    if (!row) return null;
    return {
      ...row,
      context: parseJson(row.context),
      logs: parseJson(row.logs) || [],
      screenshots: parseJson(row.screenshots) || []
    };
  } catch (err) {
    console.error("DB Error in getTestSessionById:", err.message);
    return null;
  }
}

function parseJson(str) {
  try { return JSON.parse(str); } catch (e) { return str; }
}

/**
 * Allowed URLs functions
 */
async function getAllowedUrls() {
  try {
    return await knex('AllowedUrls').select('*').orderBy('label', 'asc');
  } catch (err) {
    console.error("DB Error in getAllowedUrls:", err.message);
    return [];
  }
}

async function addAllowedUrl(label, url) {
  try {
    await knex('AllowedUrls').insert({ label, url });
  } catch (err) {
    console.error("DB Error in addAllowedUrl:", err.message);
    throw err;
  }
}

async function removeAllowedUrl(id) {
  try {
    await knex('AllowedUrls').where({ id }).delete();
  } catch (err) {
    console.error("DB Error in removeAllowedUrl:", err.message);
    throw err;
  }
}

async function removeTestSession(id) {
  try {
    await knex('TestSessions').where({ id }).delete();
  } catch (err) {
    console.error("DB Error in removeTestSession:", err.message);
    throw err;
  }
}

module.exports = {
  saveTestSession,
  getTestSessions,
  getTestSessionById,
  knex,
  getAllowedUrls,
  addAllowedUrl,
  removeAllowedUrl,
  removeTestSession
};
