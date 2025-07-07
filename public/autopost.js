// Autopost JavaScript - Frontend Logic
class AutopostManager {
  constructor() {
    this.currentTab = 'generator';
    this.settings = {
      aiProvider: 'gemini',
      systemPrompt: '',
      autoSaveDrafts: true,
      defaultHashtags: true,
      defaultEmojis: true
    };
    this.history = [];
    this.init();
  }

  async init() {
    try {
      // Wait for authManager to be available (from script.js) with timeout
      if (typeof authManager === 'undefined') {
        console.log('Waiting for AuthManager to be available...');
        
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds maximum wait
        
        await new Promise((resolve, reject) => {
          const checkAuth = () => {
            attempts++;
            if (typeof authManager !== 'undefined') {
              console.log('✅ AuthManager is now available');
              resolve();
            } else if (attempts >= maxAttempts) {
              console.error('❌ AuthManager not available after timeout');
              reject(new Error('AuthManager not available'));
            } else {
              setTimeout(checkAuth, 100);
            }
          };
          checkAuth();
        });
      } else {
        console.log('✅ AuthManager already available');
      }

      // Use AuthManager for authentication check
      if (!authManager.isAuthenticated()) {
        try {
          const authStatusResponse = await fetch('/api/auth/status');
          const authStatus = await authStatusResponse.json();
          
          if (!authStatus.success || !authStatus.data.configured) {
            console.log('🔓 Authentication not configured - redirecting to setup');
            this.showStatus('Authentication not configured. Please set up Supabase first.', 'error');
            setTimeout(() => {
              window.location.href = '/panduan-mudah.html';
            }, 3000);
            return;
          } else {
            console.log('🔒 User not authenticated - redirecting to login');
            this.showStatus('Please login to access AutoPost features', 'info');
            setTimeout(() => {
              window.location.href = '/login.html';
            }, 2000);
            return;
          }
        } catch (error) {
          console.log('Authentication check failed:', error.message);
          this.showStatus('Please login to access AutoPost features', 'info');
          setTimeout(() => {
            window.location.href = '/login.html';
          }, 2000);
          return;
        }
      }

      console.log('✅ User is authenticated, initializing AutoPost...');

      // Initialize user profile
      this.showUserProfile();
      
      // Load settings (gracefully handle failures)
      await this.loadSettings();
      
      // Load history (gracefully handle failures)
      await this.loadHistory();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Initialize UI
      this.updateUI();
      
      console.log('✅ Autopost Manager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Autopost Manager:', error);
      
      // If AuthManager is not available, show error and redirect
      if (error.message === 'AuthManager not available') {
        this.showStatus('Authentication system failed to load. Redirecting to login...', 'error');
        setTimeout(() => {
          window.location.href = '/login.html';
        }, 3000);
      } else {
        this.showStatus('Failed to initialize app', 'error');
      }
    }
  }

  async makeAuthenticatedRequest(url, options = {}) {
    // Check if authManager is available
    if (typeof authManager === 'undefined') {
      throw new Error('Authentication system not available');
    }

    // Use AuthManager's headers instead of manually handling token
    const defaultOptions = {
      headers: authManager.getAuthHeaders()
    };

    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    };

    const response = await fetch(url, mergedOptions);
    
    if (response.status === 401) {
      // Clear auth data and redirect
      localStorage.removeItem('supabase_token');
      localStorage.removeItem('user_data');
      console.log('Token expired or invalid, redirecting to login');
      window.location.href = '/login.html';
      throw new Error('Authentication failed');
    }
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  showUserProfile() {
    const userProfile = document.getElementById('user-profile');
    const profileEmail = document.getElementById('profile-email');
    
    if (userProfile) {
      if (typeof authManager !== 'undefined' && authManager.isAuthenticated() && authManager.userData) {
        userProfile.style.display = 'block';
        if (profileEmail) {
          profileEmail.textContent = authManager.userData.email || 'user@example.com';
        }
      } else {
        // Hide user profile if not authenticated or authManager not available
        userProfile.style.display = 'none';
      }
    }
  }

  setupEventListeners() {
    // Form submission
    const generatorForm = document.getElementById('generator-form');
    if (generatorForm) {
      generatorForm.addEventListener('submit', (e) => this.handleGeneratePost(e));
    }

    // Settings form
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
      settingsForm.addEventListener('submit', (e) => this.handleSaveSettings(e));
    }

    // Generated content actions
    this.setupGeneratedContentActions();
    
    // History actions
    this.setupHistoryActions();

    // Navigation
    this.setupNavigation();

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Close modal with Escape key
      if (e.key === 'Escape') {
        const modal = document.getElementById('modal-overlay');
        if (modal && modal.classList.contains('show')) {
          this.hideModal();
        }
      }
    });
  }

  setupGeneratedContentActions() {
    const regenerateBtn = document.getElementById('regenerate-btn');
    const editBtn = document.getElementById('edit-btn');
    const saveDraftBtn = document.getElementById('save-draft-btn');
    const postNowBtn = document.getElementById('post-now-btn');

    if (regenerateBtn) {
      regenerateBtn.addEventListener('click', () => this.regeneratePost());
    }
    
    if (editBtn) {
      editBtn.addEventListener('click', () => this.editPost());
    }
    
    if (saveDraftBtn) {
      saveDraftBtn.addEventListener('click', () => this.saveDraft());
    }
    
    if (postNowBtn) {
      postNowBtn.addEventListener('click', () => this.postNow());
    }
  }

  setupHistoryActions() {
    const refreshHistoryBtn = document.getElementById('refresh-history-btn');
    const clearHistoryBtn = document.getElementById('clear-history-btn');

    if (refreshHistoryBtn) {
      refreshHistoryBtn.addEventListener('click', () => this.loadHistory());
    }
    
    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', () => this.clearHistory());
    }
  }

  setupNavigation() {
    // Tab switching is handled by global functions
    // Profile dropdown
    const profileAvatar = document.querySelector('.profile-avatar');
    if (profileAvatar) {
      profileAvatar.addEventListener('click', () => this.toggleProfileDropdown());
    }
  }

  async handleGeneratePost(e) {
    e.preventDefault();
    
    // Security check: ensure user is authenticated using AuthManager
    if (typeof authManager === 'undefined' || !authManager.isAuthenticated()) {
      this.showStatus('Please login first to generate posts', 'error');
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 2000);
      return;
    }
    
    const formData = new FormData(e.target);
    const postData = {
      idea: formData.get('postIdea'),
      style: formData.get('postStyle'),
      length: formData.get('postLength'),
      targetAudience: formData.get('targetAudience'),
      includeHashtags: formData.get('includeHashtags') === 'on',
      includeEmojis: formData.get('includeEmojis') === 'on',
      includeCTA: formData.get('includeCTA') === 'on'
    };

    if (!postData.idea.trim()) {
      this.showStatus('Please enter your post idea', 'error');
      return;
    }

    this.showLoading('generator-form');
    
    try {
      const response = await this.makeAuthenticatedRequest('/api/autopost/generate', {
        method: 'POST',
        body: JSON.stringify(postData)
      });

      if (response.success) {
        this.displayGeneratedPost(response.data);
        this.showStatus('Post generated successfully!', 'success');
        
        // Auto-save as draft if enabled
        if (this.settings.autoSaveDrafts) {
          await this.saveDraft(response.data.content, postData);
        }
      } else {
        throw new Error(response.message || 'Failed to generate post');
      }
    } catch (error) {
      console.error('Error generating post:', error);
      if (error.message.includes('Authentication failed')) {
        this.showStatus('Session expired. Please login again.', 'error');
        setTimeout(() => {
          window.location.href = '/login.html';
        }, 2000);
      } else {
        this.showStatus(error.message || 'Failed to generate post', 'error');
      }
    } finally {
      this.hideLoading('generator-form');
    }
  }

  displayGeneratedPost(data) {
    const generatedContent = document.getElementById('generated-content');
    const generatedText = document.getElementById('generated-text');
    const charCount = document.getElementById('char-count');
    const wordCount = document.getElementById('word-count');
    const resultPlaceholder = document.getElementById('result-placeholder');
    const resultTitle = document.getElementById('result-title');
    const resultSubtitle = document.getElementById('result-subtitle');

    if (generatedContent && generatedText) {
      // Hide placeholder content
      if (resultPlaceholder) {
        resultPlaceholder.style.display = 'none';
      }
      
      // Update card header
      if (resultTitle) {
        resultTitle.textContent = '🎯 GENERATED POST';
      }
      if (resultSubtitle) {
        resultSubtitle.textContent = 'AI-generated content based on your idea';
      }
      
      // Show generated content
      generatedText.textContent = data.content;
      generatedContent.style.display = 'block';
      generatedContent.scrollIntoView({ behavior: 'smooth' });

      // Update stats
      if (charCount) charCount.textContent = data.content.length;
      if (wordCount) wordCount.textContent = data.content.split(/\s+/).filter(word => word.length > 0).length;

      // Store generated data for actions
      this.currentGeneratedPost = data;
    }
  }

  showPlaceholder() {
    const generatedContent = document.getElementById('generated-content');
    const resultPlaceholder = document.getElementById('result-placeholder');
    const resultTitle = document.getElementById('result-title');
    const resultSubtitle = document.getElementById('result-subtitle');

    // Hide generated content
    if (generatedContent) {
      generatedContent.style.display = 'none';
    }
    
    // Show placeholder content
    if (resultPlaceholder) {
      resultPlaceholder.style.display = 'block';
    }
    
    // Reset card header to default
    if (resultTitle) {
      resultTitle.textContent = '📝 HASIL GENERATE';
    }
    if (resultSubtitle) {
      resultSubtitle.textContent = 'Generated content akan muncul di sini';
    }
    
    // Clear stored data
    this.currentGeneratedPost = null;
  }

  async regeneratePost() {
    // Get the original form data and regenerate
    const form = document.getElementById('generator-form');
    if (form) {
      await this.handleGeneratePost({ preventDefault: () => {}, target: form });
    }
  }

  editPost() {
    const generatedText = document.getElementById('generated-text');
    if (generatedText) {
      const currentText = generatedText.textContent;
      
      // Create editable textarea
      const textarea = document.createElement('textarea');
      textarea.value = currentText;
      textarea.className = 'form-textarea';
      textarea.style.minHeight = '200px';
      
      // Replace text with textarea
      generatedText.replaceWith(textarea);
      
      // Add save button
      const saveBtn = document.createElement('button');
      saveBtn.textContent = 'Save Changes';
      saveBtn.className = 'btn btn-primary';
      saveBtn.onclick = () => {
        const newDiv = document.createElement('div');
        newDiv.id = 'generated-text';
        newDiv.className = 'post-text';
        newDiv.textContent = textarea.value;
        
        textarea.replaceWith(newDiv);
        saveBtn.remove();
        
        // Update current post data
        if (this.currentGeneratedPost) {
          this.currentGeneratedPost.content = textarea.value;
        }
        
        // Update stats
        const charCount = document.getElementById('char-count');
        const wordCount = document.getElementById('word-count');
        if (charCount) charCount.textContent = textarea.value.length;
        if (wordCount) wordCount.textContent = textarea.value.split(/\s+/).filter(word => word.length > 0).length;
        
        this.showStatus('Post updated successfully', 'success');
      };
      
      textarea.parentNode.appendChild(saveBtn);
      textarea.focus();
    }
  }

  async saveDraft(content = null, metadata = null) {
    const postContent = content || (this.currentGeneratedPost ? this.currentGeneratedPost.content : null);
    
    if (!postContent) {
      this.showStatus('No content to save', 'error');
      return;
    }

    try {
      const response = await this.makeAuthenticatedRequest('/api/autopost/draft', {
        method: 'POST',
        body: JSON.stringify({
          content: postContent,
          metadata: metadata || {},
          timestamp: new Date().toISOString()
        })
      });

      if (response.success) {
        this.showStatus('Draft saved successfully!', 'success');
        await this.loadHistory(); // Refresh history
      } else {
        throw new Error(response.message || 'Failed to save draft');
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      this.showStatus(error.message || 'Failed to save draft', 'error');
    }
  }

  async postNow() {
    if (!this.currentGeneratedPost) {
      this.showStatus('No content to post', 'error');
      return;
    }

    // Show custom confirmation modal
    const confirmed = await this.showConfirmModal({
      title: 'KONFIRMASI POST',
      subtitle: 'Pastikan konten sudah sesuai sebelum posting',
      message: 'Apakah Anda yakin ingin memposting konten ini ke Threads? Konten yang sudah diposting tidak dapat dihapus.',
      icon: '📤',
      confirmText: 'YA, POST SEKARANG',
      cancelText: 'BATAL'
    });

    if (!confirmed) {
      return;
    }

    try {
      // Show loading state
      this.showLoadingModal('MEMPOSTING KONTEN...', 'Mohon tunggu, sedang memproses post Anda');

      const response = await this.makeAuthenticatedRequest('/api/autopost/publish', {
        method: 'POST',
        body: JSON.stringify({
          content: this.currentGeneratedPost.content,
          timestamp: new Date().toISOString()
        })
      });

      // Hide loading modal
      this.hideModal();

      if (response.success) {
        // Show success modal with animation
        await this.showSuccessModal({
          title: 'POST BERHASIL!',
          subtitle: 'Konten Anda telah berhasil diposting ke Threads',
          message: 'Post Anda sudah live dan dapat dilihat oleh followers. Terima kasih telah menggunakan AutoPost AI!',
          icon: '🎉'
        });
        
        await this.loadHistory(); // Refresh history
        this.showStatus('Post published successfully!', 'success');
      } else {
        throw new Error(response.message || 'Failed to publish post');
      }
    } catch (error) {
      this.hideModal();
      console.error('Error publishing post:', error);
      this.showStatus(error.message || 'Failed to publish post', 'error');
    }
  }

  async loadSettings() {
    try {
      const response = await this.makeAuthenticatedRequest('/api/autopost/settings');
      if (response.success) {
        this.settings = { ...this.settings, ...response.data };
        this.populateSettingsForm();
        console.log('✅ Settings loaded successfully');
      }
    } catch (error) {
      console.log('⚠️ Could not load settings from server, using defaults:', error.message);
      // Use default settings if loading fails
      this.populateSettingsForm();
    }
  }

  populateSettingsForm() {
    const aiProvider = document.getElementById('aiProvider');
    const systemPrompt = document.getElementById('systemPrompt');
    const autoSaveDrafts = document.getElementById('autoSaveDrafts');
    const defaultHashtags = document.getElementById('defaultHashtags');
    const defaultEmojis = document.getElementById('defaultEmojis');

    if (aiProvider) aiProvider.value = this.settings.aiProvider || 'gemini';
    if (systemPrompt) systemPrompt.value = this.settings.systemPrompt || '';
    if (autoSaveDrafts) autoSaveDrafts.checked = this.settings.autoSaveDrafts !== false;
    if (defaultHashtags) defaultHashtags.checked = this.settings.defaultHashtags !== false;
    if (defaultEmojis) defaultEmojis.checked = this.settings.defaultEmojis !== false;
  }

  async handleSaveSettings(e) {
    e.preventDefault();
    
    // Security check: ensure user is authenticated using AuthManager
    if (typeof authManager === 'undefined' || !authManager.isAuthenticated()) {
      this.showStatus('Please login first to save settings', 'error');
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 2000);
      return;
    }
    
    const formData = new FormData(e.target);
    const settingsData = {
      aiProvider: formData.get('aiProvider'),
      systemPrompt: formData.get('systemPrompt'),
      autoSaveDrafts: formData.get('autoSaveDrafts') === 'on',
      defaultHashtags: formData.get('defaultHashtags') === 'on',
      defaultEmojis: formData.get('defaultEmojis') === 'on'
    };

    try {
      const response = await this.makeAuthenticatedRequest('/api/autopost/settings', {
        method: 'POST',
        body: JSON.stringify(settingsData)
      });

      if (response.success) {
        this.settings = { ...this.settings, ...settingsData };
        this.showStatus('Settings saved successfully!', 'success');
      } else {
        throw new Error(response.message || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showStatus(error.message || 'Failed to save settings', 'error');
    }
  }

  async loadHistory() {
    try {
      const response = await this.makeAuthenticatedRequest('/api/autopost/history');
      if (response.success) {
        this.history = response.data || [];
        this.renderHistory();
        console.log('✅ History loaded successfully');
      }
    } catch (error) {
      console.log('⚠️ Could not load history from server:', error.message);
      this.history = [];
      this.renderHistory();
    }
  }

  renderHistory() {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;

    if (this.history.length === 0) {
      historyList.innerHTML = `
        <div class="empty-state">
          <h3>No posts yet</h3>
          <p>Generated posts will appear here</p>
        </div>
      `;
      return;
    }

    historyList.innerHTML = this.history.map(item => `
      <div class="history-item" data-id="${item.id}">
        <div class="history-header">
          <span class="history-date">${new Date(item.timestamp).toLocaleString()}</span>
          <span class="history-status ${item.status}">${item.status.toUpperCase()}</span>
        </div>
        <div class="history-content">${item.content.substring(0, 200)}${item.content.length > 200 ? '...' : ''}</div>
        <div class="history-actions">
          <button class="history-btn" onclick="autopostManager.editHistoryItem('${item.id}')">Edit</button>
          <button class="history-btn" onclick="autopostManager.repostItem('${item.id}')">Repost</button>
          <button class="history-btn" onclick="autopostManager.deleteHistoryItem('${item.id}')">Delete</button>
        </div>
      </div>
    `).join('');
  }

  async editHistoryItem(id) {
    const item = this.history.find(h => h.id === id);
    if (!item) return;

    // Switch to generator tab and populate with this content
    this.switchTab('generator');
    
    // Populate form with item metadata if available
    if (item.metadata) {
      const form = document.getElementById('generator-form');
      if (form) {
        const elements = form.elements;
        if (elements.postIdea) elements.postIdea.value = item.metadata.idea || '';
        if (elements.postStyle) elements.postStyle.value = item.metadata.style || 'casual';
        if (elements.postLength) elements.postLength.value = item.metadata.length || 'medium';
      }
    }

    // Display the content as generated
    this.currentGeneratedPost = { content: item.content };
    this.displayGeneratedPost({ content: item.content });
  }

  async repostItem(id) {
    const item = this.history.find(h => h.id === id);
    if (!item) return;

    if (!confirm('Are you sure you want to repost this content?')) return;

    try {
      const response = await this.makeAuthenticatedRequest('/api/autopost/publish', {
        method: 'POST',
        body: JSON.stringify({
          content: item.content,
          timestamp: new Date().toISOString()
        })
      });

      if (response.success) {
        this.showStatus('Post published successfully!', 'success');
        await this.loadHistory(); // Refresh history
      } else {
        throw new Error(response.message || 'Failed to publish post');
      }
    } catch (error) {
      console.error('Error reposting:', error);
      this.showStatus(error.message || 'Failed to repost', 'error');
    }
  }

  async deleteHistoryItem(id) {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const response = await this.makeAuthenticatedRequest(`/api/autopost/history/${id}`, {
        method: 'DELETE'
      });

      if (response.success) {
        this.showStatus('Item deleted successfully', 'success');
        await this.loadHistory(); // Refresh history
      } else {
        throw new Error(response.message || 'Failed to delete item');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      this.showStatus(error.message || 'Failed to delete item', 'error');
    }
  }

  async clearHistory() {
    if (!confirm('Are you sure you want to clear all history? This action cannot be undone.')) return;

    try {
      const response = await this.makeAuthenticatedRequest('/api/autopost/history', {
        method: 'DELETE'
      });

      if (response.success) {
        this.history = [];
        this.renderHistory();
        this.showStatus('History cleared successfully', 'success');
      } else {
        throw new Error(response.message || 'Failed to clear history');
      }
    } catch (error) {
      console.error('Error clearing history:', error);
      this.showStatus(error.message || 'Failed to clear history', 'error');
    }
  }

  switchTab(tabName) {
    // Security check: ensure user is authenticated before switching to protected tabs using AuthManager
    if ((typeof authManager === 'undefined' || !authManager.isAuthenticated()) && (tabName === 'generator' || tabName === 'history' || tabName === 'settings')) {
      this.showStatus('Please login first to access this feature', 'error');
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 2000);
      return;
    }
    
    this.currentTab = tabName;
    
    // Update tab content visibility
    document.querySelectorAll('.tab-content').forEach(tab => {
      tab.classList.remove('active');
    });
    
    const activeTab = document.getElementById(`${tabName}-tab`);
    if (activeTab) {
      activeTab.classList.add('active');
    }
    
    // Update navigation active states
    document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(item => {
      item.classList.remove('active');
    });
    
    document.querySelectorAll(`[data-tab="${tabName}"]`).forEach(item => {
      item.classList.add('active');
    });
    
    // Update page title
    const titles = {
      generator: 'AI POST GENERATOR',
      history: 'POST HISTORY', 
      settings: 'AUTOPOST SETTINGS'
    };
    
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
      pageTitle.textContent = titles[tabName] || 'AUTOPOST';
    }
  }

  updateUI() {
    // Set default form values based on settings
    const includeHashtags = document.getElementById('includeHashtags');
    const includeEmojis = document.getElementById('includeEmojis');
    
    if (includeHashtags) includeHashtags.checked = this.settings.defaultHashtags;
    if (includeEmojis) includeEmojis.checked = this.settings.defaultEmojis;
  }

  showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.classList.add('loading');
    }
  }

  hideLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.classList.remove('loading');
    }
  }

  showStatus(message, type = 'info') {
    const statusContainer = document.getElementById('status');
    if (!statusContainer) return;

    const statusMessage = document.createElement('div');
    statusMessage.className = `status-message ${type}`;
    statusMessage.textContent = message;

    statusContainer.appendChild(statusMessage);

    // Auto remove after 5 seconds
    setTimeout(() => {
      statusMessage.remove();
    }, 5000);

    // Add click to dismiss
    statusMessage.addEventListener('click', () => {
      statusMessage.remove();
    });
  }

  toggleProfileDropdown() {
    const dropdown = document.getElementById('profile-dropdown');
    if (dropdown) {
      dropdown.classList.toggle('show');
    }
  }

  async logout() {
    try {
      if (typeof authManager !== 'undefined' && authManager.isAuthenticated()) {
        await this.makeAuthenticatedRequest('/api/auth/signout', {
          method: 'POST'
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear auth data without redirecting (let AuthManager handle this)
      localStorage.removeItem('supabase_token');
      localStorage.removeItem('user_data');
      this.showUserProfile();
      // Show message and redirect after delay to allow user to see the message
      this.showStatus('Logged out successfully', 'info');
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 1500);
    }
  }

  showLoginRequired() {
    // Create login overlay if it doesn't exist
    let overlay = document.getElementById('login-required-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'login-required-overlay';
      overlay.innerHTML = `
        <div class="login-overlay">
          <div class="login-card">
            <h2>🔒 Login Required</h2>
            <p>You need to login to access AutoPost features</p>
            <div class="login-actions">
              <a href="/login.html" class="btn btn-primary">Login Now</a>
              <a href="/panduan-mudah.html" class="btn btn-secondary">Setup Guide</a>
            </div>
          </div>
        </div>
      `;
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
      `;
      document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
  }

  hideLoginRequired() {
    const overlay = document.getElementById('login-required-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  // Modal Helper Methods
  showConfirmModal(options) {
    return new Promise((resolve) => {
      const modal = document.getElementById('modal-overlay');
      const header = document.getElementById('modal-header');
      const icon = document.getElementById('modal-icon');
      const titleText = document.getElementById('modal-title-text');
      const subtitle = document.getElementById('modal-subtitle');
      const text = document.getElementById('modal-text');
      const actions = document.getElementById('modal-actions');
      
      // Reset modal classes
      modal.className = 'modal-overlay';
      header.style.background = '';
      header.style.color = '';
      
      // Set content
      icon.textContent = options.icon || '❓';
      titleText.textContent = options.title || 'KONFIRMASI';
      subtitle.textContent = options.subtitle || '';
      text.textContent = options.message || '';
      
      // Create action buttons
      actions.innerHTML = `
        <button type="button" class="modal-btn" id="modal-cancel-btn">
          ${options.cancelText || 'BATAL'}
        </button>
        <button type="button" class="modal-btn btn-primary" id="modal-confirm-btn">
          ${options.confirmText || 'KONFIRMASI'}
        </button>
      `;
      
      // Add event listeners
      const cancelBtn = document.getElementById('modal-cancel-btn');
      const confirmBtn = document.getElementById('modal-confirm-btn');
      
      cancelBtn.onclick = () => {
        this.hideModal();
        resolve(false);
      };
      
      confirmBtn.onclick = () => {
        this.hideModal();
        resolve(true);
      };
      
      // Close on overlay click
      modal.onclick = (e) => {
        if (e.target === modal) {
          this.hideModal();
          resolve(false);
        }
      };
      
      // Show modal
      modal.classList.add('show');
    });
  }

  showLoadingModal(title, message) {
    const modal = document.getElementById('modal-overlay');
    const header = document.getElementById('modal-header');
    const icon = document.getElementById('modal-icon');
    const titleText = document.getElementById('modal-title-text');
    const subtitle = document.getElementById('modal-subtitle');
    const text = document.getElementById('modal-text');
    const actions = document.getElementById('modal-actions');
    
    // Reset modal classes
    modal.className = 'modal-overlay';
    header.style.background = 'var(--info-color)';
    header.style.color = 'var(--secondary-color)';
    
    // Set content
    icon.textContent = '⏳';
    titleText.textContent = title || 'LOADING...';
    subtitle.textContent = 'Mohon tunggu sebentar';
    text.textContent = message || 'Sedang memproses permintaan Anda...';
    
    // Remove action buttons
    actions.innerHTML = '';
    
    // Show modal
    modal.classList.add('show');
  }

  async showSuccessModal(options) {
    return new Promise((resolve) => {
      const modal = document.getElementById('modal-overlay');
      const header = document.getElementById('modal-header');
      const icon = document.getElementById('modal-icon');
      const titleText = document.getElementById('modal-title-text');
      const subtitle = document.getElementById('modal-subtitle');
      const text = document.getElementById('modal-text');
      const actions = document.getElementById('modal-actions');
      
      // Add success styling
      modal.className = 'modal-overlay success-modal';
      header.style.background = 'var(--success-color)';
      header.style.color = 'var(--secondary-color)';
      
      // Set content
      icon.textContent = options.icon || '✅';
      icon.classList.add('success-icon');
      titleText.textContent = options.title || 'BERHASIL!';
      subtitle.textContent = options.subtitle || '';
      text.textContent = options.message || '';
      
      // Create confetti effect
      this.createConfetti();
      
      // Create action button
      actions.innerHTML = `
        <button type="button" class="modal-btn btn-success" id="modal-ok-btn">
          LANJUTKAN
        </button>
      `;
      
      // Add event listener
      const okBtn = document.getElementById('modal-ok-btn');
      okBtn.onclick = () => {
        this.hideModal();
        resolve(true);
      };
      
      // Show modal
      modal.classList.add('show');
      
      // Auto close after 5 seconds
      setTimeout(() => {
        if (modal.classList.contains('show')) {
          this.hideModal();
          resolve(true);
        }
      }, 5000);
    });
  }

  createConfetti() {
    const modal = document.querySelector('.modal-dialog');
    const confettiContainer = document.createElement('div');
    confettiContainer.className = 'success-confetti';
    modal.appendChild(confettiContainer);
    
    // Create confetti pieces
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti-piece';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.animationDelay = Math.random() * 2 + 's';
      confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
      confettiContainer.appendChild(confetti);
    }
    
    // Remove confetti after animation
    setTimeout(() => {
      if (confettiContainer.parentNode) {
        confettiContainer.remove();
      }
    }, 4000);
  }

  hideModal() {
    const modal = document.getElementById('modal-overlay');
    const icon = document.getElementById('modal-icon');
    
    modal.classList.remove('show');
    icon.classList.remove('success-icon');
    
    // Clean up confetti
    const confetti = document.querySelector('.success-confetti');
    if (confetti) {
      confetti.remove();
    }
  }
}

// Global functions for HTML onclick handlers
function switchTab(tabName) {
  if (window.autopostManager) {
    window.autopostManager.switchTab(tabName);
  }
}

function toggleProfileDropdown() {
  if (window.autopostManager) {
    window.autopostManager.toggleProfileDropdown();
  }
}

function logout() {
  if (window.autopostManager) {
    window.autopostManager.logout();
  }
}

function toggleMobileMenu() {
  const overlay = document.getElementById('mobile-menu-overlay');
  const panel = document.getElementById('mobile-menu-panel');
  
  if (overlay && panel) {
    overlay.classList.toggle('show');
    panel.classList.toggle('show');
  }
}

function closeMobileMenu() {
  const overlay = document.getElementById('mobile-menu-overlay');
  const panel = document.getElementById('mobile-menu-panel');
  
  if (overlay && panel) {
    overlay.classList.remove('show');
    panel.classList.remove('show');
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.autopostManager = new AutopostManager();
});

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
  const profileDropdown = document.getElementById('profile-dropdown');
  const profileAvatar = document.querySelector('.profile-avatar');
  
  if (profileDropdown && profileAvatar && !profileAvatar.contains(e.target)) {
    profileDropdown.classList.remove('show');
  }
});
