// Neobrutalism Dashboard JavaScript

// Authentication management
class AuthManager {
  constructor() {
    this.token = localStorage.getItem('supabase_token');
    this.userData = JSON.parse(localStorage.getItem('user_data') || 'null');
    this.baseURL = window.location.origin;
  }

  isAuthenticated() {
    return !!this.token;
  }

  getAuthHeaders() {
    return this.token ? {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    } : {
      'Content-Type': 'application/json'
    };
  }

  async checkAuthStatus() {
    // Check if authentication is required
    try {
      const response = await fetch(`${this.baseURL}/api/auth/status`);
      const result = await response.json();
      
      if (result.data.configured && !this.isAuthenticated()) {
        // Auth is required but user is not logged in
        window.location.href = '/login.html';
        return false;
      }
      
      if (this.isAuthenticated()) {
        // Verify token is still valid
        const userResponse = await fetch(`${this.baseURL}/api/auth/user`, {
          headers: this.getAuthHeaders()
        });
        
        if (!userResponse.ok) {
          // Token is invalid, clear and redirect
          this.logout();
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Auth check failed:', error);
      return true; // Allow access if check fails
    }
  }

  logout() {
    localStorage.removeItem('supabase_token');
    localStorage.removeItem('user_data');
    window.location.href = '/login.html';
  }

  async makeAuthenticatedRequest(url, options = {}) {
    const headers = {
      ...this.getAuthHeaders(),
      ...options.headers
    };

    return fetch(url, {
      ...options,
      headers
    });
  }

  async logout() {
    try {
      // Clear local storage
      localStorage.removeItem('supabase_token');
      localStorage.removeItem('user_data');
      
      // Reset class properties
      this.token = null;
      this.userData = null;
      
      // Redirect to login page
      window.location.href = '/login.html';
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
}

// Global auth manager instance
const authManager = new AuthManager();

// Check authentication on page load
document.addEventListener('DOMContentLoaded', async () => {
  const isAllowed = await authManager.checkAuthStatus();
  if (!isAllowed) return;
  
  // Initialize dashboard if authenticated
  initializeDashboard();
});

function initializeDashboard() {
  // Update navbar with user info if authenticated
  if (authManager.isAuthenticated()) {
    updateNavbarWithUser();
  }
  
  // Only load dashboard-specific data if we're on the main dashboard page
  const isMainDashboard = document.getElementById('monitored-list') !== null;
  
  if (isMainDashboard) {
    // Load initial data for main dashboard
    loadSettings();
    loadMonitoredPosts();
  }
}

// Tab functionality
function switchTab(tabName) {
  // Hide all tab contents
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Remove active class from all nav items
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Clear debug results if switching away from auto tab
  if (tabName !== 'auto') {
    closeDebugResults();
  }
  
  // Show selected tab
  document.getElementById(`${tabName}-tab`).classList.add('active');
  
  // Add active class to clicked nav item
  const clickedNav = document.querySelector(`[data-tab="${tabName}"]`);
  if (clickedNav) {
    clickedNav.classList.add('active');
  }
  
  // Update mobile menu active state
  updateMobileMenuActiveTab();
  
  // Update page title
  const titles = {
    'manual': 'MANUAL REPLY',
    'auto': 'AUTO SETTINGS',
    'monitoring': 'AUTO REPLY',
    'history': 'HISTORY'
  };
  
  document.getElementById('page-title').textContent = titles[tabName] || 'DASHBOARD';
  
  // Close mobile menu if open
  closeMobileMenu();
  
  // Load data for specific tabs
  if (tabName === 'auto') {
    loadSettings();
  } else if (tabName === 'monitoring') {
    loadMonitoredPosts();
  } else if (tabName === 'history') {
    loadReplyHistory();
  }
}

// Mobile menu functionality
function toggleMobileMenu() {
  const overlay = document.getElementById('mobile-menu-overlay');
  const panel = document.getElementById('mobile-menu-panel');
  const toggle = document.querySelector('.mobile-menu-toggle');
  
  if (overlay && panel && toggle) {
    const isOpen = panel.classList.contains('show');
    
    if (isOpen) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  }
}

function openMobileMenu() {
  const overlay = document.getElementById('mobile-menu-overlay');
  const panel = document.getElementById('mobile-menu-panel');
  const toggle = document.querySelector('.mobile-menu-toggle');
  
  if (overlay && panel && toggle) {
    overlay.classList.add('show');
    panel.classList.add('show');
    toggle.classList.add('active');
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    // Update mobile menu status
    updateMobileMenuStatus();
  }
}

function closeMobileMenu() {
  const overlay = document.getElementById('mobile-menu-overlay');
  const panel = document.getElementById('mobile-menu-panel');
  const toggle = document.querySelector('.mobile-menu-toggle');
  
  if (overlay && panel && toggle) {
    overlay.classList.remove('show');
    panel.classList.remove('show');
    toggle.classList.remove('active');
    
    // Restore body scroll
    document.body.style.overflow = '';
  }
}

function updateMobileMenuStatus() {
  const mobileConnectionStatus = document.getElementById('mobile-connection-status');
  const mainConnectionStatus = document.getElementById('connection-status');
  
  if (mobileConnectionStatus && mainConnectionStatus) {
    mobileConnectionStatus.style.backgroundColor = mainConnectionStatus.style.backgroundColor || '#00ff00';
  }
}

function updateMobileMenuActiveTab() {
  const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
  const activeTab = document.querySelector('.nav-item.active')?.getAttribute('data-tab');
  
  mobileNavItems.forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('data-tab') === activeTab) {
      item.classList.add('active');
    }
  });
}

// Close mobile menu when pressing Escape key
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    closeMobileMenu();
  }
});

// Close mobile menu on window resize if screen becomes large
window.addEventListener('resize', function() {
  if (window.innerWidth > 768) {
    closeMobileMenu();
  }
});

// Initialize app on page load
document.addEventListener('DOMContentLoaded', function() {
  // App initialization
  console.log('🚀 Dashboard initialized');
  
  // Load monitoring tab by default
  loadMonitoredPosts();
});

// Monitor for debug operations
const observer = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    if (mutation.type === 'childList' || mutation.type === 'attributes') {
      // Check if debug results are being shown/hidden
      const debugContainer = document.getElementById('debug-results');
      if (debugContainer && (debugContainer.style.display === 'block' || debugContainer.innerHTML !== '')) {
        console.log('🔧 DOM mutation detected for debug results');
      }
    }
  });
});

// Start observing for debug changes
document.addEventListener('DOMContentLoaded', function() {
  const targetNode = document.getElementById('auto-tab');
  if (targetNode) {
    observer.observe(targetNode, { 
      childList: true, 
      subtree: true, 
      attributes: true, 
      attributeFilter: ['style'] 
    });
  }
  
  // Add event listeners for new Post ID extraction features
  const extractBtn = document.getElementById('extract-id-btn');
  if (extractBtn) {
    extractBtn.addEventListener('click', extractPostId);
  }
  
  const copyBtn = document.getElementById('copy-extracted-id');
  if (copyBtn) {
    copyBtn.addEventListener('click', copyExtractedId);
  }
  
  // Auto-extract when input changes and looks like a URL
  const postInput = document.getElementById('newPostInput');
  if (postInput) {
    postInput.addEventListener('input', function(e) {
      const value = e.target.value.trim();
      const extractBtn = document.getElementById('extract-id-btn');
      
      // Show/hide extract button based on input
      if ((value.includes('threads.net') || value.includes('threads.com')) && value.length > 20) {
        extractBtn.style.display = 'inline-flex';
        extractBtn.classList.add('pulse');
      } else if (/^\d{15,20}$/.test(value) || /^[A-Za-z0-9_-]{10,}$/.test(value)) {
        // If it's already a Post ID, show extracted display
        const extractedDisplay = document.getElementById('extracted-post-id');
        const extractedValue = document.getElementById('extracted-id-value');
        
        extractedValue.textContent = value;
        extractedDisplay.style.display = 'block';
        extractBtn.style.display = 'none';
      } else {
        extractBtn.classList.remove('pulse');
        // Hide extracted display if input is manually changed
        if (!value.includes('threads.')) {
          document.getElementById('extracted-post-id').style.display = 'none';
        }
      }
    });
    
    // Auto-extract on paste if it's a URL
    postInput.addEventListener('paste', function(e) {
      setTimeout(() => {
        const value = e.target.value.trim();
        if ((value.includes('threads.net') || value.includes('threads.com')) && value.length > 30) {
          // Auto-extract after a short delay
          setTimeout(extractPostId, 500);
        } else if (/^\d{15,20}$/.test(value) || /^[A-Za-z0-9_-]{10,}$/.test(value)) {
          // If it's a Post ID, show it directly
          const extractedDisplay = document.getElementById('extracted-post-id');
          const extractedValue = document.getElementById('extracted-id-value');
          
          extractedValue.textContent = value;
          extractedDisplay.style.display = 'block';
          extractedDisplay.classList.add('success');
          
          setTimeout(() => {
            extractedDisplay.classList.remove('success');
          }, 1000);
        }
      }, 100);
    });
  }
  
  // Preview post button event listener
  const previewPostBtn = document.getElementById('preview-post-btn');
  if (previewPostBtn) {
    previewPostBtn.addEventListener('click', previewPost);
  }

  // Test post ID button event listener
  const testPostIdBtn = document.getElementById('test-post-id-btn');
  if (testPostIdBtn) {
    testPostIdBtn.addEventListener('click', testPostId);
  }
  
  // Event listeners for auto-reply control
  const startAutoReplyBtn = document.getElementById('start-auto-reply-btn');
  if (startAutoReplyBtn) {
    startAutoReplyBtn.addEventListener('click', startAutoReply);
  }

  const stopAutoReplyBtn = document.getElementById('stop-auto-reply-btn');
  if (stopAutoReplyBtn) {
    stopAutoReplyBtn.addEventListener('click', stopAutoReply);
  }
  
  // Show/hide AI-related fields
  const useAIElement = document.getElementById('useAI');
  if (useAIElement) {
    useAIElement.addEventListener('change', function() {
      const aiFields = document.querySelectorAll('.ai-only');
      const testBtn = document.getElementById('test-ai-btn');
      
      if (this.checked) {
        aiFields.forEach(field => {
          field.style.display = 'block';
          field.classList.add('show');
        });
        testBtn.style.display = 'inline-flex';
      } else {
        aiFields.forEach(field => {
          field.style.display = 'none';
          field.classList.remove('show');
        });
        testBtn.style.display = 'none';
      }
    });
  }
});

// Enhanced status display function
function showStatus(message, type = 'success', duration = 5000) {
  const statusContainer = document.getElementById('status');
  
  // Create status element
  const statusElement = document.createElement('div');
  statusElement.className = type;
  statusElement.innerHTML = message;
  
  // Clear previous messages
  statusContainer.innerHTML = '';
  statusContainer.appendChild(statusElement);
  
  // Auto-remove after duration
  setTimeout(() => {
    if (statusElement.parentNode) {
      statusElement.remove();
    }
  }, duration);
}

// Manual reply form
const replyForm = document.getElementById('reply-form');
if (replyForm) {
  replyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
      accessToken: formData.get('accessToken'),
      postId: formData.get('postId'),
      message: formData.get('message'),
      commentText: formData.get('commentText'),
      useAI: formData.get('useAI') === 'on',
      geminiApiKey: formData.get('tempGeminiKey')
    };
  
  showStatus('🚀 SENDING REPLY...', 'loading');
  
  try {
    const response = await authManager.makeAuthenticatedRequest('/api/send-reply', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      const replyData = result.data;
      const message = `✅ REPLY SENT SUCCESSFULLY!${replyData.aiGenerated ? '<br>🤖 AI GENERATED: ' + replyData.message : ''}`;
      showStatus(message, 'success');
      
      // Clear form
      const messageField = document.getElementById('message');
      const commentField = document.getElementById('commentText');
      if (messageField) messageField.value = '';
      if (commentField) commentField.value = '';
    } else {
      showStatus(`❌ ERROR: ${result.message || result.error || 'Unknown error'}`, 'error');
    }
  } catch (error) {
    showStatus(`❌ NETWORK ERROR: ${error.message}`, 'error');
  }
});
}

// Test AI response
const testAiBtn = document.getElementById('test-ai-btn');
if (testAiBtn) {
  testAiBtn.addEventListener('click', async () => {
    const commentText = document.getElementById('commentText')?.value;
    const geminiKey = document.getElementById('tempGeminiKey')?.value;
    const postId = document.getElementById('postId')?.value; // Get postId for context
    
    if (!commentText?.trim()) {
      showStatus('❌ PLEASE ENTER COMMENT TEXT TO TEST AI RESPONSE', 'error');
      return;
    }
    
    showStatus('🤖 GENERATING AI RESPONSE WITH POST CONTEXT...', 'loading');
  
  try {
    const response = await authManager.makeAuthenticatedRequest('/api/test-ai', {
      method: 'POST',
      body: JSON.stringify({
        commentText: commentText,
        geminiApiKey: geminiKey,
        postId: postId // Include postId for context
      })
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      const aiData = result.data;
      const messageField = document.getElementById('message');
      if (messageField) messageField.value = aiData.aiResponse;
      
      // Show context information if available
      let statusMessage = '🤖 AI RESPONSE GENERATED AND FILLED!';
      if (aiData.hasPostContext) {
        statusMessage += `<br>📝 Context: Post by @${aiData.postAuthor}<br>💬 "${aiData.postText}"`;
      } else {
        statusMessage += '<br>⚠️ No post context available (responses may be less natural)';
      }
      
      showStatus(statusMessage, 'success', 7000);
    } else {
      showStatus(`❌ AI ERROR: ${result.message || result.error || 'Unknown error'}`, 'error');
    }
  } catch (error) {
    showStatus(`❌ NETWORK ERROR: ${error.message}`, 'error');
  }
});
}

// Settings form
const settingsForm = document.getElementById('settings-form');
if (settingsForm) {
  settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
      enabled: formData.get('autoReplyEnabled') === 'on',
      interval: parseInt(formData.get('interval')) * 1000, // Convert to milliseconds
      maxRepliesPerPost: parseInt(formData.get('maxReplies')),
      customPrompt: formData.get('customPrompt'),
      geminiApiKey: formData.get('geminiApiKey'),
    accessToken: formData.get('autoAccessToken')
  };
  
  showStatus('💾 SAVING SETTINGS...', 'loading');
  
  try {
    const response = await authManager.makeAuthenticatedRequest('/api/settings', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      showStatus('✅ SETTINGS SAVED SUCCESSFULLY!', 'success');
      loadSettings(); // Refresh status
    } else {
      showStatus(`❌ ERROR: ${result.message || result.error || 'Unknown error'}`, 'error');
    }
  } catch (error) {
    showStatus(`❌ NETWORK ERROR: ${error.message}`, 'error');
  }
});
}

// Load current settings
async function loadSettings() {
  try {
    const response = await authManager.makeAuthenticatedRequest('/api/settings');
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message);
    }
    
    const settings = result.data;
    
    // Get auto-reply status
    const autoReplyStatus = await getAutoReplyStatus();
    
    // Update form fields with safe property access
    const autoReplyEnabledEl = document.getElementById('autoReplyEnabled');
    const intervalEl = document.getElementById('interval');
    const maxRepliesEl = document.getElementById('maxReplies');
    const customPromptEl = document.getElementById('customPrompt');
    
    if (autoReplyEnabledEl) autoReplyEnabledEl.checked = settings.autoReplyEnabled || false;
    if (intervalEl) intervalEl.value = settings.interval || 30;
    if (maxRepliesEl) maxRepliesEl.value = settings.maxRepliesPerPost || 3;
    if (customPromptEl) customPromptEl.value = settings.customPrompt || '';
    
    // Update control buttons
    const startBtn = document.getElementById('start-auto-reply-btn');
    const stopBtn = document.getElementById('stop-auto-reply-btn');
    
    if (autoReplyStatus && autoReplyStatus.running) {
      if (startBtn) startBtn.style.display = 'none';
      if (stopBtn) stopBtn.style.display = 'inline-flex';
    } else {
      if (startBtn) startBtn.style.display = 'inline-flex';
      if (stopBtn) stopBtn.style.display = 'none';
    }
    
    // Update status grid
    const statusDiv = document.getElementById('auto-status');
    if (statusDiv) {
      statusDiv.innerHTML = `
        <div class="status-item ${settings.autoReplyEnabled && autoReplyStatus?.running ? 'enabled' : 'disabled'}">
          🔄 AUTO REPLY: ${settings.autoReplyEnabled && autoReplyStatus?.running ? 'RUNNING' : 'STOPPED'}
        </div>
        <div class="status-item">
          ⏱️ INTERVAL: ${settings.interval || 30}S
        </div>
        <div class="status-item">
          📝 MAX REPLIES: ${settings.maxRepliesPerPost || 3}
        </div>
        <div class="status-item">
          📊 MONITORED: ${autoReplyStatus?.monitoredPostsCount || 0}
        </div>
        <div class="status-item ${settings.hasGeminiKey ? 'enabled' : 'disabled'}">
          🤖 GEMINI AI: ${settings.hasGeminiKey ? 'CONFIGURED' : 'NOT CONFIGURED'}
        </div>
        <div class="status-item ${settings.hasAccessToken ? 'enabled' : 'disabled'}">
          🔑 ACCESS TOKEN: ${settings.hasAccessToken ? 'CONFIGURED' : 'NOT CONFIGURED'}
        </div>
        <div class="status-item">
          📈 TOTAL REPLIES: ${autoReplyStatus?.totalRepliesSent || 0}
        </div>
        ${autoReplyStatus?.running ? `
          <div class="status-item enabled">
            🟢 JOB STATUS: ACTIVE
          </div>
        ` : `
          <div class="status-item disabled">
            🔴 JOB STATUS: INACTIVE
          </div>
        `}
      `;
    }
    
    // Update connection status
    const connectionStatus = document.getElementById('connection-status');
    const mobileConnectionStatus = document.getElementById('mobile-connection-status');
    if (connectionStatus) {
      const isFullyOperational = settings.autoReplyEnabled && settings.hasGeminiKey && settings.hasAccessToken && autoReplyStatus?.running;
      const statusColor = isFullyOperational ? '#00ff00' : '#ff0000';
      connectionStatus.style.backgroundColor = statusColor;
      
      // Also update mobile menu status
      if (mobileConnectionStatus) {
        mobileConnectionStatus.style.backgroundColor = statusColor;
      }
    }
    
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('❌ FAILED TO LOAD SETTINGS', 'error');
  }
}

// Extract Post ID from URL endpoint
async function extractPostId() {
  const inputElement = document.getElementById('newPostInput');
  
  if (!inputElement) {
    console.error('Input element not found');
    showStatus('❌ INPUT ELEMENT NOT FOUND', 'error');
    return;
  }
  
  let input = '';
  try {
    const rawValue = inputElement.value;
    console.log('Extract Post ID - Raw input value:', rawValue, 'Type:', typeof rawValue);
    
    if (rawValue === null || rawValue === undefined || rawValue === 'undefined') {
      input = '';
    } else {
      input = String(rawValue).trim();
    }
  } catch (error) {
    console.error('Error reading input value:', error);
    showStatus('❌ ERROR READING INPUT', 'error');
    return;
  }
  
  console.log('🔗 Extract Post ID function called');
  console.log('Extract Post ID - Processed input:', input);
  
  if (!input || input === '' || input === 'undefined') {
    showStatus('❌ PLEASE ENTER A URL OR POST ID', 'error');
    return;
  }
  
  showStatus('🔄 EXTRACTING POST ID...', 'loading');
  
  try {
    console.log('Extract Post ID - Sending request with:', { url: input });
    
    const response = await authManager.makeAuthenticatedRequest('/api/extract-post-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: input })
    });
    
    const result = await response.json();
    console.log('Extract Post ID - Server response status:', response.status);
    console.log('Extract Post ID - Server response:', result);
    
    if (response.ok && result.success) {
      // Show extracted Post ID
      const extractedDisplay = document.getElementById('extracted-post-id');
      const extractedValue = document.getElementById('extracted-id-value');
      
      const extractedId = result.data.extractedId;
      console.log('Extract Post ID - Response data:', result.data);
      console.log('Extract Post ID - Extracted ID:', extractedId);
      
      if (!extractedId || extractedId === 'undefined') {
        console.error('No valid extracted ID found in response');
        showStatus('❌ NO VALID POST ID FOUND IN RESPONSE', 'error');
        return;
      }
      
      extractedValue.textContent = extractedId;
      extractedDisplay.style.display = 'block';
      extractedDisplay.classList.add('success');
      
      // Update input with extracted Post ID
      document.getElementById('newPostInput').value = extractedId;
      
      showStatus(`✅ POST ID EXTRACTED: ${extractedId}`, 'success');
      
      // Remove success animation after a moment
      setTimeout(() => {
        extractedDisplay.classList.remove('success');
      }, 1000);
      
    } else {
      // Hide extracted display if failed
      document.getElementById('extracted-post-id').style.display = 'none';
      
      console.error('Extract Post ID failed:', result);
      const errorMsg = result.message || result.error || 'Failed to extract Post ID';
      
      // Show more specific error messages
      if (result.details && result.details.explanation) {
        showStatus(`❌ ${result.details.explanation.toUpperCase()}`, 'error');
        
        // Show helpful instructions
        if (result.details.howToGetPostId) {
          console.log('💡 How to get Post ID:', result.details.howToGetPostId);
        }
      } else {
        showStatus(`❌ ${errorMsg.toUpperCase()}`, 'error');
      }
      
      // Show suggestions if available
      if (result.data && result.data.supportedFormats) {
        console.log('💡 Supported formats:', result.data.supportedFormats);
      }
      if (result.suggestions && result.suggestions.length > 0) {
        console.log('💡 Suggestions:', result.suggestions);
      }
    }
  } catch (error) {
    document.getElementById('extracted-post-id').style.display = 'none';
    showStatus(`❌ NETWORK ERROR: ${error.message}`, 'error');
  }
}

// Copy extracted Post ID to clipboard
async function copyExtractedId() {
  const extractedValue = document.getElementById('extracted-id-value');
  const postId = extractedValue.textContent;
  
  if (!postId) return;
  
  try {
    await navigator.clipboard.writeText(postId);
    showStatus('📋 POST ID COPIED TO CLIPBOARD!', 'success', 2000);
    
    // Visual feedback
    const copyBtn = document.getElementById('copy-extracted-id');
    const originalText = copyBtn.innerHTML;
    copyBtn.innerHTML = '✅';
    
    setTimeout(() => {
      copyBtn.innerHTML = originalText;
    }, 1000);
    
  } catch (error) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = postId;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    
    showStatus('📋 POST ID COPIED!', 'success', 2000);
  }
}

// Add post to monitoring
const addPostBtn = document.getElementById('add-post-btn');
if (addPostBtn) {
  addPostBtn.addEventListener('click', async () => {
    const input = document.getElementById('newPostInput').value.trim();
  
  if (!input) {
    showStatus('❌ PLEASE ENTER A POST ID OR URL', 'error');
    return;
  }
  
  showStatus('🔄 ADDING POST TO MONITORING...', 'loading');
  
  try {
    const response = await authManager.makeAuthenticatedRequest('/api/monitor-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        postId: (input.includes('threads.') ? null : input),
        url: (input.includes('threads.') ? input : null)
      })
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      // Clear input and extracted display
      document.getElementById('newPostInput').value = '';
      document.getElementById('extracted-post-id').style.display = 'none';
      
      // Reload monitored posts
      loadMonitoredPosts();
      
      const message = result.extractedFromUrl 
        ? `✅ POST ADDED FROM URL! ID: ${result.postId}`
        : `✅ POST ${result.postId} ADDED TO MONITORING!`;
      
      showStatus(message, 'success');
    } else {
      const errorMsg = result.error || 'Failed to add post';
      showStatus(`❌ ${errorMsg.toUpperCase()}`, 'error');
    }
  } catch (error) {
    showStatus(`❌ NETWORK ERROR: ${error.message}`, 'error');
  }
  });
}

// Load monitored posts
async function loadMonitoredPosts() {
  try {
    const listDiv = document.getElementById('monitored-list');
    
    if (!listDiv) {
      // silently return if element not found (e.g., on autopost page)
      return;
    }

    const response = await authManager.makeAuthenticatedRequest('/api/monitored-posts');
    const result = await response.json();
    
    if (!result.success || !result.data.posts || result.data.posts.length === 0) {
      listDiv.innerHTML = '<div class="empty-state">NO POSTS BEING MONITORED</div>';
      return;
    }
    
    listDiv.innerHTML = result.data.posts.map(post => `
      <div class="monitored-post">
        <div class="post-info">
          <div class="post-id">${post.postId}</div>
          <div class="post-author">@${post.author || 'Unknown'}</div>
          ${post.content ? `<div class="post-content">"${post.content}"</div>` : ''}
          <div class="post-meta">
            <span class="post-replies">${post.replyCount || 0}/${post.maxReplies || 3} replies</span>
            ${post.url ? `<a href="${post.url}" target="_blank" class="post-link">🔗 View Post</a>` : ''}
          </div>
        </div>
        <button class="btn btn-danger remove-btn" onclick="removePost('${post.postId}')">
          <span class="btn-text">REMOVE</span>
          <span class="btn-icon">❌</span>
        </button>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading monitored posts:', error);
    const listDiv = document.getElementById('monitored-list');
    if (listDiv) {
      listDiv.innerHTML = '<div class="empty-state error">❌ FAILED TO LOAD MONITORED POSTS</div>';
    }
    showStatus('❌ FAILED TO LOAD MONITORED POSTS', 'error');
  }
}

// Remove post from monitoring
async function removePost(postId) {
  try {
    const response = await authManager.makeAuthenticatedRequest(`/api/monitor-post/${postId}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (response.ok) {
      loadMonitoredPosts();
      showStatus('✅ POST REMOVED FROM MONITORING!', 'success');
    } else {
      showStatus(`❌ ERROR: ${result.error}`, 'error');
    }
  } catch (error) {
    showStatus(`❌ NETWORK ERROR: ${error.message}`, 'error');
  }
}

// Load reply history
async function loadReplyHistory() {
  try {
    const response = await authManager.makeAuthenticatedRequest('/api/reply-history');
    const result = await response.json();
    
    const listDiv = document.getElementById('history-list');
    
    if (!listDiv) {
      console.error('history-list element not found');
      return;
    }
    
    if (!result.success || !result.data.history || result.data.history.length === 0) {
      listDiv.innerHTML = '<div class="empty-state">NO AUTO-REPLIES SENT YET</div>';
      return;
    }
    
    listDiv.innerHTML = result.data.history.map(item => `
      <div class="history-item">
        <div class="history-header">
          <span class="post-id">POST: ${item.postId}</span>
          <span class="timestamp">${new Date(item.timestamp).toLocaleString()}</span>
        </div>
        ${item.commentText ? `
          <div class="comment-context">
            <strong>Replying to:</strong> "${item.commentText.substring(0, 100)}${item.commentText.length > 100 ? '...' : ''}"
            ${item.author ? `<span class="comment-author">by @${item.author}</span>` : ''}
          </div>
        ` : ''}
        <div class="response-text">
          <strong>Bot Reply:</strong> ${item.response || 'No response text available'}
        </div>
        ${item.postUrl ? `
          <div class="post-link">
            <a href="${item.postUrl}" target="_blank" class="link">🔗 View Post</a>
          </div>
        ` : ''}
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading reply history:', error);
    const listDiv = document.getElementById('history-list');
    if (listDiv) {
      listDiv.innerHTML = '<div class="empty-state error">❌ FAILED TO LOAD REPLY HISTORY</div>';
    }
    showStatus('❌ FAILED TO LOAD REPLY HISTORY', 'error');
  }
}

// Refresh history
const refreshHistoryBtn = document.getElementById('refresh-history-btn');
if (refreshHistoryBtn) {
  refreshHistoryBtn.addEventListener('click', loadReplyHistory);
}

// Clear history
const clearHistoryBtn = document.getElementById('clear-history-btn');
if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener('click', async () => {
  if (!confirm('ARE YOU SURE YOU WANT TO CLEAR ALL REPLY HISTORY?')) {
    return;
  }
  
  try {
    const response = await authManager.makeAuthenticatedRequest('/api/reply-history', {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      loadReplyHistory();
      showStatus('✅ REPLY HISTORY CLEARED!', 'success');
    } else {
      showStatus(`❌ ERROR: ${result.message || result.error || 'Unknown error'}`, 'error');
    }
  } catch (error) {
    showStatus(`❌ NETWORK ERROR: ${error.message}`, 'error');
  }
  });
}

// Verify access token and display account info
async function verifyAccessToken(tokenFieldId, infoDisplayId) {
  const tokenField = document.getElementById(tokenFieldId);
  const infoDisplay = document.getElementById(infoDisplayId);
  const token = tokenField.value.trim();
  
  if (!token) {
    showStatus('❌ PLEASE ENTER ACCESS TOKEN', 'error');
    return;
  }
  
  showStatus('🔍 VERIFYING ACCESS TOKEN...', 'loading');
  
  try {
    const response = await authManager.makeAuthenticatedRequest('/api/verify-token', {
      method: 'POST',
      body: JSON.stringify({ accessToken: token })
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      const account = result.data.userInfo;
      
      // Display account information
      infoDisplay.innerHTML = `
        <div class="account-profile">
          ${account.profile_picture_url ? `<img src="${account.profile_picture_url}" alt="Profile" class="account-avatar">` : '<div class="account-avatar" style="background: var(--primary-black);"></div>'}
          <div class="account-details">
            <h4>${account.name || 'No Name'}</h4>
            <span class="account-username">@${account.username}</span>
            <p>ID: ${account.id}</p>
          </div>
        </div>
      `;
      
      infoDisplay.className = 'account-info verified';
      infoDisplay.style.display = 'block';
      
      showStatus(`✅ TOKEN VERIFIED FOR @${account.username}`, 'success');
      
    } else {
      // Display error information with better formatting
      const errorHtml = `
        <div class="account-error">
          <div class="error-header">
            <strong>❌ VERIFICATION FAILED</strong>
          </div>
          <div class="error-message">
            ${result.message || result.error || 'Invalid access token'}
          </div>
          ${result.details ? `
            <div class="error-details">
              <small>${result.details}</small>
            </div>
          ` : ''}
          ${result.data?.tokenPreview ? `
            <div class="error-token">
              <small>Token: ${result.data.tokenPreview}</small>
            </div>
          ` : ''}
          <div class="error-help">
            <small>💡 Pastikan token valid dan masih aktif. Generate token baru di <a href="https://developers.facebook.com/tools/explorer/" target="_blank">Meta for Developers</a></small>
          </div>
        </div>
      `;
      
      infoDisplay.innerHTML = errorHtml;
      infoDisplay.className = 'account-info error';
      infoDisplay.style.display = 'block';
      
      showStatus(`❌ ${result.message || result.error || 'TOKEN VERIFICATION FAILED'}`, 'error');
    }
    
  } catch (error) {
    console.error('Network error during token verification:', error);
    
    infoDisplay.innerHTML = `
      <div class="account-error">
        <div class="error-header">
          <strong>❌ CONNECTION ERROR</strong>
        </div>
        <div class="error-message">
          Gagal menghubungi server verifikasi
        </div>
        <div class="error-details">
          <small>${error.message}</small>
        </div>
        <div class="error-help">
          <small>💡 Periksa koneksi internet dan coba lagi</small>
        </div>
      </div>
    `;
    
    infoDisplay.className = 'account-info error';
    infoDisplay.style.display = 'block';
    
    showStatus(`❌ NETWORK ERROR: ${error.message}`, 'error');
  }
}

// Verify token button handlers
const verifyTokenBtn = document.getElementById('verify-token-btn');
if (verifyTokenBtn) {
  verifyTokenBtn.addEventListener('click', () => {
    verifyAccessToken('accessToken', 'account-info');
  });
}

const verifyAutoTokenBtn = document.getElementById('verify-auto-token-btn');
if (verifyAutoTokenBtn) {
  verifyAutoTokenBtn.addEventListener('click', () => {
    verifyAccessToken('autoAccessToken', 'auto-account-info');
  });
}

// Analyze token button handlers (if exists)
const analyzeTokenBtn = document.getElementById('analyze-token-btn');
if (analyzeTokenBtn) {
  analyzeTokenBtn.addEventListener('click', () => {
    analyzeToken('accessToken', 'account-info');
  });
}

const analyzeAutoTokenBtn = document.getElementById('analyze-auto-token-btn');
if (analyzeAutoTokenBtn) {
  analyzeAutoTokenBtn.addEventListener('click', () => {
    analyzeToken('autoAccessToken', 'auto-account-info');
  });
}

// Debug token button handler
const debugTokenBtn = document.getElementById('debug-token-btn');
if (debugTokenBtn) {
  debugTokenBtn.addEventListener('click', debugToken);
}

// Debug Token function
async function debugToken() {
  console.log('🐛 Debug Token started');
  
  showStatus('🐛 ANALYZING TOKEN PERMISSIONS...', 'loading');
  
  try {
    const response = await authManager.makeAuthenticatedRequest('/api/token-debug');
    const result = await response.json();
    
    if (!response.ok) {
      showStatus(`❌ ${result.error}`, 'error');
      return;
    }
    
    console.log('🐛 Debug Token response:', result);
    
    // Validate the response structure
    if (!result || typeof result !== 'object' || !result.success) {
      showStatus('❌ Invalid response from server', 'error');
      return;
    }
    
    // Extract the actual data from the response
    const debugData = result.data || {};
    console.log('🐛 Debug data extracted:', debugData);
    
    console.log('🐛 About to create debug container...');
    
    // Create or get debug results container in the auto settings tab
    let debugContainer = document.getElementById('debug-results');
    if (!debugContainer) {
      debugContainer = document.createElement('div');
      debugContainer.id = 'debug-results';
      debugContainer.className = 'debug-results-container';
      
      // Insert after the threads integration section
      const threadsSection = document.querySelector('#auto-tab .form-section:nth-child(2)');
      if (threadsSection) {
        threadsSection.parentNode.insertBefore(debugContainer, threadsSection.nextSibling);
      }
    }
    
    
    let debugHtml = `
      <div class="content-card debug-card">
        <div class="card-header">
          <h2 class="card-title">🐛 TOKEN DEBUG ANALYSIS</h2>
          <div class="card-subtitle">Detailed token analysis and troubleshooting</div>
        </div>
        <div class="card-content">
          <div class="token-info">
            <h4>📋 Token Information:</h4>
            <p><strong>Token Found:</strong> ${debugData.tokenFound || debugData.tokenProvided ? '✅' : '❌'}</p>
            <p><strong>Token Length:</strong> ${debugData.tokenLength || 0} characters</p>
            <p><strong>Token Preview:</strong> <code>${debugData.tokenPreview || 'No token'}</code></p>
            ${debugData.userId ? `<p><strong>User ID:</strong> ${debugData.userId}</p>` : ''}
            ${debugData.username ? `<p><strong>Username:</strong> @${debugData.username}</p>` : ''}
          </div>
          
          <div class="api-test-results">
            <h4>🚀 API Access Tests:</h4>
    `;
    
    // Handle tests as either array or object, with fallback for undefined
    const tests = debugData.tests || {};
    const testEntries = Array.isArray(tests) ? tests : Object.entries(tests);
    
    if (testEntries.length === 0) {
      debugHtml += `<p>No test results available</p>`;
    } else {
      testEntries.forEach(([testKey, test]) => {
        // Handle both array format (test object) and object format (key-value)
        const testData = Array.isArray(tests) ? test : test;
        const testName = Array.isArray(tests) ? (test.test || testKey) : testKey;
        
        if (testData.valid === true) {
          debugHtml += `
            <div class="api-success">
              <h5>✅ ${testName}</h5>
              <p><strong>Status:</strong> SUCCESS</p>
              <p><strong>Message:</strong> ${testData.message || 'Test passed'}</p>
              ${testData.data ? `<pre>${JSON.stringify(testData.data, null, 2)}</pre>` : ''}
            </div>
          `;
        } else if (testData.valid === false) {
          debugHtml += `
            <div class="api-error">
              <h5>❌ ${testName}</h5>
              <p><strong>Status:</strong> FAILED</p>
              <p><strong>Message:</strong> ${testData.message || 'Test failed'}</p>
              ${testData.error || testData.errorData ? `<pre>${JSON.stringify(testData.error || testData.errorData, null, 2)}</pre>` : ''}

            </div>
          `;
        } else {
          // Handle legacy format or unknown status
          const status = testData.status || (testData.valid ? 'SUCCESS' : 'UNKNOWN');
          debugHtml += `
            <div class="api-no-test">
              <h5>ℹ️ ${testName}</h5>
              <p><strong>Status:</strong> ${status}</p>
              <p><strong>Message:</strong> ${testData.message || 'No message'}</p>
            </div>
          `;
        }
      });
    }
    
    debugHtml += `
          </div>
          
          ${debugData.suggestedTestPosts ? `
            <div class="suggested-posts">
              <h4>💡 Suggested Test Posts (Your Own Posts):</h4>
              <div class="post-suggestions">
                ${debugData.suggestedTestPosts.map(post => `
                  <div class="suggested-post">
                    <p><strong>Post ID:</strong> <code>${post.id}</code></p>
                    <p><strong>Text:</strong> ${post.text}</p>
                    <p><strong>Time:</strong> ${new Date(post.timestamp).toLocaleString()}</p>
                    <button onclick="usePostIdInMonitoring('${post.id}')" class="btn btn-small">USE IN MONITORING</button>
                  </div>
                `).join('')}

              </div>
            </div>
          ` : ''}
          
          ${debugData.recommendations && debugData.recommendations.length > 0 ? `
            <div class="recommendations">
              <h4>📋 Recommendations:</h4>
              ${debugData.recommendations.map(rec => `
                <div class="recommendation-item ${rec.type ? rec.type.toLowerCase() : 'info'}">
                  <h5>${rec.type === 'SUCCESS' ? '✅' : '⚠️'} ${rec.message || 'No message'}</h5>
                  ${rec.solutions && rec.solutions.length > 0 ? `
                    <ul>
                      ${rec.solutions.map(solution => `<li>${solution}</li>`).join('')}
                    </ul>
                  ` : ''}
                </div>
              `).join('')}

            </div>
          ` : ''}
          <div class="debug-actions">
            <button onclick="closeDebugResults()" class="btn btn-secondary">Close Debug Results</button>
          </div>
        </div>
      </div>
    `;
    
    debugContainer.innerHTML = debugHtml;
    debugContainer.style.display = 'block';
    
    console.log('🐛 Debug HTML inserted, checking sidebar again...');
    
    // CHECK SIDEBAR AFTER HTML INSERTION
    const sidebarAfterHTML = document.getElementById('sidebar');
    console.log('🐛 SIDEBAR AFTER HTML:', {
      exists: !!sidebarAfterHTML,
      display: sidebarAfterHTML ? window.getComputedStyle(sidebarAfterHTML).display : 'N/A',
      visibility: sidebarAfterHTML ? window.getComputedStyle(sidebarAfterHTML).visibility : 'N/A'
    });
    
    console.log('🐛 Debug results displayed');
    
    // Check for errors in the tests (handle both array and object formats)
    const debugTests = debugData.tests || {};
    let hasErrors = false;
    
    if (Array.isArray(debugTests)) {
      hasErrors = debugTests.some(test => test.status === 'FAILED' || test.valid === false);
    } else if (typeof debugTests === 'object') {
      hasErrors = Object.values(debugTests).some(test => test.valid === false);
    }
    
    if (hasErrors) {
      showStatus('⚠️ TOKEN HAS PERMISSION ISSUES - CHECK DETAILS', 'warning');
    } else {
      showStatus('✅ TOKEN DEBUG COMPLETED - TOKEN OK', 'success');
    }
    
  } catch (error) {
    console.error('Error debugging token:', error);
    showStatus(`❌ DEBUG ERROR: ${error.message}`, 'error');
  }
}

// Helper function to close debug results
function closeDebugResults() {
  console.log('🔧 Closing debug results...');
  
  const debugContainer = document.getElementById('debug-results');
  if (debugContainer) {
    debugContainer.style.display = 'none';
    debugContainer.innerHTML = '';
    console.log('🔧 Debug container closed');
  }
  
  console.log('🔧 Debug results closed');
}

// Helper function to use suggested post ID in monitoring tab
function usePostIdInMonitoring(postId) {
  // Switch to monitoring tab
  switchTab('monitoring');
  
  // Set the post ID in the monitoring tab
  setTimeout(() => {
    const monitoringPostInput = document.getElementById('newPostId');
    if (monitoringPostInput) {
      monitoringPostInput.value = postId;
      showStatus(`✅ POST ID SET IN MONITORING: ${postId}`, 'success');
    }
  }, 100);
}

// Helper function to use suggested post ID
function usePostId(postId) {
  document.getElementById('newPostId').value = postId;
  showStatus(`✅ POST ID SET: ${postId}`, 'success');
}

// Enhanced token analysis function
async function analyzeToken(tokenFieldId, infoDisplayId) {
  const tokenField = document.getElementById(tokenFieldId);
  const infoDisplay = document.getElementById(infoDisplayId);
  const token = tokenField.value.trim();
  
  if (!token) {
    showStatus('❌ MASUKKAN ACCESS TOKEN TERLEBIH DAHULU', 'error');
    return;
  }
  
  showStatus('🔍 MENGANALISIS ACCESS TOKEN...', 'loading');
  
  try {
    const response = await authManager.makeAuthenticatedRequest('/api/token-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: token })
    });
    
    const tokenInfo = await response.json();
    
    if (tokenInfo.isValid) {
      // Display successful verification
      infoDisplay.innerHTML = `
        <div class="account-profile">
          ${tokenInfo.account.profilePicture ? `<img src="${tokenInfo.account.profilePicture}" alt="Profile" class="account-avatar">` : '<div class="account-avatar" style="background: var(--primary-black);"></div>'}
          <div class="account-details">
            <h4>${tokenInfo.account.name || 'No Name'}</h4>
            <span class="account-username">@${tokenInfo.account.username}</span>
            <p>ID: ${tokenInfo.account.id}</p>
          </div>
        </div>
        ${tokenInfo.account.biography ? `<div class="account-bio">${tokenInfo.account.biography}</div>` : ''}
        <div class="token-analysis">
          <small>✅ Token valid • Format: ${tokenInfo.format} • Length: ${tokenInfo.length}</small>
        </div>
      `;
      
      infoDisplay.className = 'account-info verified';
      infoDisplay.style.display = 'block';
      
      showStatus(`✅ TOKEN BERHASIL DIVERIFIKASI UNTUK @${tokenInfo.account.username}`, 'success');
      
    } else {
      // Display detailed error analysis
      let errorDetails = `
        <div class="token-error-analysis">
          <div class="error-header">
            <strong>❌ TOKEN TIDAK VALID</strong>
          </div>
          <div class="token-details">
            <p><strong>Token Preview:</strong> ${tokenInfo.preview}</p>
            <p><strong>Length:</strong> ${tokenInfo.length} characters</p>
            <p><strong>Format:</strong> ${tokenInfo.format}</p>
            ${tokenInfo.httpStatus ? `<p><strong>HTTP Status:</strong> ${tokenInfo.httpStatus}</p>` : ''}
          </div>
      `;
      
      if (tokenInfo.errors.length > 0) {
        errorDetails += `
          <div class="error-list">
            <strong>🚨 Masalah yang ditemukan:</strong>
            <ul>
              ${tokenInfo.errors.map(error => `<li>${error}</li>`).join('')}
            </ul>
          </div>
        `;
      }
      
      if (tokenInfo.suggestions.length > 0) {
        errorDetails += `
          <div class="suggestion-list">
            <strong>💡 Saran perbaikan:</strong>
            <ul>
              ${tokenInfo.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
            </ul>
          </div>
        `;
      }
      
      errorDetails += `
          <div class="help-links">
            <a href="https://developers.facebook.com/tools/explorer/" target="_blank" class="help-link">
              🔑 Panduan Lengkap Mendapatkan Access Token
            </a>
          </div>
        </div>
      `;
      
      infoDisplay.innerHTML = errorDetails;
      infoDisplay.className = 'account-info error';
      infoDisplay.style.display = 'block';
      
      showStatus(`❌ ${tokenInfo.message.toUpperCase()}`, 'error');
    }
    
  } catch (error) {
    console.error('Error analyzing token:', error);
    
    infoDisplay.innerHTML = `
      <div class="token-error-analysis">
        <div class="error-header">
          <strong>❌ ERROR MENGANALISIS TOKEN</strong>
        </div>
        <p>Terjadi kesalahan saat menganalisis token: ${error.message}</p>
        <div class="help-links">
          <a href="https://developers.facebook.com/tools/explorer/" target="_blank" class="help-link">
            🔑 Panduan Lengkap Mendapatkan Access Token
          </a>
        </div>
      </div>
    `;
    infoDisplay.className = 'account-info error';
    infoDisplay.style.display = 'block';
    
    showStatus(`❌ NETWORK ERROR: ${error.message}`, 'error');
  }
}

// These event listeners are now moved to DOMContentLoaded handler above

// Test Post ID function for debugging
async function testPostId() {
  const postId = document.getElementById('newPostInput').value.trim();
  
  console.log('Testing Post ID - Post ID:', postId); // Debug logging
  
  if (!postId) {
    showStatus('❌ MASUKKAN POST ID ATAU URL TERLEBIH DAHULU', 'error');
    return;
  }
  
  showStatus('🧪 TESTING POST ID FORMAT DAN API...', 'loading');
  
  try {
    const response = await authManager.makeAuthenticatedRequest('/api/test-post-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId })
    });
    
    const result = await response.json();
    
    console.log('Test result:', result);
    
    // Display test results
    const previewContainer = document.getElementById('post-preview');
    
    let testResultsHtml = `
      <div class="preview-header">
        <span>🧪 POST ID TEST RESULTS</span>
      </div>
      <div class="preview-content">
        <div class="test-details">
          <p><strong>Original Post ID:</strong> ${result.originalPostId}</p>
          <p><strong>Clean Post ID:</strong> ${result.cleanPostId}</p>
          <p><strong>Length:</strong> ${result.length} characters</p>
          <p><strong>Format Check:</strong> ${result.format}</p>
        </div>
        
        <div class="test-urls">
          <h4>Test URLs Generated:</h4>
    `;
    
    result.testUrls.forEach((test, index) => {
      testResultsHtml += `
        <div class="test-url-item">
          <p><strong>Test ${index + 1}:</strong> ${test.postId}</p>
          ${test.url ? `<p><small>URL: ${test.url}</small></p>` : ''}
          ${test.error ? `<p style="color: red;"><small>Error: ${test.error}</small></p>` : ''}

        </div>
      `;
    });
    
    testResultsHtml += `
        </div>
        
        <div class="api-test-results">
          <h4>🚀 API Test Results:</h4>
    `;
    
    // Display API test results
    if (result.apiTests && result.apiTests.length > 0) {
      result.apiTests.forEach((apiTest, index) => {
        if (apiTest.success) {
          testResultsHtml += `
            <div class="api-success">
              <h5>✅ API Call Successful!</h5>
              <p><strong>Status:</strong> ${apiTest.status}</p>
              <p><strong>Post Data:</strong></p>
              <pre>${JSON.stringify(apiTest.data, null, 2)}</pre>
            </div>
          `;
        } else {
          testResultsHtml += `
            <div class="api-error">
              <h5>❌ API Call Failed</h5>
              <p><strong>Status:</strong> ${apiTest.status || 'Unknown'}</p>
              <p><strong>Error:</strong> ${apiTest.statusText || 'Network Error'}</p>
              <p><strong>Diagnosis:</strong> ${apiTest.diagnosis || 'Unknown error'}</p>
              
              ${apiTest.data ? `
                <p><strong>Server Response:</strong></p>
                <pre>${JSON.stringify(apiTest.data, null, 2)}</pre>
              ` : ''}
              
              ${apiTest.causes ? `
                <div class="error-analysis">
                  <h6>🔍 Kemungkinan Penyebab:</h6>
                  <ul>
                    ${apiTest.causes.map(cause => `<li>${cause}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
              
              ${apiTest.solutions ? `
                <div class="troubleshooting-tips">
                  <h6>🔧 Solusi yang Bisa Dicoba:</h6>
                  <ul>
                    ${apiTest.solutions.map(solution => `<li>${solution}</li>`).join('')}
                  </ul>
                </div>
              ` : `
                <div class="troubleshooting-tips">
                  <h6>🔧 Troubleshooting Tips:</h6>
                  <ul>
                    ${apiTest.status === 400 ? '<li><strong>Bad Request:</strong> Post ID format mungkin salah. Coba salin Post ID langsung dari URL Threads.</li>' : ''}
                    ${apiTest.status === 404 ? '<li><strong>Not Found:</strong> Post tidak ditemukan. Pastikan Post ID benar dan post masih ada.</li>' : ''}
                    ${apiTest.status === 403 ? '<li><strong>Forbidden:</strong> Tidak ada akses ke post ini. Post mungkin private atau akun di-block.</li>' : ''}
                    ${apiTest.status === 401 ? '<li><strong>Unauthorized:</strong> Access token tidak valid atau kadaluarsa. Perbarui token Anda.</li>' : ''}
                    ${apiTest.networkError ? '<li><strong>Network Error:</strong> Koneksi internet bermasalah atau server Threads sedang down.</li>' : ''}
                    <li>Pastikan post bersifat public dan dapat diakses oleh API</li>
                    <li>Coba test dengan Post ID yang berbeda dari akun yang sama</li>
                    <li>Verifikasi kembali access token di tab Settings</li>
                  </ul>
                </div>
              `}
            </div>
          `;
        }
      });
    } else {
      testResultsHtml += `
        <div class="api-no-test">
          <p>No API tests performed</p>
        </div>
      `;
    }
    
    testResultsHtml += `
        </div>
        
        <div class="test-suggestions">
          <h4>💡 Next Steps:</h4>
          <ul>
            <li>Post ID Format: <code>${result.cleanPostId}</code> ${result.format === 'Valid' ? '✅' : '❌'}</li>
            <li>Try copying Post ID directly from Threads URL</li>
            <li>Ensure post is public and accessible</li>
            <li>Verify access token permissions in Settings tab</li>
            <li>Test with different posts from your account</li>
          </ul>
        </div>
      </div>
    `;
    
    previewContainer.innerHTML = testResultsHtml;
    previewContainer.style.display = 'block';
    
    // Show appropriate status based on API test results
    const hasSuccessfulApiTest = result.apiTests && result.apiTests.some(test => test.success);
    if (hasSuccessfulApiTest) {
      showStatus(`✅ POST ID TEST: API CALL BERHASIL!`, 'success');
    } else {
      showStatus(`⚠️ POST ID TEST: API CALL GAGAL - CEK DETAIL`, 'warning');
    }
    
  } catch (error) {
    console.error('Error testing post ID:', error);
    showStatus(`❌ NETWORK ERROR: ${error.message}`, 'error');
  }
}

// Preview post function
async function previewPost() {
  console.log('🔍 Preview Post function called');
  
  const inputElement = document.getElementById('newPostInput');
  const previewContainer = document.getElementById('post-preview');
  
  if (!inputElement) {
    showStatus('❌ INPUT ELEMENT NOT FOUND', 'error');
    console.error('Element newPostInput not found in DOM');
    console.error('Available elements with "Input" in ID:', 
      Array.from(document.querySelectorAll('[id*="Input"]')).map(el => el.id));
    return;
  }
  
  // Enhanced debugging for troubleshooting
  console.log('Preview Post - Element found:', !!inputElement);
  console.log('Preview Post - Element:', inputElement);
  console.log('Preview Post - Element raw value:', inputElement.value);
  console.log('Preview Post - Value type:', typeof inputElement.value);
  console.log('Preview Post - Value length:', inputElement.value ? inputElement.value.length : 0);
  
  // More robust input handling
  let input = '';
  try {
    // Get the raw value first
    const rawValue = inputElement.value;
    console.log('Preview Post - Raw value:', rawValue);
    console.log('Preview Post - Raw value type:', typeof rawValue);
    
    // Handle different value types and the literal "undefined" string
    if (rawValue === null || rawValue === undefined || rawValue === 'undefined') {
      input = '';
    } else {
      input = String(rawValue).trim();
    }
    
    // Additional check for empty strings that might contain whitespace
    if (input === 'undefined') {
      input = '';
    }
  } catch (error) {
    console.error('Error getting input value:', error);
    showStatus('❌ ERROR READING INPUT VALUE', 'error');
    return;
  }
  
  console.log('Preview Post - Input after processing:', input);
  console.log('Preview Post - Input length:', input.length);
  
  if (!input || input.length === 0 || input === 'undefined') {
    showStatus('❌ MASUKKAN POST ID ATAU URL TERLEBIH DAHULU', 'error');
    console.warn('Input is empty, undefined, or contains literal "undefined" string');
    return;
  }
  
  showStatus('👁️ LOADING POST PREVIEW...', 'loading');
  
  try {
    // If input looks like a URL, extract Post ID first
    let postId = input;
    if (input.includes('threads.net') || input.includes('threads.com')) {
      const extractResponse = await authManager.makeAuthenticatedRequest('/api/extract-post-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: input })
      });
      
      const extractResult = await extractResponse.json();
      if (extractResult.success) {
        postId = extractResult.data.extractedId;
        // Update the input with extracted ID
        inputElement.value = postId;
        // Show extracted ID
        const extractedDisplay = document.getElementById('extracted-post-id');
        const extractedValue = document.getElementById('extracted-id-value');
        if (extractedValue) extractedValue.textContent = postId;
        if (extractedDisplay) extractedDisplay.style.display = 'block';
      } else {
        showStatus(`❌ ${extractResult.message || 'FAILED TO EXTRACT POST ID'}`, 'error');
        return;
      }
    }
    
    const response = await authManager.makeAuthenticatedRequest('/api/preview-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId })
    });
    
    console.log('Preview Post - Request sent with Post ID:', postId); // Debug logging
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      displayPostPreview(result.data);
      showStatus(`✅ POST PREVIEW LOADED SUCCESSFULLY`, 'success');
    } else {
      displayPreviewError(result);
      showStatus(`❌ ${result.message || 'FAILED TO LOAD PREVIEW'}`, 'error');
    }
    
  } catch (error) {
    console.error('Error previewing post:', error);
    
    if (previewContainer) {
      previewContainer.innerHTML = `
        <div class="preview-error">
          <div class="preview-error-title">❌ ERROR LOADING PREVIEW</div>
          <div class="preview-error-message">Gagal memuat preview post: ${error.message}</div>
          <div class="preview-error-details">Periksa koneksi internet dan coba lagi</div>
        </div>
      `;
      previewContainer.style.display = 'block';
    }
    
    showStatus(`❌ NETWORK ERROR: ${error.message}`, 'error');
  }
}

// Display post preview
function displayPostPreview(data) {
  const previewContainer = document.getElementById('post-preview');
  
  console.log('displayPostPreview called with data:', data);
  
  // Handle both nested and flat data structures
  let post, comments, stats;
  
  if (data.post) {
    // Nested structure (legacy)
    post = data.post;
    comments = data.comments || [];
    stats = data.stats || {};
  } else {
    // Flat structure (current server response)
    post = {
      id: data.postId,
      text: data.text,
      username: data.author,
      timestamp: data.timestamp,
      permalink: data.permalink,
      media_type: data.mediaType,
      mediaType: data.mediaType, // For consistency
      mediaUrl: data.mediaUrl
    };
    comments = data.comments || [];
    stats = data.stats || {};
  }
  
  // Normalize post properties to ensure consistency
  post.mediaType = post.mediaType || post.media_type;
  post.mediaUrl = post.mediaUrl || post.media_url;
  
  // Ensure stats has all required properties with defaults
  stats = {
    isMonitored: stats.isMonitored || false,
    commentCount: stats.commentCount || comments.length || 0,
    totalComments: stats.totalComments || stats.commentCount || comments.length || 0,
    repliedComments: stats.repliedComments || comments.filter(c => c.isRepliedTo).length || 0,
    isValidForMonitoring: stats.isValidForMonitoring !== undefined ? stats.isValidForMonitoring : true
  };
  
  if (!post || !post.id) {
    console.error('Invalid post data structure:', data);
    showStatus('❌ INVALID POST DATA STRUCTURE', 'error');
    return;
  }
  
  // Store post ID for later reference
  previewContainer.dataset.postId = post.id;
  
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const commentsHtml = comments.length > 0 ? 
    comments.map(comment => `
      <div class="preview-comment-item ${comment.isRepliedTo ? 'replied' : ''}">
        <div class="preview-comment-header">
          <span class="preview-comment-author">@${comment.username}</span>
          <span class="preview-comment-time">${formatDate(comment.timestamp)}</span>
        </div>
        <div class="preview-comment-text">${comment.text}</div>
      </div>
    `).join('') :
    '<div class="preview-no-comments">Belum ada komentar pada postingan ini</div>';
  
  previewContainer.innerHTML = `
    <div class="preview-post-info">
      <div class="preview-post-header">
        <div class="preview-post-meta">
          <span class="preview-author">@${post.username || 'unknown'}</span>
          <span class="preview-timestamp">${formatDate(post.timestamp)}</span>
        </div>
        <div class="preview-post-id">${post.id}</div>
      </div>
      
      <div class="preview-post-text">
        ${post.text || '<em>No text content</em>'}
      </div>
      
      ${post.mediaUrl && post.mediaType ? `
        <div class="post-media">
          ${post.mediaType === 'IMAGE' ? 
            `<img src="${post.mediaUrl}" alt="Post media">` :
            post.mediaType === 'VIDEO' ? 
              `<div class="media-placeholder">🎥 Video Content</div>` :
            post.mediaType === 'CAROUSEL_ALBUM' && post.mediaUrls && post.mediaUrls.length > 0 ?
              `<div class="carousel-container">
                <div class="carousel-wrapper">
                  <div class="carousel-images" id="carousel-${post.id}">
                    ${post.mediaUrls.map((url, index) => `
                      <img src="${url}" alt="Album image ${index + 1}" class="carousel-image ${index === 0 ? 'active' : ''}" />
                    `).join('')}
                  </div>
                  ${post.mediaUrls.length > 1 ? `
                    <button class="carousel-prev" onclick="moveCarousel('${post.id}', -1)">‹</button>
                    <button class="carousel-next" onclick="moveCarousel('${post.id}', 1)">›</button>
                    <div class="carousel-indicators">
                      ${post.mediaUrls.map((_, index) => `
                        <span class="indicator ${index === 0 ? 'active' : ''}" onclick="goToSlide('${post.id}', ${index})"></span>
                      `).join('')}
                    </div>
                    <div class="carousel-counter">
                      <span class="current-slide">1</span> / ${post.mediaUrls.length}
                    </div>
                  ` : ''}
                </div>
              </div>` :
            post.mediaType === 'CAROUSEL_ALBUM' ?
              `<div class="media-placeholder">📸 Photo Album (${post.childrenCount || 0} items)</div>` :
            `<div class="media-placeholder">📎 ${post.mediaType.replace('_', ' ').toLowerCase()}</div>`
          }
        </div>
      ` : post.mediaType && post.mediaType !== 'TEXT' ? `
        <div class="post-media">
          ${post.mediaType === 'VIDEO' ? 
            `<div class="media-placeholder">🎥 Video Content (Preview not available)</div>` :
          post.mediaType === 'CAROUSEL_ALBUM' ?
            `<div class="media-placeholder">📸 Photo Album (Preview not available)</div>` :
          post.mediaType === 'IMAGE' ?
            `<div class="media-placeholder">🖼️ Image (Preview not available)</div>` :
          `<div class="media-placeholder">📎 ${post.mediaType.replace('_', ' ').toLowerCase()} (Preview not available)</div>`
          }
        </div>
      ` : ''}
      
      <div class="preview-post-stats">
        <div class="preview-stat-item">
          <span class="preview-stat-icon">💬</span>
          <span>${stats.totalComments || 0} Total Comments</span>
        </div>
        <div class="preview-stat-item">
          <span class="preview-stat-icon">✅</span>
          <span>${stats.repliedComments || 0} Replied</span>
        </div>
        <div class="preview-stat-item">
          <span class="preview-stat-icon">⏳</span>
          <span>${Math.max(0, (stats.totalComments || 0) - (stats.repliedComments || 0))} Pending</span>
        </div>
        <div class="preview-stat-item">
          <span class="preview-stat-icon">${stats.isMonitored ? '🟢' : '⚪'}</span>
          <span>${stats.isMonitored ? 'MONITORED' : 'NOT MONITORED'}</span>
        </div>
      </div>
    </div>
      
    <div class="preview-comments">
      <div class="preview-comments-header">💬 Recent Comments (${comments.length}/${stats.totalComments || 0})</div>
      ${commentsHtml}
    </div>
    
    <div class="preview-actions">
      ${!stats.isMonitored ? 
        `<button onclick="addPostToMonitor('${post.id}')" class="btn btn-primary">
          <span class="btn-text">ADD TO MONITOR</span>
          <span class="btn-icon">➕</span>
        </button>` :
        `<button onclick="removePostFromMonitor('${post.id}')" class="btn btn-secondary">
          <span class="btn-text">REMOVE FROM MONITOR</span>
          <span class="btn-icon">➖</span>
        </button>`
      }
      ${post.permalink ? 
        `<a href="${post.permalink}" target="_blank" class="btn btn-tertiary">
          <span class="btn-text">VIEW ON THREADS</span>
          <span class="btn-icon">🔗</span>
        </a>` : ''
      }
    </div>
  `;
  
  previewContainer.style.display = 'block';
}

// Display preview error
function displayPreviewError(data) {
  const previewContainer = document.getElementById('post-preview');
  
  previewContainer.innerHTML = `
    <div class="preview-error">
      <div class="preview-error-title">❌ ${data.error}</div>
      <div class="preview-error-message">${data.details}</div>
      <div class="preview-error-details">Post ID: ${data.postId}</div>
    </div>
  `;
  
  previewContainer.style.display = 'block';
}

// Helper functions for adding/removing posts
function addPostToMonitor(postId) {
  document.getElementById('newPostInput').value = postId;
  document.getElementById('add-post-btn').click();
}

function removePostFromMonitor(postId) {
  if (!confirm(`Apakah Anda yakin ingin menghapus post ${postId} dari monitoring?`)) {
    return;
  }
  
  showStatus('🔄 REMOVING POST FROM MONITOR...', 'loading');
  
  authManager.makeAuthenticatedRequest(`/api/monitor-post/${postId}`, {
    method: 'DELETE'
  })
  .then(response => response.json())
  .then(result => {
    if (result.success) {
      showStatus(`✅ POST ${postId} REMOVED FROM MONITORING`, 'success');
      // Hide preview if it's the same post
      const previewContainer = document.getElementById('post-preview');
      const currentPreviewPostId = previewContainer.dataset.postId;
      if (currentPreviewPostId === postId) {
        previewContainer.style.display = 'none';
      }
      // Refresh monitored posts list if the function exists
      if (typeof loadMonitoredPosts === 'function') {
        loadMonitoredPosts();
      }
    } else {
      showStatus(`❌ FAILED TO REMOVE POST: ${result.error.toUpperCase()}`, 'error');
    }
  })
  .catch(error => {
    showStatus(`❌ ERROR REMOVING POST: ${error.message}`, 'error');
  });
}

// Carousel navigation functions

function moveCarousel(postId, direction) {
  const carouselContainer = document.getElementById(`carousel-${postId}`);
  const images = carouselContainer.querySelectorAll('.carousel-image');
  const indicators = carouselContainer.parentElement.querySelectorAll('.indicator');
  const counter = carouselContainer.parentElement.querySelector('.current-slide');
  
  let currentIndex = Array.from(images).findIndex(img => img.classList.contains('active'));
  
  // Remove active class from current image and indicator
  images[currentIndex].classList.remove('active');
  if (indicators[currentIndex]) indicators[currentIndex].classList.remove('active');
  
  // Calculate new index
  currentIndex += direction;
  if (currentIndex >= images.length) currentIndex = 0;
  if (currentIndex < 0) currentIndex = images.length - 1;
  
  // Add active class to new image and indicator
  images[currentIndex].classList.add('active');
  if (indicators[currentIndex]) indicators[currentIndex].classList.add('active');
  
  // Update counter
  if (counter) counter.textContent = currentIndex + 1;
}

function goToSlide(postId, slideIndex) {
  const carouselContainer = document.getElementById(`carousel-${postId}`);
  const images = carouselContainer.querySelectorAll('.carousel-image');
  const indicators = carouselContainer.parentElement.querySelectorAll('.indicator');
  const counter = carouselContainer.parentElement.querySelector('.current-slide');
  
  // Remove active class from all images and indicators
  images.forEach(img => img.classList.remove('active'));
  indicators.forEach(ind => ind.classList.remove('active'));
  
  // Add active class to selected image and indicator
  if (images[slideIndex]) images[slideIndex].classList.add('active');
  if (indicators[slideIndex]) indicators[slideIndex].classList.add('active');
  
  // Update counter
  if (counter) counter.textContent = slideIndex + 1;
}

// Add keyboard navigation for carousel
document.addEventListener('keydown', function(e) {
  // Check if we're in a carousel view
  const activeCarousel = document.querySelector('.carousel-container');
  if (!activeCarousel) return;
  
  const postId = activeCarousel.querySelector('[id^="carousel-"]')?.id.replace('carousel-', '');
  if (!postId) return;
  
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    moveCarousel(postId, -1);
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    moveCarousel(postId, 1);
  }
});

// Auto-reply control functions
async function startAutoReply() {
  showStatus('▶️ STARTING AUTO REPLY...', 'loading');
  
  try {
    const response = await authManager.makeAuthenticatedRequest('/api/auto-reply/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      showStatus('✅ AUTO REPLY STARTED SUCCESSFULLY!', 'success');
      loadSettings(); // Refresh status
    } else {
      showStatus(`❌ ERROR: ${result.message || result.error || 'Unknown error'}`, 'error');
    }
  } catch (error) {
    showStatus(`❌ NETWORK ERROR: ${error.message}`, 'error');
  }
}

async function stopAutoReply() {
  showStatus('⏹️ STOPPING AUTO REPLY...', 'loading');
  
  try {
    const response = await authManager.makeAuthenticatedRequest('/api/auto-reply/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      showStatus('✅ AUTO REPLY STOPPED SUCCESSFULLY!', 'success');
      loadSettings(); // Refresh status
    } else {
      showStatus(`❌ ERROR: ${result.message || result.error || 'Unknown error'}`, 'error');
    }
  } catch (error) {
    showStatus(`❌ NETWORK ERROR: ${error.message}`, 'error');
  }
}

async function getAutoReplyStatus() {
  try {
    const response = await authManager.makeAuthenticatedRequest('/api/auto-reply/status');
    const result = await response.json();
    return result.success ? result.data : null;
  } catch (error) {
    console.error('Error getting auto-reply status:', error);
    return null;
  }
}

// Navbar-based dashboard - sidebar legacy code removed

function updateNavbarWithUser() {
  if (!authManager.userData) return;
  
  const userProfile = document.getElementById('user-profile');
  const profileEmail = document.getElementById('profile-email');
  const avatarIcon = document.querySelector('.avatar-icon');
  const avatarIconLarge = document.querySelector('.avatar-icon-large');
  
  if (userProfile && profileEmail) {
    userProfile.style.display = 'flex';
    
    // Set email with proper formatting
    const email = authManager.userData.email || 'user@example.com';
    profileEmail.textContent = email;
    
    // Generate initials from email or name
    const name = authManager.userData.name || '';
    let initials = '👤';
    
    if (name && name.trim()) {
      // Get initials from name (max 2 characters)
      const nameParts = name.trim().split(' ').filter(part => part.length > 0);
      if (nameParts.length >= 2) {
        initials = nameParts[0].charAt(0).toUpperCase() + nameParts[1].charAt(0).toUpperCase();
      } else if (nameParts.length === 1) {
        const singleName = nameParts[0];
        if (singleName.length >= 2) {
          initials = singleName.substring(0, 2).toUpperCase();
        } else {
          initials = singleName.charAt(0).toUpperCase();
        }
      }
    } else if (email && email.includes('@')) {
      // Get initials from email part before @
      const emailPart = email.split('@')[0];
      if (emailPart.length >= 3) {
        // Take first and last character for longer usernames
        initials = emailPart.charAt(0).toUpperCase() + emailPart.charAt(emailPart.length - 1).toUpperCase();
      } else if (emailPart.length === 2) {
        initials = emailPart.toUpperCase();
      } else if (emailPart.length === 1) {
        initials = emailPart.charAt(0).toUpperCase() + '•';
      }
    }
    
    // Ensure initials are exactly 2 characters and valid
    if (initials.length > 2) {
      initials = initials.substring(0, 2);
    } else if (initials.length === 1) {
      initials = initials + '•';
    }
    
    // Update avatar icons with initials
    if (avatarIcon) {
      avatarIcon.textContent = initials === '👤' ? '👤' : initials;
    }
    if (avatarIconLarge) {
      avatarIconLarge.textContent = initials === '👤' ? '👤' : initials;
    }
  }
}

// Profile dropdown functions
function toggleProfileDropdown() {
  const dropdown = document.getElementById('profile-dropdown');
  if (dropdown) {
    dropdown.classList.toggle('show');
  }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
  const userProfile = document.getElementById('user-profile');
  const dropdown = document.getElementById('profile-dropdown');
  
  if (userProfile && dropdown && !userProfile.contains(event.target)) {
    dropdown.classList.remove('show');
  }
});

// Logout function
async function logout() {
  await authManager.logout();
}
