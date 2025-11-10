/**
 * Validation middleware for backend-auth
 */

/**
 * Validates email format
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates password strength
 */
export const isValidPassword = (password) => {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  
  return { valid: true };
};

/**
 * Sanitizes string input to prevent XSS
 */
export const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, 255); // Limit length
};

/**
 * Validates registration input
 */
export const validateRegistration = (req, res, next) => {
  const { email, password, full_name } = req.body;

  // Validate email
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ message: 'Valid email is required' });
  }

  // Validate password
  const passwordValidation = isValidPassword(password);
  if (!passwordValidation.valid) {
    return res.status(400).json({ message: passwordValidation.message });
  }

  // Sanitize inputs
  req.body.email = sanitizeString(email);
  if (full_name) {
    req.body.full_name = sanitizeString(full_name);
  }

  next();
};

/**
 * Validates login input
 */
export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Valid email is required' });
  }

  // Sanitize email
  req.body.email = sanitizeString(email);

  next();
};

/**
 * Validates password reset request
 */
export const validatePasswordReset = (req, res, next) => {
  const { email } = req.body;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ message: 'Valid email is required' });
  }

  req.body.email = sanitizeString(email);

  next();
};

/**
 * Validates password update request
 */
export const validatePasswordUpdate = (req, res, next) => {
  const { password } = req.body;

  const passwordValidation = isValidPassword(password);
  if (!passwordValidation.valid) {
    return res.status(400).json({ message: passwordValidation.message });
  }

  next();
};

/**
 * Rate limiting helper (simple in-memory implementation)
 * In production, use Redis or similar
 */
const rateLimitStore = new Map();

export const rateLimit = (maxRequests = 5, windowMs = 60000) => {
  return (req, res, next) => {
    const identifier = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    if (rateLimitStore.has(identifier)) {
      const requests = rateLimitStore.get(identifier).filter(time => time > windowStart);
      rateLimitStore.set(identifier, requests);
    } else {
      rateLimitStore.set(identifier, []);
    }

    const requests = rateLimitStore.get(identifier);

    if (requests.length >= maxRequests) {
      return res.status(429).json({ 
        message: 'Too many requests, please try again later' 
      });
    }

    requests.push(now);
    rateLimitStore.set(identifier, requests);
    next();
  };
};

/**
 * Error handling middleware
 */
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Don't expose internal error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'An error occurred' 
    : err.message;

  res.status(err.statusCode || 500).json({
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
