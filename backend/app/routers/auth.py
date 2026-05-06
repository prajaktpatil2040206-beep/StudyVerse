from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.email_service import send_otp_email, verify_otp

router = APIRouter()

class OtpRequest(BaseModel):
    email: str

class OtpVerify(BaseModel):
    email: str
    otp: str

@router.post("/send-otp")
async def send_otp(req: OtpRequest):
    if not req.email or "@" not in req.email:
        raise HTTPException(status_code=400, detail="Invalid email address")
    success = send_otp_email(req.email)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send OTP email")
    return {"message": "OTP sent successfully", "email": req.email}

@router.post("/verify-otp")
async def verify(req: OtpVerify):
    if verify_otp(req.email, req.otp):
        return {"message": "OTP verified", "verified": True}
    raise HTTPException(status_code=401, detail="Invalid OTP")
