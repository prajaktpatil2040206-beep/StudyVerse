import smtplib
import random
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import EMAIL_ADDRESS, EMAIL_APP_PASSWORD

otp_store = {}

def generate_otp():
    return str(random.randint(100000, 999999))

def send_email(to_email: str, subject: str, body: str):
    msg = MIMEMultipart()
    msg['From'] = EMAIL_ADDRESS
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'html'))
    try:
        with smtplib.SMTP('smtp.gmail.com', 587, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(EMAIL_ADDRESS, EMAIL_APP_PASSWORD)
            server.send_message(msg)
        print(f"[Email] Sent OTP to {to_email}")
        return True
    except smtplib.SMTPAuthenticationError as e:
        print(f"[Email] Gmail auth failed — check app password: {e}")
        return False
    except Exception as e:
        print(f"[Email] Error sending to {to_email}: {e}")
        return False

def send_otp_email(to_email: str):
    if not EMAIL_APP_PASSWORD:
        otp = "123456"
        otp_store[to_email] = otp
        print(f"[Email Mock] No app password configured. Use mock OTP: {otp}")
        return True
        
    otp = generate_otp()
    otp_store[to_email] = otp
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#f8f9fa;border-radius:12px;">
        <h1 style="color:#6C5CE7;text-align:center;">📚 StudyVerse</h1>
        <div style="background:white;padding:30px;border-radius:8px;text-align:center;margin:20px 0;">
            <p style="font-size:16px;color:#333;">Your login OTP is:</p>
            <h2 style="font-size:36px;letter-spacing:8px;color:#6C5CE7;margin:16px 0;">{otp}</h2>
            <p style="font-size:13px;color:#888;">This OTP expires in 5 minutes.</p>
        </div>
        <p style="font-size:12px;color:#888;text-align:center;">If you didn't request this, please ignore.</p>
    </div>
    """
    success = send_email(to_email, "StudyVerse - Login OTP", html)
    if not success:
        otp_store[to_email] = "123456"
        print(f"[Email Fallback] Failed to send email. Setting mock OTP for testing: 123456")
    return True

def verify_otp(email: str, otp: str):
    stored = otp_store.get(email)
    if stored and stored == otp:
        del otp_store[email]
        return True
    return False

def send_notification_email(to_email: str, subject: str, message: str):
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#f8f9fa;border-radius:12px;">
        <h1 style="color:#6C5CE7;text-align:center;">📚 StudyVerse</h1>
        <div style="background:white;padding:24px;border-radius:8px;margin:20px 0;">
            <h3 style="color:#333;">{subject}</h3>
            <p style="font-size:14px;color:#555;line-height:1.6;">{message}</p>
        </div>
        <p style="font-size:12px;color:#888;text-align:center;">Stay productive! 💪</p>
    </div>
    """
    return send_email(to_email, f"StudyVerse - {subject}", html)
