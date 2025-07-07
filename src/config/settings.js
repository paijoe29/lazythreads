require('dotenv').config();

// Auto-reply settings configuration
const autoReplySettings = {
  enabled: process.env.AUTO_REPLY_ENABLED === 'true',
  interval: parseInt(process.env.AUTO_REPLY_INTERVAL) || 30000,
  maxRepliesPerPost: parseInt(process.env.MAX_REPLIES_PER_POST) || 3,
  accessToken: process.env.THREADS_ACCESS_TOKEN || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  monitoredPosts: [],
  replyHistory: new Map(), // Track replies per post
  customPrompt: `Kamu adalah  seseorang yang aktif di media sosial dan suka berinteraksi dengan orang lain.

ATURAN PENTING:
- Jawab seperti manusia biasa, bukan seperti AI atau bot
- Gunakan bahasa Indonesia yang santai dan natural
- JANGAN PERNAH gunakan kata-kata seperti: "Sebagai AI", "berdasarkan informasi", "menurut data", "sebagai chatbot"
- Buat respons yang terasa personal dan genuine
- Jangan pernah menggunakan emoji
- Jawab seolah-olah kamu memang tahu tentang topik postingan
- Kalau ada pertanyaan, jawab senatural mungkin berdasarkan konteks postingan
- Kalau ada pertanyaan yang tidak relevan, jawab dengan sopan tapi singkat
- Jangan pernah mengarahkan orang ke sumber lain, jawab langsung di sini
- Jangan pernah mengulang pertanyaan yang sudah ada di postingan

GAYA BAHASA:
- Santai tapi sopan
- Gunakan "aku" dan "kamu" sesuai konteks
- Singkat dan to the point
- Natural seperti komentar manusia biasa`
};

// Initialize persistence on startup
async function initializeSettings() {
  try {
    const { initializePersistence } = require('../utils/persistence');
    const result = await initializePersistence(autoReplySettings);
    
    console.log('🎯 Settings initialization result:', result);
    
    // Auto-save settings when they change
    const { debouncedSaveSettings, debouncedSaveHistory } = require('../utils/persistence');
    
    // Proxy to auto-save when settings change (exclude sensitive data)
    const originalSettings = { ...autoReplySettings };
    Object.keys(autoReplySettings).forEach(key => {
      // Exclude sensitive data from auto-save
      if (key !== 'replyHistory' && key !== 'geminiApiKey' && key !== 'accessToken') {
        let value = autoReplySettings[key];
        Object.defineProperty(autoReplySettings, key, {
          get: () => value,
          set: (newValue) => {
            value = newValue;
            debouncedSaveSettings(autoReplySettings);
          },
          enumerable: true,
          configurable: true
        });
      }
    });
    
    // Setup auto-save for reply history
    const originalSet = autoReplySettings.replyHistory.set.bind(autoReplySettings.replyHistory);
    const originalDelete = autoReplySettings.replyHistory.delete.bind(autoReplySettings.replyHistory);
    const originalClear = autoReplySettings.replyHistory.clear.bind(autoReplySettings.replyHistory);
    
    autoReplySettings.replyHistory.set = function(key, value) {
      const result = originalSet(key, value);
      debouncedSaveHistory(autoReplySettings.replyHistory);
      return result;
    };
    
    autoReplySettings.replyHistory.delete = function(key) {
      const result = originalDelete(key);
      debouncedSaveHistory(autoReplySettings.replyHistory);
      return result;
    };
    
    autoReplySettings.replyHistory.clear = function() {
      const result = originalClear();
      debouncedSaveHistory(autoReplySettings.replyHistory);
      return result;
    };
    
    return result;
  } catch (error) {
    console.error('❌ Error initializing settings persistence:', error.message);
    return { error: error.message };
  }
}

module.exports = {
  autoReplySettings,
  initializeSettings,
  port: 3000
};
