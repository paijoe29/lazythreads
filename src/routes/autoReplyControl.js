const express = require('express');
const router = express.Router();
const { 
  startAutoReply, 
  stopAutoReply, 
  getAutoReplyStatus,
  getReplyHistory,
  clearReplyHistory
} = require('../services/autoReplyService');
const { autoReplySettings } = require('../config/settings');
const { successResponse, errorResponse } = require('../utils/helpers');

// Start auto-reply
router.post('/auto-reply/start', (req, res) => {
  try {
    if (!autoReplySettings.accessToken) {
      return res.status(400).json(errorResponse('Access token not configured'));
    }

    if (!autoReplySettings.geminiApiKey) {
      return res.status(400).json(errorResponse('Gemini API key not configured'));
    }

    if (autoReplySettings.monitoredPosts.length === 0) {
      return res.status(400).json(errorResponse('No posts to monitor'));
    }

    startAutoReply();
    autoReplySettings.enabled = true;

    res.json(successResponse({
      status: 'started',
      monitoredPostsCount: autoReplySettings.monitoredPosts.length,
      interval: autoReplySettings.interval / 1000,
      maxRepliesPerPost: autoReplySettings.maxRepliesPerPost
    }, 'Auto-reply started successfully'));

  } catch (error) {
    console.error('Error starting auto-reply:', error);
    res.status(500).json(errorResponse('Failed to start auto-reply', error.message));
  }
});

// Stop auto-reply
router.post('/auto-reply/stop', (req, res) => {
  try {
    stopAutoReply();
    autoReplySettings.enabled = false;

    res.json(successResponse({
      status: 'stopped',
      timestamp: new Date().toISOString()
    }, 'Auto-reply stopped successfully'));

  } catch (error) {
    console.error('Error stopping auto-reply:', error);
    res.status(500).json(errorResponse('Failed to stop auto-reply', error.message));
  }
});

// Get auto-reply status
router.get('/auto-reply/status', (req, res) => {
  try {
    const status = getAutoReplyStatus();

    res.json(successResponse({
      ...status,
      configuration: {
        hasAccessToken: !!autoReplySettings.accessToken,
        hasGeminiKey: !!autoReplySettings.geminiApiKey,
        intervalSeconds: autoReplySettings.interval / 1000,
        customPromptLength: autoReplySettings.customPrompt.length
      },
      timestamp: new Date().toISOString()
    }, 'Auto-reply status retrieved'));

  } catch (error) {
    console.error('Error getting auto-reply status:', error);
    res.status(500).json(errorResponse('Failed to get auto-reply status', error.message));
  }
});

// Get reply history
router.get('/reply-history', (req, res) => {
  try {
    const history = getReplyHistory();

    res.json(successResponse({
      history: history,
      totalReplies: history.reduce((sum, item) => sum + item.replyCount, 0),
      timestamp: new Date().toISOString()
    }, 'Reply history retrieved successfully'));

  } catch (error) {
    console.error('Error getting reply history:', error);
    res.status(500).json(errorResponse('Failed to get reply history', error.message));
  }
});

// Clear reply history
router.delete('/reply-history', (req, res) => {
  try {
    clearReplyHistory();

    res.json(successResponse({
      cleared: true,
      timestamp: new Date().toISOString()
    }, 'Reply history cleared successfully'));

  } catch (error) {
    console.error('Error clearing reply history:', error);
    res.status(500).json(errorResponse('Failed to clear reply history', error.message));
  }
});

module.exports = router;
