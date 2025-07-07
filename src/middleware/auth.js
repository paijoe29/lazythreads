// Authentication middleware
const { getSupabaseClient, isSupabaseConfigured } = require('../config/supabase');

// Middleware to check authentication
async function requireAuth(req, res, next) {
  // Skip auth if Supabase is not configured
  if (!isSupabaseConfigured()) {
    console.log('⚠️ Authentication skipped - Supabase not configured');
    return next();
  }

  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please provide a valid access token'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const supabase = getSupabaseClient();
    
    // Verify the JWT token
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        message: 'Please login again'
      });
    }

    // Add user info to request
    req.user = user;
    next();

  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication service error',
      message: 'Internal server error'
    });
  }
}

// Middleware for optional auth (user can be logged in or not)
async function optionalAuth(req, res, next) {
  // Skip auth if Supabase is not configured
  if (!isSupabaseConfigured()) {
    return next();
  }

  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const supabase = getSupabaseClient();
      
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (!error && user) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next(); // Continue without auth
  }
}

module.exports = {
  requireAuth,
  optionalAuth
};
