from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List
from app.services.ai_extended import calculate_productivity_score, classify_tasks_for_matrix

router = APIRouter()


class SessionLogRequest(BaseModel):
    userId: Optional[str] = ""
    subject: Optional[str] = "General"
    sessionType: Optional[str] = "pomodoro"
    durationMins: Optional[int] = 25
    date: Optional[str] = ""
    startTime: Optional[str] = ""
    endTime: Optional[str] = ""
    completed: Optional[bool] = True


class ProductivityScoreRequest(BaseModel):
    userId: Optional[str] = ""
    tasksCompleted: Optional[int] = 0
    totalTasks: Optional[int] = 0
    pomodoroSessions: Optional[int] = 0
    totalStudyMins: Optional[int] = 0
    avgScore: Optional[float] = 0
    questionsAnswered: Optional[int] = 0
    streak: Optional[int] = 0
    loginToday: Optional[bool] = True
    sleepHours: Optional[float] = 7
    mood: Optional[int] = 3
    stress: Optional[int] = 3
    energy: Optional[int] = 3
    goalsCount: Optional[int] = 0
    goalsOnTrack: Optional[int] = 0
    weakSubjects: Optional[str] = ""


class TaskMatrixRequest(BaseModel):
    userId: Optional[str] = ""
    tasks: List[str] = []


class WellnessCheckinRequest(BaseModel):
    userId: Optional[str] = ""
    date: Optional[str] = ""
    sleepHours: Optional[float] = 7
    mood: Optional[int] = 3
    stress: Optional[int] = 3
    energy: Optional[int] = 3
    exercise: Optional[bool] = False
    notes: Optional[str] = ""


@router.post("/log-session")
async def log_session(req: SessionLogRequest):
    """Log a study/Pomodoro session. Firebase write is done client-side; this validates and returns confirmation."""
    return {
        "status": "logged",
        "subject": req.subject,
        "durationMins": req.durationMins,
        "sessionType": req.sessionType,
        "xpEarned": min(30, req.durationMins // 5) if req.completed else 0,
    }


@router.post("/calculate-score")
async def calc_score(req: ProductivityScoreRequest):
    """Calculate AI-weighted productivity score from real user data."""
    data = req.dict()
    result = calculate_productivity_score(data)
    return result


@router.post("/task-matrix")
async def task_matrix(req: TaskMatrixRequest):
    """Classify user tasks into Eisenhower Matrix quadrants using AI."""
    if not req.tasks:
        return {"do_first": [], "schedule": [], "delegate": [], "eliminate": []}
    matrix = classify_tasks_for_matrix(req.tasks)
    return matrix


@router.post("/wellness-checkin")
async def wellness_checkin(req: WellnessCheckinRequest):
    """Validate wellness data; Firebase write is done client-side."""
    sleep = req.sleepHours or 7
    mood = req.mood or 3
    stress = req.stress or 3
    energy = req.energy or 3
    exercise_bonus = 10 if req.exercise else 0
    wellness_score = round(
        (min(sleep, 9) / 9 * 40) +
        (mood / 5 * 20) +
        ((6 - stress) / 5 * 20) +
        (energy / 5 * 20) +
        exercise_bonus
    )
    return {
        "status": "ok",
        "wellnessScore": min(100, wellness_score),
        "message": (
            "Great wellness! You're set for a productive day." if wellness_score >= 70
            else "Focus on sleep and stress management for better productivity." if wellness_score < 50
            else "Decent wellness. A short walk could boost your energy."
        ),
    }
