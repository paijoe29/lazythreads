const express = require('express');
const router = express.Router();
const { verifyAccessToken, getUserProfile, debugToken } = require('../services/threadsService');
const { autoReplySettings } = require('../config/settings');
const { successResponse, errorResponse } = require('../utils/helpers');

// Verify access token
router.post('/verify-token', async (req, res) => {
  try {
    const { accessToken } = req.body;
    const token = accessToken || autoReplySettings.accessToken;

    if (!token) {
      return res.status(400).json(errorResponse('Access token is required'));
    }

    const userInfo = await verifyAccessToken(token);
    
    res.json(successResponse({
      valid: true,
      userInfo: userInfo,
      tokenSource: accessToken ? 'provided' : 'environment'
    }, 'Token verified successfully'));

  } catch (error) {
    console.error('Token verification failed:', error);
    const errorMessage = error.response?.data?.error?.message || error.message;
    res.status(400).json(errorResponse('Token verification failed', {
      message: errorMessage,
      statusCode: error.response?.status,
      errorData: error.response?.data
    }));
  }
});

// Get token information
router.post('/token-info', async (req, res) => {
  try {
    const { accessToken } = req.body;
    const token = accessToken || autoReplySettings.accessToken;

    if (!token) {
      return res.status(400).json(errorResponse('Access token is required'));
    }

    const userProfile = await getUserProfile(token);
    
    res.json(successResponse({
      userProfile: userProfile,
      tokenLength: token.length,
      tokenPreview: `${token.substring(0, 10)}...${token.substring(token.length - 10)}`,
      tokenSource: accessToken ? 'manually_provided' : 'from_environment',
      timestamp: new Date().toISOString()
    }, 'Token information retrieved successfully'));

  } catch (error) {
    console.error('Failed to get token info:', error);
    const errorMessage = error.response?.data?.error?.message || error.message;
    res.status(500).json(errorResponse('Failed to get token information', {
      message: errorMessage,
      suggestions: [
        'Verify that the token is still valid',
        'Check if the token has the required permissions',
        'Ensure the token is for the correct Threads account'
      ]
    }));
  }
});

// Debug token with comprehensive testing
router.get('/token-debug', async (req, res) => {
  try {
    const token = autoReplySettings.accessToken;

    if (!token) {
      return res.json(successResponse({
        status: 'no_token',
        message: 'No access token configured',
        suggestions: [
          'Add THREADS_ACCESS_TOKEN to your .env file',
          'Provide token in the settings page',
          'Follow the token generation guide'
        ]
      }, 'Token debug completed - no token found'));
    }

    const debugInfo = await debugToken(token);
    
    res.json(successResponse(debugInfo, 'Token debug completed'));

  } catch (error) {
    console.error('Token debug failed:', error);
    res.status(500).json(errorResponse('Token debug failed', error.message));
  }
});

module.exports = router;
