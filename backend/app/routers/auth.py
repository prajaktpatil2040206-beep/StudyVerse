from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, validator
from app.services.email_service import send_otp_email, verify_otp
from app.middleware.security import validate_email, sanitize_input  # Input validation

router = APIRouter()

class OtpRequest(BaseModel):
    email: str
    
    @validator('email')
    def validate_email_format(cls, v):
        v = sanitize_input(v)
        if not validate_email(v):
            raise ValueError('Invalid email address format')
        return v.lower().strip()

class OtpVerify(BaseModel):
    email: str
    otp: str
    
    @validator('email')
    def validate_email_format(cls, v):
        v = sanitize_input(v)
        if not validate_email(v):
            raise ValueError('Invalid email address format')
        return v.lower().strip()
    
    @validator('otp')
    def validate_otp_format(cls, v):
        v = sanitize_input(v)
        if not v.isdigit() or len(v) != 6:
            raise ValueError('OTP must be exactly 6 digits')
        return v

@router.post("/send-otp")
async def send_otp(req: OtpRequest):
    """Send OTP to email - rate limited to 5 requests per minute"""
    try:
        success = send_otp_email(req.email)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to send OTP email")
        return {"message": "OTP sent successfully", "email": req.email}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        # Don't expose internal errors in production
        raise HTTPException(status_code=500, detail="An error occurred while sending OTP")

@router.post("/verify-otp")
async def verify(req: OtpVerify):
    """Verify OTP - rate limited to 10 requests per minute"""
    try:
        if verify_otp(req.email, req.otp):
            return {"message": "OTP verified", "verified": True}
        raise HTTPException(status_code=401, detail="Invalid OTP")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        # Don't expose internal errors in production
        raise HTTPException(status_code=500, detail="An error occurred during verification")
