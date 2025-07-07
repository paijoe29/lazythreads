const express = require('express');
const router = express.Router();
const { sendReply } = require('../services/threadsService');
const { generateAIResponse } = require('../services/geminiService');
const { autoReplySettings } = require('../config/settings');
const { successResponse, errorResponse } = require('../utils/helpers');

// Send manual reply
router.post('/send-reply', async (req, res) => {
  try {
    const { postId, commentId, message, useAI, commentText, accessToken, tempGeminiKey } = req.body;

    if (!postId && !commentId) {
      return res.status(400).json(errorResponse('Post ID or Comment ID is required'));
    }

    // Use provided token or default from settings
    const token = accessToken || autoReplySettings.accessToken;
    if (!token) {
      return res.status(400).json(errorResponse('Access token is required'));
    }

    let replyMessage = message;

    // Generate AI response if requested
    if (useAI && !message) {
      try {
        if (!commentText) {
          return res.status(400).json(errorResponse('Comment text is required for AI generation'));
        }

        // Temporarily update Gemini API key if provided
        const originalKey = autoReplySettings.geminiApiKey;
        if (tempGeminiKey) {
          autoReplySettings.geminiApiKey = tempGeminiKey;
          const { updateGeminiApiKey } = require('../services/geminiService');
          updateGeminiApiKey(tempGeminiKey);
        }

        replyMessage = await generateAIResponse(commentText);

        // Restore original key if temporarily changed
        if (tempGeminiKey && originalKey) {
          autoReplySettings.geminiApiKey = originalKey;
          const { updateGeminiApiKey } = require('../services/geminiService');
          updateGeminiApiKey(originalKey);
        }

      } catch (aiError) {
        console.error('AI generation failed:', aiError);
        return res.status(500).json(errorResponse('Failed to generate AI response', aiError.message));
      }
    }

    if (!replyMessage) {
      return res.status(400).json(errorResponse('Reply message is required'));
    }

    // Send the reply
    const targetId = commentId || postId;
    const result = await sendReply(targetId, replyMessage, token);

    res.json(successResponse({
      replyId: result.id,
      message: replyMessage,
      targetId: targetId,
      aiGenerated: useAI && !message
    }, 'Reply sent successfully'));

  } catch (error) {
    console.error('Error sending reply:', error);
    const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to send reply';
    res.status(500).json(errorResponse(errorMessage, error.response?.data));
  }
});

// Test AI response generation
router.post('/test-ai', async (req, res) => {
  try {
    const { commentText, customPrompt, tempGeminiKey } = req.body;

    if (!commentText) {
      return res.status(400).json(errorResponse('Comment text is required'));
    }

    // Temporarily update settings if provided
    const originalPrompt = autoReplySettings.customPrompt;
    const originalKey = autoReplySettings.geminiApiKey;

    if (customPrompt) {
      autoReplySettings.customPrompt = customPrompt;
    }

    if (tempGeminiKey) {
      autoReplySettings.geminiApiKey = tempGeminiKey;
      const { updateGeminiApiKey } = require('../services/geminiService');
      updateGeminiApiKey(tempGeminiKey);
    }

    try {
      const aiResponse = await generateAIResponse(commentText);
      
      res.json(successResponse({
        originalComment: commentText,
        aiResponse: aiResponse,
        promptUsed: autoReplySettings.customPrompt
      }, 'AI response generated successfully'));

    } finally {
      // Restore original settings
      if (customPrompt) {
        autoReplySettings.customPrompt = originalPrompt;
      }
      if (tempGeminiKey && originalKey) {
        autoReplySettings.geminiApiKey = originalKey;
        const { updateGeminiApiKey } = require('../services/geminiService');
        updateGeminiApiKey(originalKey);
      }
    }

  } catch (error) {
    console.error('Error testing AI:', error);
    res.status(500).json(errorResponse('Failed to generate AI response', error.message));
  }
});

module.exports = router;
