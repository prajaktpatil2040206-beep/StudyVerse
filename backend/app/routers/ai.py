from fastapi import APIRouter, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List
from app.services.ollama_service import (
    generate_timetable, generate_timetable_from_prompt,
    get_goal_suggestion, generate_questions, evaluate_answer, evaluate_batch,
    teacher_chat, generate_daily_test, generate_dashboard_suggestions
)

router = APIRouter()

class TimetableRequest(BaseModel):
    wakeUp: Optional[str] = "7 AM"
    peakStudy: Optional[str] = "Morning"
    freeTime: Optional[str] = "2-3 hrs"
    collegeTiming: Optional[str] = "9-1 PM"
    toughSubject: Optional[str] = "Math"
    sleepTime: Optional[str] = "11 PM"
    events: Optional[str] = "None"
    subjects: Optional[str] = "5"
    userId: Optional[str] = ""
    feedback: Optional[str] = ""

class TimetablePromptRequest(BaseModel):
    prompt: str
    userId: Optional[str] = ""

class GoalRequest(BaseModel):
    goal: str
    userId: Optional[str] = ""

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []
    userId: Optional[str] = ""

class EvalRequest(BaseModel):
    question: str
    answer: str
    userId: Optional[str] = ""

class BatchEvalRequest(BaseModel):
    questionsAndAnswers: List[dict]
    userId: Optional[str] = ""

class QuestionRequest(BaseModel):
    topic: str
    userId: Optional[str] = ""

class DailyTestRequest(BaseModel):
    completedTasks: List[str]
    userId: Optional[str] = ""

class DashboardStatsRequest(BaseModel):
    xp: Optional[int] = 0
    level: Optional[int] = 1
    streak: Optional[int] = 0
    tasksCompleted: Optional[int] = 0
    totalTasks: Optional[int] = 0
    studyHours: Optional[float] = 0
    avgScore: Optional[float] = 0
    weakSubjects: Optional[str] = "None identified"

@router.post("/generate-timetable")
async def gen_timetable(req: TimetableRequest):
    prefs = req.dict()
    daily = generate_timetable(prefs)
    return {"timetable": {"daily": daily}}

@router.post("/rebuild-timetable")
async def rebuild_timetable(req: TimetableRequest):
    prefs = req.dict()
    daily = generate_timetable(prefs)
    return {"timetable": {"daily": daily}}

@router.post("/generate-timetable-prompt")
async def gen_timetable_prompt(req: TimetablePromptRequest):
    daily = generate_timetable_from_prompt(req.prompt)
    return {"timetable": {"daily": daily}}

@router.post("/set-goal")
async def set_goal(req: GoalRequest):
    suggestion = get_goal_suggestion(req.goal)
    return {"suggestion": suggestion}

@router.post("/chat")
async def chat(req: ChatRequest):
    history = [{"role": m.role, "content": m.content} for m in (req.history or [])]
    response = teacher_chat(req.message, history)
    return {"response": response}

@router.post("/generate-questions")
async def gen_questions(req: QuestionRequest):
    questions = generate_questions(req.topic)
    return {"questions": questions}

@router.post("/evaluate-answer")
async def eval_answer(req: EvalRequest):
    result = evaluate_answer(req.question, req.answer)
    return result

@router.post("/evaluate-batch")
async def eval_batch(req: BatchEvalRequest):
    results = evaluate_batch(req.questionsAndAnswers)
    return {"results": results}

@router.post("/daily-test")
async def daily_test(req: DailyTestRequest):
    questions = generate_daily_test(req.completedTasks)
    return {"questions": questions}

@router.post("/dashboard-suggestions")
async def dash_suggestions(req: DashboardStatsRequest):
    suggestions = generate_dashboard_suggestions(req.dict())
    return {"suggestions": suggestions}
