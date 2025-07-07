const axios = require('axios');

// Make API call to Threads
async function makeThreadsAPICall(url, method = 'GET', data = null, accessToken) {
  try {
    const config = {
      method,
      url,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error('Threads API call failed:', error.response?.data || error.message);
    throw error;
  }
}

// Verify access token
async function verifyAccessToken(accessToken) {
  try {
    const url = `https://graph.threads.net/v1.0/me?fields=id,username,name&access_token=${accessToken}`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Token verification failed:', error.response?.data || error.message);
    throw error;
  }
}

// Get user profile information  
async function getUserProfile(accessToken) {
  try {
    const url = `https://graph.threads.net/v1.0/me?fields=id,username,name&access_token=${accessToken}`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Failed to get user profile:', error.response?.data || error.message);
    throw error;
  }
}

// Get user's posts to find matching post by URL slug
async function getUserPosts(accessToken, limit = 25) {
  try {
    const url = `https://graph.threads.net/v1.0/me/threads?fields=id,text,permalink,timestamp,media_type&limit=${limit}&access_token=${accessToken}`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Failed to get user posts:', error.response?.data || error.message);
    throw error;
  }
}

// Try to find Post ID by matching URL slug in user's posts
async function findPostIdBySlug(urlSlug, accessToken) {
  try {
    const userPosts = await getUserPosts(accessToken, 100); // Get more posts to increase chance of finding
    
    if (userPosts.data) {
      for (const post of userPosts.data) {
        if (post.permalink && post.permalink.includes(urlSlug)) {
          return post.id;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Failed to find post by slug:', error.response?.data || error.message);
    throw error;
  }
}

// Get post details
async function getPostDetails(postId, accessToken) {
  try {
    const url = `https://graph.threads.net/v1.0/${postId}?fields=id,text,permalink,timestamp,username,media_type,media_url,children{id,media_type,media_url}&access_token=${accessToken}`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Failed to get post details:', error.response?.data || error.message);
    throw error;
  }
}

// Get post comments
async function getPostComments(postId, accessToken) {
  try {
    const url = `https://graph.threads.net/v1.0/${postId}/replies?fields=id,text,timestamp,username,children&access_token=${accessToken}`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Failed to get post comments:', error.response?.data || error.message);
    throw error;
  }
}

// Send reply to a comment
async function sendReply(parentId, message, accessToken) {
  try {
    console.log(`🔄 Creating reply to comment ${parentId}...`);
    
    // Step 1: Create the thread
    const createUrl = `https://graph.threads.net/v1.0/me/threads`;
    const createData = {
      media_type: 'TEXT',
      text: message,
      reply_to_id: parentId,
      access_token: accessToken
    };

    const createResponse = await axios.post(createUrl, createData);
    console.log(`✅ Thread created with ID: ${createResponse.data.id}`);

    // Step 2: Publish the thread
    const publishUrl = `https://graph.threads.net/v1.0/me/threads_publish`;
    const publishData = {
      creation_id: createResponse.data.id,
      access_token: accessToken
    };

    const publishResponse = await axios.post(publishUrl, publishData);
    console.log(`✅ Thread published successfully: ${publishResponse.data.id}`);
    
    return publishResponse.data;
  } catch (error) {
    console.error('Failed to send reply:', error.response?.data || error.message);
    throw error;
  }
}

// Create a new post on Threads
async function createPost(content, accessToken) {
  try {
    if (!accessToken) {
      throw new Error('Access token is required for posting');
    }

    // Step 1: Create media container
    const containerUrl = `https://graph.threads.net/v1.0/me/threads`;
    const containerData = {
      media_type: 'TEXT',
      text: content,
      access_token: accessToken
    };

    console.log('📝 Creating Threads post container...');
    const containerResponse = await axios.post(containerUrl, containerData);
    const containerId = containerResponse.data.id;

    if (!containerId) {
      throw new Error('Failed to create post container');
    }

    // Step 2: Publish the post
    const publishUrl = `https://graph.threads.net/v1.0/me/threads_publish`;
    const publishData = {
      creation_id: containerId,
      access_token: accessToken
    };

    console.log('📤 Publishing Threads post...');
    const publishResponse = await axios.post(publishUrl, publishData);
    const postId = publishResponse.data.id;

    if (!postId) {
      throw new Error('Failed to publish post');
    }

    console.log('✅ Post published successfully to Threads');
    return {
      id: postId,
      url: `https://threads.net/@user/post/${postId}`, // Approximate URL structure
      containerId: containerId,
      status: 'published'
    };

  } catch (error) {
    console.error('❌ Failed to create Threads post:', error.response?.data || error.message);
    throw new Error(`Failed to create Threads post: ${error.response?.data?.error?.message || error.message}`);
  }
}

// Debug token with comprehensive information
async function debugToken(accessToken) {
  const debugInfo = {
    tokenProvided: !!accessToken,
    tokenFound: !!accessToken, // Add legacy compatibility
    tokenLength: accessToken ? accessToken.length : 0,
    tokenPreview: accessToken ? `${accessToken.substring(0, 10)}...${accessToken.substring(accessToken.length - 10)}` : 'No token',
    timestamp: new Date().toISOString(),
    tests: {},
    recommendations: []
  };

  // Test 1: Basic token format
  debugInfo.tests.tokenFormat = {
    valid: accessToken && accessToken.length > 50,
    message: accessToken ? 'Token format appears valid' : 'No token provided'
  };

  // Test 2: User profile fetch
  try {
    const profile = await getUserProfile(accessToken);
    debugInfo.tests.profileFetch = {
      valid: true,
      message: 'Successfully fetched user profile',
      data: profile
    };
    
    // Add user info to main response
    debugInfo.userId = profile.id;
    debugInfo.username = profile.username;
    
  } catch (error) {
    debugInfo.tests.profileFetch = {
      valid: false,
      message: error.response?.data?.error?.message || error.message,
      errorCode: error.response?.status,
      errorData: error.response?.data
    };
  }

  // Test 3: API endpoint accessibility
  try {
    const testUrl = `https://graph.threads.net/v1.0/me?fields=id,username,name&access_token=${accessToken}`;
    const response = await axios.get(testUrl);
    debugInfo.tests.apiAccess = {
      valid: true,
      message: 'API endpoint accessible',
      responseTime: 'OK'
    };
  } catch (error) {
    debugInfo.tests.apiAccess = {
      valid: false,
      message: 'API endpoint test failed',
      error: error.response?.data || error.message
    };
  }

  // Generate recommendations based on test results
  const failedTests = Object.values(debugInfo.tests).filter(test => !test.valid);
  
  if (failedTests.length === 0) {
    debugInfo.recommendations.push({
      type: 'SUCCESS',
      message: 'Token is working correctly',
      solutions: ['Your access token is valid and has proper permissions']
    });
  } else {
    debugInfo.recommendations.push({
      type: 'ERROR',
      message: 'Token has issues that need attention',
      solutions: [
        'Check if your access token is correct',
        'Verify token permissions in Meta Developer Console',
        'Ensure token has not expired',
        'Follow the token generation guide'
      ]
    });
  }

  return debugInfo;
}

// Check if service is configured
function isConfigured() {
  // This would check if we have necessary configuration
  // For now, just return true since we're using the access token from settings
  return true;
}

module.exports = {
  makeThreadsAPICall,
  verifyAccessToken,
  getUserProfile,
  getPostDetails,
  getPostComments,
  sendReply,
  getUserPosts,
  findPostIdBySlug,
  debugToken,
  createPost,
  isConfigured
};
