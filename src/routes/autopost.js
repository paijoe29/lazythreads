const express = require('express');
const router = express.Router();
const { autopostService } = require('../services/autopostService');

// Generate new post
router.post('/autopost/generate', async (req, res) => {
  try {
    const { idea, style, length, targetAudience, includeHashtags, includeEmojis, includeCTA } = req.body;
    
    // Validate required fields
    if (!idea || !idea.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Post idea is required',
        timestamp: new Date().toISOString()
      });
    }

    const postData = {
      idea: idea.trim(),
      style: style || 'casual',
      length: length || 'medium',
      targetAudience: targetAudience || '',
      includeHashtags: includeHashtags === true,
      includeEmojis: includeEmojis === true,
      includeCTA: includeCTA === true
    };

    console.log('📝 Generating post for user:', req.user?.id || 'anonymous');
    console.log('💭 Post idea:', postData.idea.substring(0, 100) + '...');

    const result = await autopostService.generatePost(postData, req.user?.id);

    res.json({
      success: true,
      message: 'Post generated successfully',
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in /autopost/generate:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate post',
      timestamp: new Date().toISOString()
    });
  }
});

// Save draft
router.post('/autopost/draft', async (req, res) => {
  try {
    const { content, metadata } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Content is required',
        timestamp: new Date().toISOString()
      });
    }

    console.log('💾 Saving draft for user:', req.user?.id || 'anonymous');

    const draft = await autopostService.saveDraft(
      content.trim(), 
      metadata || {}, 
      req.user?.id
    );

    res.json({
      success: true,
      message: 'Draft saved successfully',
      data: draft,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in /autopost/draft:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to save draft',
      timestamp: new Date().toISOString()
    });
  }
});

// Publish post
router.post('/autopost/publish', async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Content is required',
        timestamp: new Date().toISOString()
      });
    }

    console.log('📤 Publishing post for user:', req.user?.id || 'anonymous');

    const publishedPost = await autopostService.publishPost(
      content.trim(), 
      req.user?.id
    );

    res.json({
      success: true,
      message: 'Post published successfully',
      data: publishedPost,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in /autopost/publish:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to publish post',
      timestamp: new Date().toISOString()
    });
  }
});

// Get post history
router.get('/autopost/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const userId = req.user?.id;

    console.log('📋 Getting history for user:', userId || 'anonymous');

    const history = await autopostService.getHistory(userId, limit);

    res.json({
      success: true,
      message: 'History retrieved successfully',
      data: history,
      count: history.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in /autopost/history:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get history',
      timestamp: new Date().toISOString()
    });
  }
});

// Delete specific history item
router.delete('/autopost/history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'History item ID is required',
        timestamp: new Date().toISOString()
      });
    }

    console.log('🗑️ Deleting history item:', id, 'for user:', userId || 'anonymous');

    await autopostService.deleteHistoryItem(id, userId);

    res.json({
      success: true,
      message: 'History item deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in /autopost/history/:id DELETE:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete history item',
      timestamp: new Date().toISOString()
    });
  }
});

// Clear all history
router.delete('/autopost/history', async (req, res) => {
  try {
    const userId = req.user?.id;

    console.log('🗑️ Clearing all history for user:', userId || 'anonymous');

    await autopostService.clearHistory(userId);

    res.json({
      success: true,
      message: 'History cleared successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in /autopost/history DELETE:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to clear history',
      timestamp: new Date().toISOString()
    });
  }
});

// Get settings
router.get('/autopost/settings', async (req, res) => {
  try {
    console.log('⚙️ Getting settings for user:', req.user?.id || 'anonymous');

    const settings = await autopostService.getSettings();

    res.json({
      success: true,
      message: 'Settings retrieved successfully',
      data: settings,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in /autopost/settings GET:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get settings',
      timestamp: new Date().toISOString()
    });
  }
});

// Update settings
router.post('/autopost/settings', async (req, res) => {
  try {
    const { aiProvider, systemPrompt, autoSaveDrafts, defaultHashtags, defaultEmojis } = req.body;

    console.log('⚙️ Updating settings for user:', req.user?.id || 'anonymous');

    const newSettings = {
      aiProvider: aiProvider || 'gemini',
      systemPrompt: systemPrompt || '',
      autoSaveDrafts: autoSaveDrafts !== false,
      defaultHashtags: defaultHashtags !== false,
      defaultEmojis: defaultEmojis !== false
    };

    const updatedSettings = await autopostService.updateSettings(newSettings);

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: updatedSettings,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in /autopost/settings POST:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update settings',
      timestamp: new Date().toISOString()
    });
  }
});

// Reset settings to default
router.post('/autopost/settings/reset', async (req, res) => {
  try {
    console.log('🔄 Resetting settings for user:', req.user?.id || 'anonymous');

    const defaultSettings = await autopostService.resetSettings();

    res.json({
      success: true,
      message: 'Settings reset to defaults successfully',
      data: defaultSettings,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in /autopost/settings/reset:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to reset settings',
      timestamp: new Date().toISOString()
    });
  }
});

// Get statistics
router.get('/autopost/stats', async (req, res) => {
  try {
    const userId = req.user?.id;

    console.log('📊 Getting stats for user:', userId || 'anonymous');

    const stats = autopostService.getStats(userId);

    res.json({
      success: true,
      message: 'Statistics retrieved successfully',
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in /autopost/stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get statistics',
      timestamp: new Date().toISOString()
    });
  }
});

// Test AI connection
router.post('/autopost/test-ai', async (req, res) => {
  try {
    console.log('🧪 Testing AI connection for user:', req.user?.id || 'anonymous');

    const testResult = await autopostService.generatePost({
      idea: 'Test AI connection',
      style: 'casual',
      length: 'short',
      includeHashtags: false,
      includeEmojis: false,
      includeCTA: false
    }, req.user?.id);

    res.json({
      success: true,
      message: 'AI connection test successful',
      data: {
        content: testResult.content,
        characters: testResult.content.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in /autopost/test-ai:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'AI connection test failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Health check for autopost service
router.get('/autopost/health', async (req, res) => {
  try {
    const stats = autopostService.getStats();
    const settings = await autopostService.getSettings();

    res.json({
      success: true,
      message: 'Autopost service is healthy',
      data: {
        service: 'online',
        aiProvider: settings.aiProvider,
        totalPosts: stats.totalPosts,
        lastActivity: stats.lastPost
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in /autopost/health:', error);
    res.status(500).json({
      success: false,
      message: 'Autopost service health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
