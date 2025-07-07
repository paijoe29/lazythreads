const express = require('express');
const { getSupabaseClient, isSupabaseConfigured } = require('../config/supabase');
const { successResponse, errorResponse } = require('../utils/helpers');

const router = express.Router();

// Check if auth is configured
router.get('/status', (req, res) => {
  res.json(successResponse({
    configured: isSupabaseConfigured(),
    message: isSupabaseConfigured() ? 'Authentication is enabled' : 'Authentication is disabled'
  }));
});

// Sign up with email and password
router.post('/signup', async (req, res) => {
  if (!isSupabaseConfigured()) {
    return res.status(503).json(errorResponse('Authentication not configured', 'Supabase credentials not provided'));
  }

  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json(errorResponse('Missing credentials', 'Email and password are required'));
    }

    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name || email.split('@')[0]
        }
      }
    });

    if (error) {
      return res.status(400).json(errorResponse('Signup failed', error.message));
    }

    res.json(successResponse({
      user: data.user,
      session: data.session,
      message: 'Account created successfully. Please check your email for verification.'
    }));

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json(errorResponse('Internal server error', error.message));
  }
});

// Sign in with email and password
router.post('/signin', async (req, res) => {
  if (!isSupabaseConfigured()) {
    return res.status(503).json(errorResponse('Authentication not configured', 'Supabase credentials not provided'));
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json(errorResponse('Missing credentials', 'Email and password are required'));
    }

    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(400).json(errorResponse('Login failed', error.message));
    }

    res.json(successResponse({
      user: data.user,
      session: data.session,
      message: 'Login successful'
    }));

  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json(errorResponse('Internal server error', error.message));
  }
});

// Sign out
router.post('/signout', async (req, res) => {
  if (!isSupabaseConfigured()) {
    return res.status(503).json(errorResponse('Authentication not configured', 'Supabase credentials not provided'));
  }

  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(400).json(errorResponse('Signout failed', error.message));
    }

    res.json(successResponse({
      message: 'Signed out successfully'
    }));

  } catch (error) {
    console.error('Signout error:', error);
    res.status(500).json(errorResponse('Internal server error', error.message));
  }
});

// Get current user
router.get('/user', async (req, res) => {
  if (!isSupabaseConfigured()) {
    return res.status(503).json(errorResponse('Authentication not configured', 'Supabase credentials not provided'));
  }

  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(errorResponse('No token provided', 'Authorization header required'));
    }

    const token = authHeader.substring(7);
    const supabase = getSupabaseClient();
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json(errorResponse('Invalid token', 'Please login again'));
    }

    res.json(successResponse({
      user,
      message: 'User data retrieved successfully'
    }));

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json(errorResponse('Internal server error', error.message));
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  if (!isSupabaseConfigured()) {
    return res.status(503).json(errorResponse('Authentication not configured', 'Supabase credentials not provided'));
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json(errorResponse('Missing email', 'Email is required'));
    }

    const supabase = getSupabaseClient();
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${req.protocol}://${req.get('host')}/reset-password`
    });

    if (error) {
      return res.status(400).json(errorResponse('Reset failed', error.message));
    }

    res.json(successResponse({
      message: 'Password reset email sent successfully'
    }));

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json(errorResponse('Internal server error', error.message));
  }
});

module.exports = router;
