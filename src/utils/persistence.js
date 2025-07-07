const fs = require('fs').promises;
const path = require('path');

// Data directory path (outside public folder)
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'auto-reply-settings.json');
const HISTORY_FILE = path.join(DATA_DIR, 'reply-history.json');

// Ensure data directory exists
async function ensureDataDirectory() {
  try {
    await fs.access(DATA_DIR);
  } catch (error) {
    await fs.mkdir(DATA_DIR, { recursive: true });
    console.log('📁 Created data directory for persistence');
  }
}

// Load settings from JSON file
async function loadSettings() {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(SETTINGS_FILE, 'utf8');
    const settings = JSON.parse(data);
    console.log('✅ Auto-reply settings loaded from file');
    return settings;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('📄 No existing settings file found, using defaults');
    } else {
      console.error('❌ Error loading settings:', error.message);
    }
    return null;
  }
}

// Save settings to JSON file
async function saveSettings(settings) {
  try {
    await ensureDataDirectory();
    
    // Prepare settings for saving (exclude sensitive data like API keys and tokens)
    const settingsToSave = {
      enabled: settings.enabled,
      interval: settings.interval,
      maxRepliesPerPost: settings.maxRepliesPerPost,
      // Exclude geminiApiKey and accessToken for security
      customPrompt: settings.customPrompt,
      monitoredPosts: settings.monitoredPosts,
      lastSaved: new Date().toISOString()
    };
    
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settingsToSave, null, 2));
    console.log('💾 Auto-reply settings saved to file');
  } catch (error) {
    console.error('❌ Error saving settings:', error.message);
    throw error;
  }
}

// Load reply history from JSON file
async function loadReplyHistory() {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(HISTORY_FILE, 'utf8');
    const historyData = JSON.parse(data);
    
    // Convert back to Map format
    const history = new Map();
    if (historyData.entries) {
      historyData.entries.forEach(([key, value]) => {
        // Convert repliedComments back to Set
        if (value.repliedComments) {
          if (Array.isArray(value.repliedComments)) {
            value.repliedComments = new Set(value.repliedComments);
          } else if (typeof value.repliedComments === 'object') {
            // Handle old format where Set was saved as object
            value.repliedComments = new Set(Object.keys(value.repliedComments));
          } else {
            value.repliedComments = new Set();
          }
        } else {
          value.repliedComments = new Set();
        }
        
        // Convert timestamp strings back to Date objects
        if (value.timestamp) {
          value.timestamp = new Date(value.timestamp);
        }
        if (value.replies) {
          value.replies.forEach(reply => {
            if (reply.timestamp) {
              reply.timestamp = new Date(reply.timestamp);
            }
          });
        }
        history.set(key, value);
      });
    }
    
    console.log(`✅ Reply history loaded: ${history.size} entries`);
    return history;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('📄 No existing reply history found, starting fresh');
    } else {
      console.error('❌ Error loading reply history:', error.message);
    }
    return new Map();
  }
}

// Save reply history to JSON file
async function saveReplyHistory(replyHistory) {
  try {
    await ensureDataDirectory();
    
    // Convert Map to serializable format with proper Set handling
    const entries = Array.from(replyHistory.entries()).map(([key, value]) => {
      // Convert Set to Array for serialization
      const serializedValue = { ...value };
      if (value.repliedComments instanceof Set) {
        serializedValue.repliedComments = Array.from(value.repliedComments);
      }
      return [key, serializedValue];
    });
    
    const historyData = {
      entries: entries,
      lastSaved: new Date().toISOString(),
      totalEntries: replyHistory.size
    };
    
    await fs.writeFile(HISTORY_FILE, JSON.stringify(historyData, null, 2));
    console.log(`💾 Reply history saved: ${replyHistory.size} entries`);
  } catch (error) {
    console.error('❌ Error saving reply history:', error.message);
    throw error;
  }
}

// Auto-save functionality with debouncing
let saveTimeouts = {
  settings: null,
  history: null
};

function debouncedSaveSettings(settings) {
  if (saveTimeouts.settings) {
    clearTimeout(saveTimeouts.settings);
  }
  
  saveTimeouts.settings = setTimeout(() => {
    saveSettings(settings).catch(console.error);
  }, 2000); // Save after 2 seconds of inactivity
}

function debouncedSaveHistory(replyHistory) {
  if (saveTimeouts.history) {
    clearTimeout(saveTimeouts.history);
  }
  
  saveTimeouts.history = setTimeout(() => {
    saveReplyHistory(replyHistory).catch(console.error);
  }, 5000); // Save after 5 seconds of inactivity
}

// Initialize persistence - load existing data
async function initializePersistence(autoReplySettings) {
  try {
    console.log('🔄 Initializing data persistence...');
    
    // Load saved settings
    const savedSettings = await loadSettings();
    if (savedSettings) {
      // Merge saved settings with current settings (preserve environment variables)
      autoReplySettings.enabled = savedSettings.enabled || false;
      autoReplySettings.interval = savedSettings.interval || autoReplySettings.interval;
      autoReplySettings.maxRepliesPerPost = savedSettings.maxRepliesPerPost || autoReplySettings.maxRepliesPerPost;
      autoReplySettings.customPrompt = savedSettings.customPrompt || autoReplySettings.customPrompt;
      autoReplySettings.monitoredPosts = savedSettings.monitoredPosts || [];
      
      // API keys and access tokens are ONLY loaded from environment variables for security
      // Never load them from saved files
      
      console.log(`📋 Restored ${autoReplySettings.monitoredPosts.length} monitored posts`);
    }
    
    // Load saved reply history
    const savedHistory = await loadReplyHistory();
    autoReplySettings.replyHistory = savedHistory;
    
    console.log('✅ Data persistence initialized successfully');
    
    return {
      settingsLoaded: !!savedSettings,
      historyLoaded: savedHistory.size > 0,
      monitoredPosts: autoReplySettings.monitoredPosts.length,
      historyEntries: savedHistory.size
    };
    
  } catch (error) {
    console.error('❌ Error initializing persistence:', error.message);
    return {
      settingsLoaded: false,
      historyLoaded: false,
      monitoredPosts: 0,
      historyEntries: 0,
      error: error.message
    };
  }
}

// Graceful shutdown - save all data
async function gracefulShutdown(autoReplySettings) {
  try {
    console.log('🔄 Performing graceful shutdown, saving data...');
    
    await Promise.all([
      saveSettings(autoReplySettings),
      saveReplyHistory(autoReplySettings.replyHistory)
    ]);
    
    console.log('✅ All data saved successfully');
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error.message);
  }
}

module.exports = {
  loadSettings,
  saveSettings,
  loadReplyHistory,
  saveReplyHistory,
  debouncedSaveSettings,
  debouncedSaveHistory,
  initializePersistence,
  gracefulShutdown
};
