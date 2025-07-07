const fs = require('fs').promises;
const path = require('path');

// Data directory path (outside public folder)
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const AUTOPOST_HISTORY_FILE = path.join(DATA_DIR, 'autopost-history.json');

// Ensure data directory exists
async function ensureDataDirectory() {
  try {
    await fs.access(DATA_DIR);
  } catch (error) {
    await fs.mkdir(DATA_DIR, { recursive: true });
    console.log('📁 Created data directory for autopost persistence');
  }
}

// Load autopost history from JSON file
async function loadAutopostHistory() {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(AUTOPOST_HISTORY_FILE, 'utf8');
    const historyData = JSON.parse(data);
    
    console.log(`✅ Autopost history loaded: ${historyData.length || 0} entries`);
    return historyData || [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('📄 No existing autopost history found, starting fresh');
    } else {
      console.error('❌ Error loading autopost history:', error.message);
    }
    return [];
  }
}

// Save autopost history to JSON file
async function saveAutopostHistory(history) {
  try {
    await ensureDataDirectory();
    
    const historyData = {
      entries: history || [],
      lastSaved: new Date().toISOString(),
      totalEntries: (history || []).length
    };
    
    await fs.writeFile(AUTOPOST_HISTORY_FILE, JSON.stringify(history, null, 2));
    console.log(`💾 Autopost history saved: ${(history || []).length} entries`);
  } catch (error) {
    console.error('❌ Error saving autopost history:', error.message);
    throw error;
  }
}

// Clear autopost history
async function clearAutopostHistory() {
  try {
    await ensureDataDirectory();
    await fs.writeFile(AUTOPOST_HISTORY_FILE, JSON.stringify([], null, 2));
    console.log('🗑️ Autopost history cleared');
  } catch (error) {
    console.error('❌ Error clearing autopost history:', error.message);
    throw error;
  }
}

module.exports = {
  loadAutopostHistory,
  saveAutopostHistory,
  clearAutopostHistory
};