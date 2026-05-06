// Input validation utilities with strict security checks

// Email validation - strict regex, reject disposable domains
const DISPOSABLE_DOMAINS = ['tempmail.com', 'guerrillamail.com', '10minutemail.com', 'throwaway.email'];
export function validateEmail(email) {
  if (!email || typeof email !== 'string') return { valid: false, error: 'Email is required' };
  const trimmed = email.trim();
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!emailRegex.test(trimmed)) return { valid: false, error: 'Invalid email format' };
  const domain = trimmed.split('@')[1]?.toLowerCase();
  if (DISPOSABLE_DOMAINS.includes(domain)) return { valid: false, error: 'Disposable email addresses are not allowed' };
  if (trimmed.length > 255) return { valid: false, error: 'Email is too long' };
  return { valid: true, value: trimmed };
}

// Phone validation - digits, +, -, spaces, brackets only
export function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') return { valid: false, error: 'Phone number is required' };
  const trimmed = phone.trim();
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  if (!phoneRegex.test(trimmed)) return { valid: false, error: 'Phone number contains invalid characters' };
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length < 10) return { valid: false, error: 'Phone number is too short' };
  if (digitsOnly.length > 15) return { valid: false, error: 'Phone number is too long' };
  return { valid: true, value: trimmed };
}

// Text/name validation - strip HTML and script injections
export function validateText(text, fieldName = 'Field', minLength = 1, maxLength = 255) {
  if (!text || typeof text !== 'string') return { valid: false, error: `${fieldName} is required` };
  const trimmed = text.trim();
  // Remove HTML tags and script injections
  const cleaned = trimmed.replace(/<[^>]*>/g, '').replace(/javascript:/gi, '').replace(/on\w+=/gi, '');
  if (cleaned.length < minLength) return { valid: false, error: `${fieldName} must be at least ${minLength} characters` };
  if (cleaned.length > maxLength) return { valid: false, error: `${fieldName} must be less than ${maxLength} characters` };
  // Reject null bytes
  if (cleaned.includes('\0')) return { valid: false, error: `${fieldName} contains invalid characters` };
  return { valid: true, value: cleaned };
}

// Number validation - enforce min/max range, reject non-numeric
export function validateNumber(value, fieldName = 'Field', min = null, max = null) {
  if (value === null || value === undefined || value === '') return { valid: false, error: `${fieldName} is required` };
  const num = Number(value);
  if (isNaN(num)) return { valid: false, error: `${fieldName} must be a number` };
  if (min !== null && num < min) return { valid: false, error: `${fieldName} must be at least ${min}` };
  if (max !== null && num > max) return { valid: false, error: `${fieldName} must be at most ${max}` };
  return { valid: true, value: num };
}

// Password validation - minimum 8 chars, 1 uppercase, 1 number, 1 special
export function validatePassword(password) {
  if (!password || typeof password !== 'string') return { valid: false, error: 'Password is required' };
  if (password.length < 8) return { valid: false, error: 'Password must be at least 8 characters' };
  if (!/[A-Z]/.test(password)) return { valid: false, error: 'Password must contain at least 1 uppercase letter' };
  if (!/[0-9]/.test(password)) return { valid: false, error: 'Password must contain at least 1 number' };
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return { valid: false, error: 'Password must contain at least 1 special character' };
  return { valid: true, value: password };
}

// File validation - whitelist extensions, verify MIME type, max size
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOC_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function validateFile(file, allowedTypes = ALLOWED_IMAGE_TYPES, maxSize = MAX_FILE_SIZE) {
  if (!file) return { valid: false, error: 'File is required' };
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}` };
  }
  if (file.size > maxSize) {
    return { valid: false, error: `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB` };
  }
  // Check for path traversal in filename
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    return { valid: false, error: 'Invalid filename' };
  }
  return { valid: true, value: file };
}

// Date validation - validate format and logical range
export function validateDate(dateStr, fieldName = 'Date') {
  if (!dateStr) return { valid: false, error: `${fieldName} is required` };
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return { valid: false, error: `${fieldName} is invalid` };
  // Check if date is in reasonable range (1900 - 2100)
  const year = date.getFullYear();
  if (year < 1900 || year > 2100) return { valid: false, error: `${fieldName} is out of valid range` };
  return { valid: true, value: dateStr };
}

// URL validation - validate format, reject dangerous schemes
export function validateURL(url, fieldName = 'URL') {
  if (!url || typeof url !== 'string') return { valid: false, error: `${fieldName} is required` };
  const trimmed = url.trim();
  // Reject dangerous schemes
  const dangerousSchemes = ['javascript:', 'data:', 'vbscript:', 'file:'];
  if (dangerousSchemes.some(scheme => trimmed.toLowerCase().startsWith(scheme))) {
    return { valid: false, error: `${fieldName} contains invalid protocol` };
  }
  try {
    const urlObj = new URL(trimmed);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, error: `${fieldName} must use HTTP or HTTPS protocol` };
    }
    return { valid: true, value: trimmed };
  } catch {
    return { valid: false, error: `${fieldName} is not a valid URL` };
  }
}

// OTP validation - 6 digits only
export function validateOTP(otp) {
  if (!otp || typeof otp !== 'string') return { valid: false, error: 'OTP is required' };
  const trimmed = otp.trim();
  if (!/^\d{6}$/.test(trimmed)) return { valid: false, error: 'OTP must be exactly 6 digits' };
  return { valid: true, value: trimmed };
}

// Sanitize HTML output to prevent XSS
export function sanitizeHTML(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
