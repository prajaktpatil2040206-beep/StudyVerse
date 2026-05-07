"""
Scheduler Service for StudyVerse
Handles daily resets and scheduled tasks
"""
from datetime import datetime, time
import asyncio
from typing import Callable
import threading

class SchedulerService:
    def __init__(self):
        self.tasks = []
        self.running = False
    
    def schedule_daily(self, hour: int, minute: int, callback: Callable):
        """Schedule a task to run daily at specific time"""
        self.tasks.append({
            'hour': hour,
            'minute': minute,
            'callback': callback,
            'last_run': None
        })
    
    async def run(self):
        """Run the scheduler loop"""
        self.running = True
        while self.running:
            now = datetime.now()
            current_time = now.time()
            
            for task in self.tasks:
                task_time = time(task['hour'], task['minute'])
                
                # Check if it's time to run and hasn't run today
                if (current_time.hour == task['hour'] and 
                    current_time.minute == task['minute'] and
                    (task['last_run'] is None or task['last_run'].date() < now.date())):
                    
                    try:
                        # Run the callback
                        if asyncio.iscoroutinefunction(task['callback']):
                            await task['callback']()
                        else:
                            task['callback']()
                        
                        task['last_run'] = now
                        print(f"[OK] Scheduled task executed at {now}")
                    except Exception as e:
                        print(f"[ERROR] Scheduler error: {str(e)}")
            
            # Sleep for 60 seconds before next check
            await asyncio.sleep(60)
    
    def start(self):
        """Start scheduler in background thread"""
        def run_loop():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(self.run())
        
        thread = threading.Thread(target=run_loop, daemon=True)
        thread.start()
        print("[Scheduler] Started")
    
    def stop(self):
        """Stop the scheduler"""
        self.running = False

# Singleton instance
scheduler = SchedulerService()
