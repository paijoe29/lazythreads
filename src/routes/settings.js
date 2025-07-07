const express = require('express');
const router = express.Router();
const { autoReplySettings } = require('../config/settings');
const { updateGeminiApiKey, getModel } = require('../services/geminiService');
const { saveSettings } = require('../utils/persistence');
const { successResponse, errorResponse } = require('../utils/helpers');

// Get current settings
router.get('/settings', (req, res) => {
  res.json(successResponse({
    geminiApiKey: autoReplySettings.geminiApiKey ? '***CONFIGURED***' : '',
    accessToken: autoReplySettings.accessToken ? '***CONFIGURED***' : '',
    customPrompt: autoReplySettings.customPrompt,
    interval: autoReplySettings.interval,
    maxRepliesPerPost: autoReplySettings.maxRepliesPerPost,
    autoReplyEnabled: autoReplySettings.enabled,
    hasGeminiKey: !!autoReplySettings.geminiApiKey,
    hasAccessToken: !!autoReplySettings.accessToken,
    monitoredPostsCount: autoReplySettings.monitoredPosts.length,
    totalRepliesSent: autoReplySettings.replyHistory.size
  }, 'Settings retrieved successfully'));
});

// Update settings
router.post('/settings', async (req, res) => {
  try {
    const { 
      geminiApiKey, 
      accessToken, 
      customPrompt, 
      interval, 
      maxRepliesPerPost, 
      autoReplyEnabled 
    } = req.body;

    let updated = [];

    // Update Gemini API key
    if (geminiApiKey && geminiApiKey !== '***CONFIGURED***') {
      autoReplySettings.geminiApiKey = geminiApiKey;
      updateGeminiApiKey(geminiApiKey);
      updated.push('Gemini API Key');
    }

    // Update access token
    if (accessToken && accessToken !== '***CONFIGURED***') {
      autoReplySettings.accessToken = accessToken;
      updated.push('Access Token');
    }

    // Update custom prompt
    if (customPrompt !== undefined) {
      autoReplySettings.customPrompt = customPrompt;
      updated.push('Custom Prompt');
    }

    // Update interval
    if (interval !== undefined) {
      autoReplySettings.interval = Math.max(30000, parseInt(interval) * 1000); // Minimum 30 seconds
      updated.push('Check Interval');
    }

    // Update max replies per post
    if (maxRepliesPerPost !== undefined) {
      autoReplySettings.maxRepliesPerPost = Math.max(1, parseInt(maxRepliesPerPost));
      updated.push('Max Replies Per Post');
    }

    // Update auto-reply enabled status
    if (autoReplyEnabled !== undefined) {
      autoReplySettings.enabled = Boolean(autoReplyEnabled);
      updated.push('Auto Reply Status');
    }

    // Save settings to file immediately for important changes
    try {
      await saveSettings(autoReplySettings);
      console.log('💾 Settings saved to persistent storage');
    } catch (saveError) {
      console.error('⚠️ Failed to save settings to file:', saveError.message);
      // Continue anyway - settings are still in memory
    }

    res.json(successResponse({
      updatedFields: updated,
      currentSettings: {
        interval: autoReplySettings.interval / 1000, // Convert back to seconds
        maxRepliesPerPost: autoReplySettings.maxRepliesPerPost,
        autoReplyEnabled: autoReplySettings.enabled,
        hasGeminiKey: !!autoReplySettings.geminiApiKey,
        hasAccessToken: !!autoReplySettings.accessToken
      }
    }, `Settings updated: ${updated.join(', ')}`));

  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json(errorResponse('Failed to update settings', error.message));
  }
});

// Get AI model information
router.get('/ai-model-info', (req, res) => {
  const model = getModel();
  res.json(successResponse({
    modelConfigured: !!model,
    modelName: model ? 'gemini-2.0-flash' : null,
    hasApiKey: !!autoReplySettings.geminiApiKey,
    customPromptLength: autoReplySettings.customPrompt ? autoReplySettings.customPrompt.length : 0,
    timestamp: new Date().toISOString()
  }, 'AI model information retrieved'));
});

module.exports = router;
