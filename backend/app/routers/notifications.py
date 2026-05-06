from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.services.email_service import send_notification_email

router = APIRouter()

class NotificationRequest(BaseModel):
    email: str
    subject: str
    message: str
    type: Optional[str] = "general"

@router.post("/send")
async def send_notification(req: NotificationRequest):
    success = send_notification_email(req.email, req.subject, req.message)
    return {"sent": success, "message": "Notification sent" if success else "Failed to send"}
