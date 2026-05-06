from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware  # GZIP compression
from app.routers import auth, ai, notifications, quiz, productivity
from app.services.scheduler_service import scheduler
from app.services.notification_service import notification_service
from app.services.deadline_checker import deadline_checker
from app.middleware.security import SecurityHeadersMiddleware, RateLimitMiddleware  # Security middleware
from datetime import datetime

app = FastAPI(title="StudyVerse API", version="1.0.0")

# GZIP compression for responses
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

# Rate limiting middleware
app.add_middleware(RateLimitMiddleware)

# Allow all localhost Vite dev ports — wildcard ("*") cannot be used with
# allow_credentials=True per the CORS spec (browsers reject it).
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:5177",
    "http://localhost:5178",
    "http://localhost:5179",
    "http://localhost:5180",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(quiz.router, prefix="/api/quiz", tags=["Quiz"])
app.include_router(productivity.router, prefix="/api/productivity", tags=["Productivity"])

# Daily reset function (runs at 12:00 AM)
def daily_reset():
    """Reset daily tasks, quizzes, and challenges"""
    print(f"🔄 Daily reset triggered at {datetime.now()}")
    
    # This function will be called by the scheduler at midnight
    # It resets:
    # 1. Daily challenges in gamification
    # 2. Daily quiz availability
    # 3. Clears completed daily tasks (optional - keeping history)
    
    # Note: Firebase data is date-keyed, so new day automatically creates new entries
    # This function can be used for cleanup or sending daily reports
    
    print("✅ Daily reset completed")

# Schedule daily reset at 12:00 AM (midnight)
scheduler.schedule_daily(0, 0, daily_reset)

@app.on_event("startup")
async def startup_event():
    """Initialize scheduler and deadline checker on app startup"""
    scheduler.start()
    deadline_checker.start()
    print("✅ StudyVerse API started with scheduler and deadline checker")

@app.on_event("shutdown")
async def shutdown_event():
    """Stop scheduler and deadline checker on app shutdown"""
    scheduler.stop()
    deadline_checker.stop()
    print("🛑 StudyVerse API stopped")

@app.get("/")
def root():
    return {"message": "StudyVerse API is running!", "version": "1.0.0"}

@app.get("/api/health")
def health():
    return {"status": "ok"}
