from fastapi import APIRouter, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List
from app.services.ollama_service import generate_timetable, get_goal_suggestion, generate_questions, evaluate_answer, teacher_chat

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
async def gen_questions(topic: str = Form(""), user_id: str = Form(""), file: Optional[UploadFile] = File(None)):
    content = ""
    if file:
        content = (await file.read()).decode("utf-8", errors="ignore")
    questions = generate_questions(topic or "General Knowledge", content)
    return {"questions": questions}

@router.post("/evaluate-answer")
async def eval_answer(req: EvalRequest):
    result = evaluate_answer(req.question, req.answer)
    return result
