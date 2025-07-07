const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { port, initializeSettings } = require('./src/config/settings');
const { initializeGemini } = require('./src/services/geminiService');
const { startAutoReply, getAutoReplyStatus } = require('./src/services/autoReplyService');
const { autoReplySettings } = require('./src/config/settings');
const { gracefulShutdown } = require('./src/utils/persistence');
const { isSupabaseConfigured } = require('./src/config/supabase');
const { requireAuth, optionalAuth } = require('./src/middleware/auth');

// Import route modules
const manualReplyRoutes = require('./src/routes/manualReply');
const settingsRoutes = require('./src/routes/settings');
const tokenVerificationRoutes = require('./src/routes/tokenVerification');
const postManagementRoutes = require('./src/routes/postManagement');
const autoReplyControlRoutes = require('./src/routes/autoReplyControl');
const autopostRoutes = require('./src/routes/autopost');
const authRoutes = require('./src/routes/auth');

const app = express();

// Initialize persistence and settings
async function initializeApp() {
  try {
    console.log('🔄 Initializing application with persistence...');
    
    // Initialize Gemini AI
    initializeGemini();
    
    // Initialize persistent settings
    const persistenceResult = await initializeSettings();
    console.log('🎯 Persistence initialization:', persistenceResult);
    
    return persistenceResult;
  } catch (error) {
    console.error('❌ Error during app initialization:', error.message);
    return { error: error.message };
  }
}

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Routes
app.use('/api/auth', authRoutes);

// All routes require authentication if Supabase is configured
const protectedMiddleware = isSupabaseConfigured() ? requireAuth : optionalAuth;

app.use('/api', protectedMiddleware, manualReplyRoutes);
app.use('/api', protectedMiddleware, settingsRoutes);
app.use('/api', protectedMiddleware, tokenVerificationRoutes);
app.use('/api', protectedMiddleware, postManagementRoutes);
app.use('/api', protectedMiddleware, autoReplyControlRoutes);

// Autopost routes also require authentication for security
app.use('/api', protectedMiddleware, autopostRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const status = getAutoReplyStatus();
  res.json({
    success: true,
    message: 'Server is running',
    data: {
      server: 'online',
      autoReply: status,
      timestamp: new Date().toISOString()
    }
  });
});

// Specific routes for HTML pages
app.get('/autopost.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'autopost.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/panduan-mudah.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'panduan-mudah.html'));
});

app.get('/token-guide.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'token-guide.html'));
});

// Default route for SPA (only for root and undefined routes)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    timestamp: new Date().toISOString()
  });
});

// Start server with persistence initialization
async function startServer() {
  try {
    // Initialize persistence first
    await initializeApp();
    
    app.listen(port, () => {
      console.log(`🚀 Server is running on http://localhost:${port}`);
      console.log(`📁 Static files served from: ${__dirname}/public`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`💾 Data persistence: ENABLED (saved to /data folder)`);
      
      // Initialize auto-reply if enabled in settings
      if (autoReplySettings.enabled && autoReplySettings.accessToken) {
        console.log('🤖 Auto-reply is enabled, starting background job...');
        startAutoReply();
      } else {
        console.log('⏸️ Auto-reply disabled or token not configured');
      }
      
      console.log('\n📋 Available API endpoints:');
      console.log('  POST /api/send-reply - Send manual reply');
      console.log('  POST /api/test-ai - Test AI response generation');
      console.log('  GET  /api/settings - Get current settings');
      console.log('  POST /api/settings - Update settings');
      console.log('  POST /api/verify-token - Verify access token');
      console.log('  POST /api/token-info - Get token information');
      console.log('  GET  /api/token-debug - Debug token issues');
      console.log('  POST /api/extract-post-id - Extract post ID from URL');
      console.log('  POST /api/preview-post - Preview post details');
      console.log('  POST /api/monitor-post - Add post to monitoring');
      console.log('  DELETE /api/monitor-post/:id - Remove from monitoring');
      console.log('  GET  /api/monitored-posts - Get monitored posts');
      console.log('  POST /api/auto-reply/start - Start auto-reply');
      console.log('  POST /api/auto-reply/stop - Stop auto-reply');
      console.log('  GET  /api/auto-reply/status - Get auto-reply status');
      console.log('  GET  /api/reply-history - Get reply history');
      console.log('  DELETE /api/reply-history - Clear reply history');
      console.log('  POST /api/autopost/generate - Generate AI post');
      console.log('  POST /api/autopost/draft - Save post draft');
      console.log('  POST /api/autopost/publish - Publish post');
      console.log('  GET  /api/autopost/history - Get autopost history');
      console.log('  DELETE /api/autopost/history/:id - Delete history item');
      console.log('  DELETE /api/autopost/history - Clear autopost history');
      console.log('  GET  /api/autopost/settings - Get autopost settings');
      console.log('  POST /api/autopost/settings - Update autopost settings');
      console.log('  GET  /api/autopost/stats - Get autopost statistics');
      console.log('  GET  /api/health - Health check');
      console.log('\n✅ Server initialization complete!');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Received SIGINT, performing graceful shutdown...');
  await gracefulShutdown(autoReplySettings);
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔄 Received SIGTERM, performing graceful shutdown...');
  await gracefulShutdown(autoReplySettings);
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
