// Extract Post ID from various URL formats
function extractPostIdFromUrl(input) {
  console.log('extractPostIdFromUrl called with:', { input, type: typeof input });
  
  if (!input || typeof input !== 'string' || input.trim() === '' || input === 'undefined') {
    console.log('extractPostIdFromUrl: Invalid input');
    return null;
  }

  const cleanInput = input.trim();
  console.log('extractPostIdFromUrl: Clean input:', cleanInput);

  // If it's already a Post ID (numeric or base64-like format)
  if (/^(\d{15,}|[A-Za-z0-9_-]{8,})$/.test(cleanInput)) {
    console.log('extractPostIdFromUrl: Input is already a Post ID');
    return cleanInput;
  }

  // URL patterns to match - Threads Post IDs can be numeric OR base64-like format
  const patterns = [
    // threads.net/@username/post/POST_ID (base64-like format)
    { name: 'threads.net standard', regex: /threads\.net\/@[\w.-]+\/post\/([A-Za-z0-9_-]+)/ },
    // threads.com/@username/post/POST_ID (base64-like format)
    { name: 'threads.com standard', regex: /threads\.com\/@[\w.-]+\/post\/([A-Za-z0-9_-]+)/ },
    // www.threads.net/@username/post/POST_ID
    { name: 'www.threads.net standard', regex: /www\.threads\.net\/@[\w.-]+\/post\/([A-Za-z0-9_-]+)/ },
    // www.threads.com/@username/post/POST_ID
    { name: 'www.threads.com standard', regex: /www\.threads\.com\/@[\w.-]+\/post\/([A-Za-z0-9_-]+)/ },
    // threads.net with any path containing ID
    { name: 'threads.net generic', regex: /threads\.net\/.*\/([A-Za-z0-9_-]{8,})/ },
    // threads.com with any path containing ID
    { name: 'threads.com generic', regex: /threads\.com\/.*\/([A-Za-z0-9_-]{8,})/ },
    // Direct post ID in URL parameter
    { name: 'url parameter', regex: /[?&]post[_-]?id=([A-Za-z0-9_-]+)/i },
    // Generic pattern for IDs at end of URL
    { name: 'end of URL', regex: /\/([A-Za-z0-9_-]{8,})(?:[?#].*)?$/ },
    // Numeric-only fallback for legacy format
    { name: 'numeric fallback', regex: /(\d{15,})/ }
  ];

  for (const pattern of patterns) {
    const match = cleanInput.match(pattern.regex);
    if (match && match[1]) {
      console.log(`extractPostIdFromUrl: Match found with ${pattern.name} pattern:`, match[1]);
      return match[1];
    }
  }

  console.log('extractPostIdFromUrl: No patterns matched');
  return null;
}

// Validate Post ID format - Threads Post IDs are NUMERIC only
function validatePostId(postId) {
  if (!postId || typeof postId !== 'string' || postId === 'undefined' || postId.trim() === '') {
    return false;
  }

  const cleanPostId = postId.trim();
  
  // Threads Post IDs are numeric only (15-20 digits)
  return /^\d{15,20}$/.test(cleanPostId);
}

// Format timestamp for display
function formatTimestamp(timestamp) {
  if (!timestamp) return 'Unknown';
  
  try {
    return new Date(timestamp).toLocaleString('id-ID', {
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return 'Invalid Date';
  }
}

// Truncate text for display
function truncateText(text, maxLength = 100) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength - 3) + '...';
}

// Clean and format text content
function cleanText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return text
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n+/g, ' ') // Replace newlines with space
    .trim();
}

// Generate random delay for rate limiting
function getRandomDelay(min = 1000, max = 3000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Validate URL format
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// Check if string contains Threads URL
function isThreadsUrl(string) {
  if (!string || typeof string !== 'string') {
    return false;
  }
  
  return /threads\.(net|com)/i.test(string);
}

// Generate success response
function successResponse(data = {}, message = 'Success') {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };
}

// Generate error response
function errorResponse(message = 'An error occurred', details = null) {
  return {
    success: false,
    message,
    details,
    timestamp: new Date().toISOString()
  };
}

// Safe JSON parse
function safeJsonParse(jsonString, defaultValue = null) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('JSON parse error:', error);
    return defaultValue;
  }
}

// Rate limiting helper
class RateLimiter {
  constructor(maxRequests = 10, timeWindow = 60000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.requests = new Map();
  }

  isAllowed(identifier) {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    
    // Remove old requests outside time window
    const validRequests = userRequests.filter(time => now - time < this.timeWindow);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    return true;
  }

  getRemainingRequests(identifier) {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    const validRequests = userRequests.filter(time => now - time < this.timeWindow);
    return Math.max(0, this.maxRequests - validRequests.length);
  }
}

module.exports = {
  extractPostIdFromUrl,
  validatePostId,
  formatTimestamp,
  truncateText,
  cleanText,
  getRandomDelay,
  isValidUrl,
  isThreadsUrl,
  successResponse,
  errorResponse,
  safeJsonParse,
  RateLimiter
};
