const express = require('express');
const router = express.Router();
const { getPostDetails, getPostComments, findPostIdBySlug } = require('../services/threadsService');
const { 
  addMonitoredPost, 
  removeMonitoredPost, 
  getMonitoredPosts 
} = require('../services/autoReplyService');
const { autoReplySettings } = require('../config/settings');
const { 
  extractPostIdFromUrl, 
  validatePostId, 
  isThreadsUrl,
  successResponse, 
  errorResponse 
} = require('../utils/helpers');

// Extract Post ID from URL
router.post('/extract-post-id', async (req, res) => {
  try {
    const { url } = req.body;
    
    console.log('Extract Post ID request received:', { url, type: typeof url });

    if (!url || url.trim() === '' || url === 'undefined') {
      return res.status(400).json(errorResponse('URL is required'));
    }

    // Check if it's already a numeric Post ID
    if (/^\d{15,}$/.test(url.trim())) {
      return res.json(successResponse({
        extractedId: url.trim(),
        originalUrl: url,
        isValid: true
      }, 'Post ID extracted successfully'));
    }

    // If it's a Threads URL, extract the slug and try to get numeric Post ID via API
    if (isThreadsUrl(url)) {
      const token = autoReplySettings.accessToken;
      if (!token) {
        return res.status(400).json(errorResponse('Access token required to extract Post ID from URL', {
          providedUrl: url,
          solution: 'Please configure your access token first, then try again'
        }));
      }

      // Extract the slug from URL (like DLjXdCbzSlm)
      const urlSlug = extractPostIdFromUrl(url);
      if (!urlSlug) {
        return res.status(400).json(errorResponse('Could not extract post identifier from URL', {
          providedUrl: url,
          note: 'URL format not recognized'
        }));
      }

      console.log('Extracted URL slug:', urlSlug);

      // Try to find the numeric Post ID using Meta API
      try {
        console.log('Attempting to find numeric Post ID for slug:', urlSlug);
        const numericPostId = await findPostIdBySlug(urlSlug, token);
        
        if (numericPostId) {
          console.log('Found numeric Post ID:', numericPostId);
          return res.json(successResponse({
            extractedId: numericPostId,
            originalUrl: url,
            extractedSlug: urlSlug,
            isValid: true
          }, 'Post ID extracted successfully from URL'));
        } else {
          console.log('No matching post found in user\'s recent posts');
          return res.status(404).json(errorResponse(
            'Post not found in your recent posts',
            {
              extractedSlug: urlSlug,
              originalUrl: url,
              explanation: 'The post may be from another user, older than your recent posts, or private',
              suggestions: [
                'Make sure the post is from your own account',
                'Try with a more recent post',
                'Check if the post URL is correct and accessible'
              ]
            }
          ));
        }
      } catch (error) {
        console.error('Error finding Post ID by slug:', error);
        return res.status(500).json(errorResponse(
          'Failed to extract Post ID from URL',
          {
            extractedSlug: urlSlug,
            originalUrl: url,
            error: error.message,
            note: 'API call to find matching post failed'
          }
        ));
      }

      // Fallback error
      return res.status(400).json(errorResponse('Could not process Threads URL', {
        providedUrl: url,
        extractedSlug: urlSlug
      }));
    }

    // Not a Threads URL
    return res.status(400).json(errorResponse('Invalid input format', {
      providedUrl: url,
      supportedFormats: [
        'https://threads.net/@username/post/SLUG',
        'https://www.threads.com/@username/post/SLUG', 
        'Direct numeric Post ID (15+ digits)'
      ]
    }));

  } catch (error) {
    console.error('Error extracting post ID:', error);
    res.status(500).json(errorResponse('Failed to extract Post ID', error.message));
  }
});

// Preview post details
router.post('/preview-post', async (req, res) => {
  try {
    const { postId } = req.body;

    console.log('Preview post request received:', { postId, type: typeof postId });

    if (!postId || postId === 'undefined' || postId.trim() === '') {
      return res.status(400).json(errorResponse('Post ID is required'));
    }

    if (!validatePostId(postId)) {
      return res.status(400).json(errorResponse('Invalid Post ID format'));
    }

    const token = autoReplySettings.accessToken;
    if (!token) {
      return res.status(400).json(errorResponse('Access token not configured'));
    }

    const postDetails = await getPostDetails(postId, token);

    console.log('Post details retrieved:', postDetails);

    // Handle CAROUSEL_ALBUM media - get all images from children
    let mediaUrl = postDetails.media_url;
    let thumbnailUrl = null;
    let mediaUrls = [];
    
    console.log('Debug CAROUSEL processing:');
    console.log('- Media type:', postDetails.media_type);
    console.log('- Has children:', !!postDetails.children);
    if (postDetails.children) {
      console.log('- Children structure:', JSON.stringify(postDetails.children, null, 2));
    }
    
    if (postDetails.media_type === 'CAROUSEL_ALBUM' && postDetails.children && postDetails.children.data) {
      // Get all media URLs from children
      mediaUrls = postDetails.children.data
        .filter(child => child.media_url)
        .map(child => child.media_url);
      
      // Get the first child media for thumbnail
      const firstChild = postDetails.children.data[0];
      if (firstChild && firstChild.media_url) {
        thumbnailUrl = firstChild.media_url;
        mediaUrl = firstChild.media_url; // Use first image as main media
      }
      console.log(`CAROUSEL_ALBUM detected with ${postDetails.children.data.length} children, ${mediaUrls.length} media URLs`);
      console.log('Media URLs:', mediaUrls);
    }

    // Try to get comments as well for better preview
    let comments = [];
    try {
      const commentsData = await getPostComments(postId, token);
      comments = commentsData.data || [];
      console.log(`Found ${comments.length} comments for post ${postId}`);
    } catch (commentError) {
      console.warn('Could not fetch comments:', commentError.message);
      // Continue without comments
    }

    // Calculate statistics
    const repliedComments = comments.filter(comment => 
      comment.isRepliedTo || comment.hasReply || false
    ).length;

    res.json(successResponse({
      post: {
        id: postDetails.id,
        text: postDetails.text || 'No text content',
        username: postDetails.username || 'Unknown',
        timestamp: postDetails.timestamp,
        permalink: postDetails.permalink,
        media_type: postDetails.media_type || 'TEXT',
        mediaType: postDetails.media_type || 'TEXT', // For client consistency
        mediaUrl: mediaUrl, // Use processed media URL
        mediaUrls: mediaUrls, // Array of all media URLs for carousel
        thumbnailUrl: thumbnailUrl, // Additional thumbnail for albums
        childrenCount: postDetails.children?.data?.length || 0, // Number of items in album
        // Add friendly media description
        mediaDescription: postDetails.media_type ? 
          (postDetails.media_type === 'CAROUSEL_ALBUM' ? `Photo Album (${postDetails.children?.data?.length || 0} items)` :
           postDetails.media_type === 'VIDEO' ? 'Video Content' :
           postDetails.media_type === 'IMAGE' ? 'Image' :
           postDetails.media_type === 'TEXT' ? 'Text Only' :
           postDetails.media_type.replace('_', ' ').toLowerCase()) : 'Text Only'
      },
      comments: comments.map(comment => ({
        id: comment.id,
        text: comment.text || '',
        username: comment.username || 'Unknown',
        timestamp: comment.timestamp,
        isRepliedTo: false // We'll implement this later with reply tracking
      })),
      stats: {
        isMonitored: false, // We'll check if this post is being monitored
        commentCount: comments.length,
        totalComments: comments.length,
        repliedComments: repliedComments,
        pendingComments: comments.length - repliedComments,
        isValidForMonitoring: true
      }
    }, 'Post preview retrieved successfully'));

  } catch (error) {
    console.error('Error previewing post:', error);
    const errorMessage = error.response?.data?.error?.message || error.message;
    res.status(500).json(errorResponse('Failed to preview post', {
      message: errorMessage,
      postId: req.body.postId,
      suggestions: [
        'Verify the Post ID is correct',
        'Ensure the post is public',
        'Check if the post still exists',
        'Verify your access token permissions'
      ]
    }));
  }
});

// Add post to monitoring
router.post('/monitor-post', async (req, res) => {
  try {
    const { postId, url } = req.body;

    if (!postId) {
      return res.status(400).json(errorResponse('Post ID is required'));
    }

    if (!validatePostId(postId)) {
      return res.status(400).json(errorResponse('Invalid Post ID format'));
    }

    const token = autoReplySettings.accessToken;
    if (!token) {
      return res.status(400).json(errorResponse('Access token not configured'));
    }

    // Get post details first
    let postDetails;
    try {
      postDetails = await getPostDetails(postId, token);
    } catch (error) {
      return res.status(400).json(errorResponse('Cannot monitor this post', {
        reason: 'Failed to fetch post details',
        possibleCauses: [
          'Post is private or not accessible',
          'Post ID is incorrect',
          'Post has been deleted',
          'Insufficient permissions'
        ]
      }));
    }

    // Create monitoring data
    const monitoringData = {
      postId: postDetails.id,
      url: url || postDetails.permalink || `https://threads.net/post/${postId}`,
      author: postDetails.username || 'Unknown',
      content: postDetails.text || 'No content',
      addedAt: new Date().toISOString(),
      lastChecked: null
    };

    addMonitoredPost(monitoringData);

    res.json(successResponse({
      postId: postDetails.id,
      author: postDetails.username,
      content: postDetails.text,
      addedAt: monitoringData.addedAt,
      totalMonitored: autoReplySettings.monitoredPosts.length
    }, 'Post added to monitoring successfully'));

  } catch (error) {
    if (error.message === 'Post is already being monitored') {
      return res.status(400).json(errorResponse(error.message));
    }

    console.error('Error adding post to monitoring:', error);
    res.status(500).json(errorResponse('Failed to add post to monitoring', error.message));
  }
});

// Remove post from monitoring
router.delete('/monitor-post/:postId', (req, res) => {
  try {
    const { postId } = req.params;

    removeMonitoredPost(postId);

    res.json(successResponse({
      removedPostId: postId,
      totalMonitored: autoReplySettings.monitoredPosts.length
    }, 'Post removed from monitoring successfully'));

  } catch (error) {
    if (error.message === 'Post not found in monitoring list') {
      return res.status(404).json(errorResponse(error.message));
    }

    console.error('Error removing post from monitoring:', error);
    res.status(500).json(errorResponse('Failed to remove post from monitoring', error.message));
  }
});

// Get monitored posts
router.get('/monitored-posts', (req, res) => {
  try {
    const monitoredPosts = getMonitoredPosts();

    res.json(successResponse({
      posts: monitoredPosts,
      totalCount: monitoredPosts.length,
      maxRepliesPerPost: autoReplySettings.maxRepliesPerPost
    }, 'Monitored posts retrieved successfully'));

  } catch (error) {
    console.error('Error getting monitored posts:', error);
    res.status(500).json(errorResponse('Failed to get monitored posts', error.message));
  }
});

// Test post ID validity
router.post('/test-post-id', async (req, res) => {
  try {
    const { postId } = req.body;

    if (!postId) {
      return res.status(400).json(errorResponse('Post ID is required'));
    }

    const token = autoReplySettings.accessToken;
    if (!token) {
      return res.status(400).json(errorResponse('Access token not configured'));
    }

    // Test by trying to fetch post details
    const postDetails = await getPostDetails(postId, token);

    res.json(successResponse({
      postId: postDetails.id,
      isValid: true,
      isAccessible: true,
      author: postDetails.username,
      hasContent: !!postDetails.text,
      timestamp: postDetails.timestamp
    }, 'Post ID is valid and accessible'));

  } catch (error) {
    console.error('Post ID test failed:', error);
    const errorMessage = error.response?.data?.error?.message || error.message;
    
    res.json(successResponse({
      postId: req.body.postId,
      isValid: false,
      isAccessible: false,
      error: errorMessage,
      suggestions: [
        'Pastikan URL Threads valid dan post masih exist',
        'Pastikan post bersifat public',
        'Coba dengan URL yang lebih baru',
        'Test dengan post dari akun Anda sendiri'
      ]
    }, 'Post ID test completed'));
  }
});

// Resolve post ID from various input formats
router.post('/resolve-post-id', async (req, res) => {
  try {
    const { input } = req.body;

    if (!input) {
      return res.status(400).json(errorResponse('Input is required'));
    }

    let resolvedId = input.trim();

    // Try to extract from URL if it looks like a URL
    if (input.includes('threads.')) {
      const extracted = extractPostIdFromUrl(input);
      if (extracted) {
        resolvedId = extracted;
      }
    }

    // Validate the resolved ID
    if (!validatePostId(resolvedId)) {
      return res.status(400).json(errorResponse('Could not resolve to a valid Post ID', {
        providedInput: input,
        resolvedId: resolvedId
      }));
    }

    res.json(successResponse({
      originalInput: input,
      resolvedId: resolvedId,
      isValid: true,
      extractedFromUrl: input !== resolvedId
    }, 'Post ID resolved successfully'));

  } catch (error) {
    console.error('Error resolving post ID:', error);
    res.status(500).json(errorResponse('Failed to resolve Post ID', error.message));
  }
});

module.exports = router;
