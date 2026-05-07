"""
Deadline Checker Service
Monitors task deadlines and sends reminders
"""
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List
from .notification_service import notification_service

class DeadlineChecker:
    def __init__(self):
        self.running = False
        self.check_interval = 300  # Check every 5 minutes
        self.notified_tasks = set()  # Track which tasks we've already notified about
        
    async def check_deadlines(self):
        """Check all users' tasks for upcoming deadlines"""
        try:
            # Note: This requires Firebase REST API or direct database access
            # For now, we'll implement the notification logic
            # The actual user/task fetching will be done when integrated with Firebase
            
            print(f"[SEARCH] Checking deadlines at {datetime.now().strftime('%H:%M:%S')}")
            
            # This will be implemented when Firebase integration is complete
            # For now, the logic is ready to be called from the frontend
            
        except Exception as e:
            print(f"Deadline checker error: {e}")
    
    async def check_user_task_deadline(self, user_id: str, phone: str, task_id: str, task_title: str, deadline: str, completed: bool):
        """Check a specific task's deadline and send reminders if needed"""
        if completed:
            return
        
        if not deadline:
            return
        
        current_time = datetime.now()
        
        try:
            # Parse deadline (HH:MM format)
            hour, minute = map(int, deadline.split(':'))
            deadline_time = current_time.replace(hour=hour, minute=minute, second=0, microsecond=0)
            
            time_diff = (deadline_time - current_time).total_seconds() / 60
            
            task_key = f"{user_id}_{task_id}_{deadline}"
            
            # Send reminder 15 minutes before
            if 14 <= time_diff <= 16 and f"{task_key}_15min" not in self.notified_tasks:
                await self._send_reminder(user_id, phone, task_title, deadline, '15 minutes')
                self.notified_tasks.add(f"{task_key}_15min")
            
            # Send reminder 1 hour before
            elif 59 <= time_diff <= 61 and f"{task_key}_1hour" not in self.notified_tasks:
                await self._send_reminder(user_id, phone, task_title, deadline, '1 hour')
                self.notified_tasks.add(f"{task_key}_1hour")
            
            # Task expired
            elif time_diff < 0 and f"{task_key}_expired" not in self.notified_tasks:
                await self._send_expired_notification(user_id, phone, task_title)
                self.notified_tasks.add(f"{task_key}_expired")
        
        except Exception as e:
            print(f"Error processing task deadline: {e}")
    
    async def _send_reminder(self, user_id: str, phone: str, task_title: str, due_time: str, time_left: str):
        """Send reminder notification"""
        try:
            # Create in-app notification
            from ..routers.notifications import notifications_db
            
            if user_id not in notifications_db:
                notifications_db[user_id] = []
            
            notif_data = {
                'id': f"{user_id}_{len(notifications_db[user_id])}_{int(datetime.now().timestamp())}",
                'title': f'⏰ Task Due in {time_left}',
                'message': f'"{task_title}" is due at {due_time}',
                'type': 'task',
                'link': '/home',
                'read': False,
                'timestamp': datetime.now().isoformat()
            }
            
            notifications_db[user_id].append(notif_data)
            
            # Send SMS if phone available
            if phone:
                notification_service.send_sms(
                    phone,
                    f"⏰ StudyVerse Reminder: '{task_title}' is due in {time_left} at {due_time}. Complete it now!"
                )
            
            print(f"[OK] Reminder sent for task: {task_title}")
        
        except Exception as e:
            print(f"Failed to send reminder: {e}")
    
    async def _send_expired_notification(self, user_id: str, phone: str, task_title: str):
        """Send expired task notification"""
        try:
            from ..routers.notifications import notifications_db
            
            if user_id not in notifications_db:
                notifications_db[user_id] = []
            
            notif_data = {
                'id': f"{user_id}_{len(notifications_db[user_id])}_{int(datetime.now().timestamp())}",
                'title': '⚠️ Task Expired',
                'message': f'"{task_title}" deadline has passed',
                'type': 'task',
                'link': '/home',
                'read': False,
                'timestamp': datetime.now().isoformat()
            }
            
            notifications_db[user_id].append(notif_data)
            
            if phone:
                notification_service.send_sms(
                    phone,
                    f"⚠️ StudyVerse: Task '{task_title}' deadline has passed. Review your schedule!"
                )
            
            print(f"[WARN] Expired notification sent for: {task_title}")
        
        except Exception as e:
            print(f"Failed to send expired notification: {e}")
    
    async def run(self):
        """Run the deadline checker loop"""
        self.running = True
        print("[DeadlineChecker] Started")
        
        while self.running:
            await self.check_deadlines()
            await asyncio.sleep(self.check_interval)
    
    def start(self):
        """Start deadline checker in background"""
        import threading
        
        def run_loop():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(self.run())
        
        thread = threading.Thread(target=run_loop, daemon=True)
        thread.start()
    
    def stop(self):
        """Stop the deadline checker"""
        self.running = False

# Singleton instance
deadline_checker = DeadlineChecker()
