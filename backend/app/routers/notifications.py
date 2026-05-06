"""
Notification Routes for StudyVerse
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from ..services.notification_service import notification_service

router = APIRouter(tags=["notifications"])

class SMSRequest(BaseModel):
    phone: str
    message: str

class EmailRequest(BaseModel):
    email: str
    subject: str
    body: str
    attachment_path: Optional[str] = None

class NotificationCreate(BaseModel):
    user_id: str
    title: str
    message: str
    type: str  # 'task', 'score', 'timetable', 'general'
    link: Optional[str] = None

# In-memory notification store (replace with database in production)
notifications_db = {}

@router.post("/sms/send")
async def send_sms(request: SMSRequest):
    """Send SMS notification"""
    result = notification_service.send_sms(request.phone, request.message)
    if not result['success']:
        raise HTTPException(status_code=500, detail=result.get('error', 'Failed to send SMS'))
    return result

@router.post("/email/send")
async def send_email(request: EmailRequest):
    """Send email notification"""
    result = notification_service.send_email(
        request.email,
        request.subject,
        request.body,
        request.attachment_path
    )
    if not result['success']:
        raise HTTPException(status_code=500, detail=result.get('error', 'Failed to send email'))
    return result

@router.post("/create")
async def create_notification(notification: NotificationCreate):
    """Create a new notification for user"""
    user_id = notification.user_id
    
    if user_id not in notifications_db:
        notifications_db[user_id] = []
    
    notif_data = {
        'id': f"{user_id}_{len(notifications_db[user_id])}_{int(datetime.now().timestamp())}",
        'title': notification.title,
        'message': notification.message,
        'type': notification.type,
        'link': notification.link,
        'read': False,
        'timestamp': datetime.now().isoformat()
    }
    
    notifications_db[user_id].append(notif_data)
    
    return {'success': True, 'notification': notif_data}

@router.get("/user/{user_id}")
async def get_user_notifications(user_id: str, unread_only: bool = False):
    """Get all notifications for a user"""
    user_notifs = notifications_db.get(user_id, [])
    
    if unread_only:
        user_notifs = [n for n in user_notifs if not n['read']]
    
    # Sort by timestamp (newest first)
    user_notifs.sort(key=lambda x: x['timestamp'], reverse=True)
    
    return {
        'notifications': user_notifs,
        'unread_count': len([n for n in user_notifs if not n['read']])
    }

@router.put("/mark-read/{notification_id}")
async def mark_notification_read(notification_id: str):
    """Mark a notification as read"""
    for user_id, notifs in notifications_db.items():
        for notif in notifs:
            if notif['id'] == notification_id:
                notif['read'] = True
                return {'success': True, 'notification': notif}
    
    raise HTTPException(status_code=404, detail="Notification not found")

@router.put("/mark-all-read/{user_id}")
async def mark_all_read(user_id: str):
    """Mark all notifications as read for a user"""
    if user_id in notifications_db:
        for notif in notifications_db[user_id]:
            notif['read'] = True
        return {'success': True, 'count': len(notifications_db[user_id])}
    
    return {'success': True, 'count': 0}

@router.delete("/clear-all/{user_id}")
async def clear_all_notifications(user_id: str):
    """Clear all notifications for a user"""
    if user_id in notifications_db:
        count = len(notifications_db[user_id])
        notifications_db[user_id] = []
        return {'success': True, 'cleared': count}
    
    return {'success': True, 'cleared': 0}

@router.delete("/{notification_id}")
async def delete_notification(notification_id: str):
    """Delete a specific notification"""
    for user_id, notifs in notifications_db.items():
        for i, notif in enumerate(notifs):
            if notif['id'] == notification_id:
                del notifications_db[user_id][i]
                return {'success': True}
    
    raise HTTPException(status_code=404, detail="Notification not found")

@router.post("/test/{user_id}")
async def test_notification(user_id: str):
    """Test endpoint to create a sample notification"""
    if user_id not in notifications_db:
        notifications_db[user_id] = []
    
    notif_data = {
        'id': f"{user_id}_test_{int(datetime.now().timestamp())}",
        'title': '🧪 Test Notification',
        'message': 'This is a test notification to verify the system is working!',
        'type': 'general',
        'link': '/dashboard',
        'read': False,
        'timestamp': datetime.now().isoformat()
    }
    
    notifications_db[user_id].append(notif_data)
    
    return {'success': True, 'notification': notif_data}

@router.post("/timetable-ready")
async def notify_timetable_ready(request: dict):
    """Send timetable ready notification and email"""
    user_id = request.get('user_id')
    email = request.get('email')
    phone = request.get('phone')
    timetable_data = request.get('timetable')
    
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id required")
    
    # Create in-app notification
    if user_id not in notifications_db:
        notifications_db[user_id] = []
    
    notif_data = {
        'id': f"{user_id}_{len(notifications_db[user_id])}_{int(datetime.now().timestamp())}",
        'title': '📅 Timetable Ready',
        'message': 'Your personalized timetable has been generated!',
        'type': 'timetable',
        'link': '/mentor',
        'read': False,
        'timestamp': datetime.now().isoformat()
    }
    
    notifications_db[user_id].append(notif_data)
    
    # Send SMS if phone provided
    if phone:
        notification_service.send_sms(
            phone,
            "📅 StudyVerse: Your personalized timetable is ready! Check the app to view it."
        )
    
    # Send email if provided (TODO: implement email with timetable PDF)
    # if email and timetable_data:
    #     notification_service.send_timetable_email(email, timetable_data)
    
    return {'success': True, 'notification': notif_data}

