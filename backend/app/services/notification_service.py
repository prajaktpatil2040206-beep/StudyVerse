"""
Notification Service for StudyVerse
Handles email and SMS notifications
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from twilio.rest import Client
from datetime import datetime
import os

# Twilio Configuration
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID', '')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN', '')
TWILIO_PHONE = os.getenv('TWILIO_PHONE', '')

# Email Configuration (using Gmail SMTP)
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USER = os.getenv('EMAIL_USER', 'your-email@gmail.com')
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD', 'your-app-password')

class NotificationService:
    def __init__(self):
        self.twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    
    def send_sms(self, to_number: str, message: str) -> dict:
        """Send SMS via Twilio"""
        try:
            # Ensure number has country code
            if not to_number.startswith('+'):
                to_number = f'+91{to_number}'  # Default to India
            
            message_obj = self.twilio_client.messages.create(
                from_=TWILIO_PHONE,
                body=message,
                to=to_number
            )
            
            return {
                'success': True,
                'sid': message_obj.sid,
                'status': message_obj.status
            }
        except Exception as e:
            print(f"SMS Error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def send_email(self, to_email: str, subject: str, body: str, attachment_path: str = None) -> dict:
        """Send email with optional PDF attachment"""
        try:
            msg = MIMEMultipart()
            msg['From'] = EMAIL_USER
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # Add body
            msg.attach(MIMEText(body, 'html'))
            
            # Add attachment if provided
            if attachment_path and os.path.exists(attachment_path):
                with open(attachment_path, 'rb') as f:
                    part = MIMEBase('application', 'octet-stream')
                    part.set_payload(f.read())
                    encoders.encode_base64(part)
                    part.add_header(
                        'Content-Disposition',
                        f'attachment; filename={os.path.basename(attachment_path)}'
                    )
                    msg.attach(part)
            
            # Send email
            with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
                server.starttls()
                server.login(EMAIL_USER, EMAIL_PASSWORD)
                server.send_message(msg)
            
            return {'success': True}
        except Exception as e:
            print(f"Email Error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def send_task_reminder(self, phone: str, task_title: str, due_time: str):
        """Send task reminder SMS"""
        message = f"📝 StudyVerse Reminder: '{task_title}' is due at {due_time}. Complete it now!"
        return self.send_sms(phone, message)
    
    def send_task_completion(self, phone: str, task_title: str):
        """Send task completion SMS"""
        message = f"✅ Great job! You completed '{task_title}'. Keep up the momentum!"
        return self.send_sms(phone, message)
    
    def send_score_update(self, phone: str, score: int, subject: str):
        """Send score update SMS"""
        message = f"🎯 Your {subject} score: {score}%. {'Excellent!' if score >= 80 else 'Keep improving!'}"
        return self.send_sms(phone, message)
    
    def send_timetable_ready(self, phone: str):
        """Send timetable ready SMS"""
        message = f"📅 Your personalized timetable is ready! Check StudyVerse app to view it."
        return self.send_sms(phone, message)
    
    def send_daily_report_email(self, email: str, user_name: str, pdf_path: str):
        """Send daily dashboard PDF report"""
        subject = f"📊 Your Daily StudyVerse Report - {datetime.now().strftime('%B %d, %Y')}"
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Hello {user_name}! 👋</h2>
            <p>Here's your daily productivity report from StudyVerse.</p>
            <p>Your personalized dashboard PDF is attached. Review your progress and keep growing!</p>
            <br>
            <p><strong>Key Highlights:</strong></p>
            <ul>
                <li>📚 Study hours tracked</li>
                <li>✅ Tasks completed</li>
                <li>🎯 Goals progress</li>
                <li>📊 Performance analytics</li>
            </ul>
            <br>
            <p>Keep up the great work!</p>
            <p><em>- StudyVerse Team</em></p>
        </body>
        </html>
        """
        return self.send_email(email, subject, body, pdf_path)

# Singleton instance
notification_service = NotificationService()
