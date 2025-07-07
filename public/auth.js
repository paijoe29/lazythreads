// Authentication JavaScript for login page
class AuthManager {
  constructor() {
    this.baseURL = window.location.origin;
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.checkAuthStatus();
  }

  setupEventListeners() {
    // Form submissions
    document.getElementById('login-form').addEventListener('submit', (e) => this.handleSignIn(e));
    document.getElementById('register-form').addEventListener('submit', (e) => this.handleSignUp(e));
    document.getElementById('forgot-password-form').addEventListener('submit', (e) => this.handleForgotPassword(e));
  }

  async checkAuthStatus() {
    try {
      const token = localStorage.getItem('supabase_token');
      if (token) {
        const response = await fetch(`${this.baseURL}/api/auth/user`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          // User is logged in, redirect to main app
          window.location.href = '/';
          return;
        } else {
          // Token is invalid, remove it
          localStorage.removeItem('supabase_token');
          localStorage.removeItem('user_data');
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    }
  }

  async handleSignIn(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const email = formData.get('email');
    const password = formData.get('password');

    if (!email || !password) {
      this.showStatus('Please fill in all fields', 'error');
      return;
    }

    try {
      this.showStatus('Signing in...', 'loading');
      
      const response = await fetch(`${this.baseURL}/api/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();

      if (result.success) {
        // Store token and user data
        if (result.data.session) {
          localStorage.setItem('supabase_token', result.data.session.access_token);
          localStorage.setItem('user_data', JSON.stringify(result.data.user));
        }

        this.showStatus('Login successful! Redirecting...', 'success');
        
        // Redirect to main app
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      } else {
        this.showStatus(result.message || 'Login failed', 'error');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      this.showStatus('Connection error. Please try again.', 'error');
    }
  }

  async handleSignUp(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const name = formData.get('name');
    const email = formData.get('email');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');

    if (!name || !email || !password || !confirmPassword) {
      this.showStatus('Please fill in all fields', 'error');
      return;
    }

    if (password !== confirmPassword) {
      this.showStatus('Passwords do not match', 'error');
      return;
    }

    if (password.length < 6) {
      this.showStatus('Password must be at least 6 characters', 'error');
      return;
    }

    try {
      this.showStatus('Creating account...', 'loading');
      
      const response = await fetch(`${this.baseURL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password })
      });

      const result = await response.json();

      if (result.success) {
        this.showStatus('Account created! Please check your email for verification.', 'success');
        
        // Switch to sign in form
        setTimeout(() => {
          switchAuthTab('signin');
        }, 2000);
      } else {
        this.showStatus(result.message || 'Registration failed', 'error');
      }
    } catch (error) {
      console.error('Sign up error:', error);
      this.showStatus('Connection error. Please try again.', 'error');
    }
  }

  async handleForgotPassword(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const email = formData.get('email');

    if (!email) {
      this.showStatus('Please enter your email address', 'error');
      return;
    }

    try {
      this.showStatus('Sending reset link...', 'loading');
      
      const response = await fetch(`${this.baseURL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const result = await response.json();

      if (result.success) {
        this.showStatus('Password reset link sent! Check your email.', 'success');
        
        // Switch back to sign in after a delay
        setTimeout(() => {
          showSignIn();
        }, 3000);
      } else {
        this.showStatus(result.message || 'Failed to send reset link', 'error');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      this.showStatus('Connection error. Please try again.', 'error');
    }
  }

  showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    
    // Remove existing status
    statusDiv.innerHTML = '';
    
    // Create status element
    const statusElement = document.createElement('div');
    statusElement.className = `status-message ${type}`;
    statusElement.textContent = message;
    
    statusDiv.appendChild(statusElement);
    
    // Auto remove after 5 seconds (except for loading)
    if (type !== 'loading') {
      setTimeout(() => {
        statusElement.remove();
      }, 5000);
    }
  }
}

// Tab switching functions
function switchAuthTab(tabName) {
  // Remove active class from all tabs and forms
  document.querySelectorAll('.auth-tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
  
  // Add active class to selected tab and form
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`${tabName}-form`).classList.add('active');
  
  // Clear status messages
  document.getElementById('status').innerHTML = '';
}

function showForgotPassword() {
  // Hide all forms
  document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
  document.querySelectorAll('.auth-tab').forEach(tab => tab.classList.remove('active'));
  
  // Show forgot password form
  document.getElementById('forgot-form').classList.add('active');
  
  // Clear status messages
  document.getElementById('status').innerHTML = '';
}

function showSignIn() {
  switchAuthTab('signin');
}

// Initialize auth manager when page loads
document.addEventListener('DOMContentLoaded', () => {
  new AuthManager();
});
