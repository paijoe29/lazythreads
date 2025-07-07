const cron = require('node-cron');
const { autoReplySettings } = require('../config/settings');
const { getPostComments, sendReply } = require('./threadsService');
const { generateAIResponse } = require('./geminiService');
const { saveSettings, saveReplyHistory } = require('../utils/persistence');

let autoReplyJob = null;

// Start auto-reply background job
function startAutoReply() {
  if (autoReplyJob) {
    console.log('Auto-reply job already running');
    return;
  }

  // Create cron job that runs every 30 seconds (or based on settings)
  const cronExpression = `*/${Math.max(30, autoReplySettings.interval / 1000)} * * * * *`;
  
  autoReplyJob = cron.schedule(cronExpression, async () => {
    try {
      await processMonitoredPosts();
    } catch (error) {
      console.error('Error in auto-reply job:', error);
    }
  }, {
    scheduled: false
  });

  autoReplyJob.start();
  console.log(`Auto-reply job started with ${autoReplySettings.interval / 1000}s interval`);
}

// Stop auto-reply background job
function stopAutoReply() {
  if (autoReplyJob) {
    autoReplyJob.stop();
    autoReplyJob.destroy();
    autoReplyJob = null;
    console.log('Auto-reply job stopped');
  }
}

// Process all monitored posts
async function processMonitoredPosts() {
  if (!autoReplySettings.enabled || !autoReplySettings.accessToken) {
    return;
  }

  console.log(`Processing ${autoReplySettings.monitoredPosts.length} monitored posts...`);

  for (const postData of autoReplySettings.monitoredPosts) {
    try {
      await processPost(postData);
    } catch (error) {
      console.error(`Error processing post ${postData.postId}:`, error);
    }
  }
}

// Process individual post
async function processPost(postData) {
  try {
    // Get current comments
    const commentsResponse = await getPostComments(postData.postId, autoReplySettings.accessToken);
    const comments = commentsResponse.data || [];

    // Get existing reply history for this post
    const postHistory = autoReplySettings.replyHistory.get(postData.postId) || {
      repliedComments: new Set(),
      replyCount: 0,
      replies: [],
      lastReply: null
    };

    // Check if we've reached max replies for this post
    if (postHistory.replyCount >= autoReplySettings.maxRepliesPerPost) {
      console.log(`Post ${postData.postId} has reached max replies (${autoReplySettings.maxRepliesPerPost})`);
      return;
    }

    // Process new comments
    for (const comment of comments) {
      // Skip if already replied to this comment
      if (postHistory.repliedComments.has(comment.id)) {
        continue;
      }

      // Skip if we've reached max replies
      if (postHistory.replyCount >= autoReplySettings.maxRepliesPerPost) {
        break;
      }

      try {
        // Generate AI response
        const aiResponse = await generateAIResponse(
          comment.text,
          '',
          postData.content || '',
          postData.author || ''
        );

        // Send reply
        await sendReply(comment.id, aiResponse, autoReplySettings.accessToken);

        // Update history with detailed information
        if (!postHistory.replies) {
          postHistory.replies = [];
        }
        
        // Add detailed reply information
        postHistory.replies.push({
          commentId: comment.id,
          response: aiResponse,
          timestamp: new Date().toISOString(),
          commentText: comment.text,
          author: comment.username || 'Unknown'
        });
        
        postHistory.repliedComments.add(comment.id);
        postHistory.replyCount++;
        postHistory.lastReply = new Date().toISOString();
        
        autoReplySettings.replyHistory.set(postData.postId, postHistory);

        console.log(`✅ Replied to comment on post ${postData.postId}: "${aiResponse}"`);

        // Add delay between replies to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`Failed to reply to comment ${comment.id}:`, error);
      }
    }

  } catch (error) {
    console.error(`Error processing post ${postData.postId}:`, error);
  }
}

// Get auto-reply status
function getAutoReplyStatus() {
  return {
    enabled: autoReplySettings.enabled,
    running: !!autoReplyJob,
    interval: autoReplySettings.interval,
    maxRepliesPerPost: autoReplySettings.maxRepliesPerPost,
    monitoredPostsCount: autoReplySettings.monitoredPosts.length,
    totalRepliesSent: Array.from(autoReplySettings.replyHistory.values())
      .reduce((total, history) => total + history.replyCount, 0)
  };
}

// Add post to monitoring
function addMonitoredPost(postData) {
  // Check if post is already being monitored
  const exists = autoReplySettings.monitoredPosts.find(p => p.postId === postData.postId);
  if (exists) {
    throw new Error('Post is already being monitored');
  }

  autoReplySettings.monitoredPosts.push(postData);
  console.log(`Added post ${postData.postId} to monitoring`);
  
  // Save to persistence immediately
  saveSettings(autoReplySettings).catch(error => {
    console.error('⚠️ Failed to save monitored posts:', error.message);
  });
}

// Remove post from monitoring
function removeMonitoredPost(postId) {
  const index = autoReplySettings.monitoredPosts.findIndex(p => p.postId === postId);
  if (index === -1) {
    throw new Error('Post not found in monitoring list');
  }

  autoReplySettings.monitoredPosts.splice(index, 1);
  autoReplySettings.replyHistory.delete(postId);
  console.log(`Removed post ${postId} from monitoring`);
  
  // Save changes to persistence immediately
  Promise.all([
    saveSettings(autoReplySettings),
    saveReplyHistory(autoReplySettings.replyHistory)
  ]).catch(error => {
    console.error('⚠️ Failed to save after removing monitored post:', error.message);
  });
}

// Get monitored posts
function getMonitoredPosts() {
  return autoReplySettings.monitoredPosts.map(post => ({
    ...post,
    replyCount: autoReplySettings.replyHistory.get(post.postId)?.replyCount || 0,
    maxReplies: autoReplySettings.maxRepliesPerPost
  }));
}

// Get reply history
function getReplyHistory() {
  const history = [];
  for (const [postId, data] of autoReplySettings.replyHistory) {
    const post = autoReplySettings.monitoredPosts.find(p => p.postId === postId);
    
    // If there are detailed replies, create an entry for each reply
    if (data.replies && data.replies.length > 0) {
      data.replies.forEach(reply => {
        history.push({
          postId,
          postUrl: post?.url || '',
          response: reply.response,
          commentId: reply.commentId,
          commentText: reply.commentText,
          author: reply.author,
          timestamp: reply.timestamp,
          replyCount: 1
        });
      });
    } else {
      // Fallback for old format data
      history.push({
        postId,
        postUrl: post?.url || '',
        replyCount: data.replyCount || 0,
        repliedComments: Array.from(data.repliedComments || []),
        timestamp: data.lastReply || new Date().toISOString(),
        response: 'No response text (old format)'
      });
    }
  }
  
  // Sort by timestamp (newest first)
  return history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// Clear reply history
function clearReplyHistory() {
  autoReplySettings.replyHistory.clear();
  console.log('Reply history cleared');
}

module.exports = {
  startAutoReply,
  stopAutoReply,
  getAutoReplyStatus,
  addMonitoredPost,
  removeMonitoredPost,
  getMonitoredPosts,
  getReplyHistory,
  clearReplyHistory,
  processMonitoredPosts
};
