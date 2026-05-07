"""
Security middleware for StudyVerse API
Implements rate limiting, security headers, and request validation
"""
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from collections import defaultdict
from datetime import datetime, timedelta
import re

# Rate limiting storage (in-memory, use Redis in production)
rate_limit_storage = defaultdict(list)

# Rate limit configurations
RATE_LIMITS = {
    '/api/auth/send-otp': {'max_requests': 5, 'window_minutes': 1},
    '/api/auth/verify-otp': {'max_requests': 10, 'window_minutes': 1},
    'default': {'max_requests': 100, 'window_minutes': 1}
}

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses"""
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Security headers
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
        response.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Remove server version headers
        response.headers.pop('Server', None)
        response.headers.pop('X-Powered-By', None)
        
        return response

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware"""
    async def dispatch(self, request: Request, call_next):
        # Get client IP safely (handles proxies and Render environment)
        client_ip = request.client.host if request.client else request.headers.get("X-Forwarded-For", "127.0.0.1")
        path = request.url.path
        
        # Get rate limit config for this endpoint
        config = RATE_LIMITS.get(path, RATE_LIMITS['default'])
        max_requests = config['max_requests']
        window_minutes = config['window_minutes']
        
        # Create rate limit key
        key = f"{client_ip}:{path}"
        
        # Clean old requests outside the time window
        now = datetime.now()
        cutoff = now - timedelta(minutes=window_minutes)
        rate_limit_storage[key] = [
            req_time for req_time in rate_limit_storage[key]
            if req_time > cutoff
        ]
        
        # Check if rate limit exceeded
        if len(rate_limit_storage[key]) >= max_requests:
            return JSONResponse(
                status_code=429,
                content={
                    'detail': f'Rate limit exceeded. Maximum {max_requests} requests per {window_minutes} minute(s).'
                },
                headers={
                    'Retry-After': str(window_minutes * 60)
                }
            )
        
        # Add current request timestamp
        rate_limit_storage[key].append(now)
        
        # Continue with request
        response = await call_next(request)
        
        # Add rate limit headers
        remaining = max_requests - len(rate_limit_storage[key])
        response.headers['X-RateLimit-Limit'] = str(max_requests)
        response.headers['X-RateLimit-Remaining'] = str(max(0, remaining))
        response.headers['X-RateLimit-Reset'] = str(int((now + timedelta(minutes=window_minutes)).timestamp()))
        
        return response

def sanitize_input(value: str) -> str:
    """Sanitize user input to prevent XSS and injection attacks"""
    if not isinstance(value, str):
        return value
    
    # Remove HTML tags
    value = re.sub(r'<[^>]*>', '', value)
    
    # Remove script injections
    value = re.sub(r'javascript:', '', value, flags=re.IGNORECASE)
    value = re.sub(r'on\w+\s*=', '', value, flags=re.IGNORECASE)
    
    # Remove null bytes
    value = value.replace('\0', '')
    
    # Trim whitespace
    value = value.strip()
    
    return value

def validate_email(email: str) -> bool:
    """Validate email format"""
    if not email or not isinstance(email, str):
        return False
    email = email.strip()
    if len(email) > 255:
        return False
    pattern = r'^[a-zA-Z0-9.!#$%&\'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$'
    return bool(re.match(pattern, email))

def validate_phone(phone: str) -> bool:
    """Validate phone number format"""
    if not phone or not isinstance(phone, str):
        return False
    phone = phone.strip()
    # Allow digits, spaces, +, -, (, )
    if not re.match(r'^[\d\s\-\+\(\)]+$', phone):
        return False
    digits_only = re.sub(r'\D', '', phone)
    return 10 <= len(digits_only) <= 15

def validate_text(text: str, min_length: int = 1, max_length: int = 255) -> bool:
    """Validate text input"""
    if not text or not isinstance(text, str):
        return False
    text = text.strip()
    return min_length <= len(text) <= max_length
