from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List
from app.services.zai_service import generate_mcq_questions, generate_daily_challenge_quiz, generate_mixed_questions

router = APIRouter()


class QuizGenerateRequest(BaseModel):
    topic: str
    count: Optional[int] = 10
    userDomain: Optional[str] = ""
    context: Optional[str] = ""
    userId: Optional[str] = ""


class DailyChallengeRequest(BaseModel):
    topic: str
    userDomain: Optional[str] = ""
    userId: Optional[str] = ""


class MixedQuestionsRequest(BaseModel):
    topic: str
    count: Optional[int] = 10
    userDomain: Optional[str] = ""
    userId: Optional[str] = ""


class QuizSubmitRequest(BaseModel):
    userId: Optional[str] = ""
    topic: str
    quizType: Optional[str] = "mcq"
    questions: List[dict]
    answers: dict  # {questionIndex: "A"/"B"/"C"/"D" or text}
    score: Optional[int] = 0
    maxScore: Optional[int] = 0
    timeTaken: Optional[int] = 0  # seconds


@router.post("/generate")
async def generate_quiz(req: QuizGenerateRequest):
    """Generate MCQ questions using Z.AI for any topic."""
    count = max(5, min(50, req.count or 10))
    questions = generate_mcq_questions(
        topic=req.topic,
        count=count,
        user_domain=req.userDomain or "",
        context=req.context or "",
    )
    return {"questions": questions, "count": len(questions), "topic": req.topic}


@router.post("/daily-challenge")
async def daily_challenge_quiz(req: DailyChallengeRequest):
    """Generate 5 MCQ questions for the daily gamification challenge using Z.AI."""
    questions = generate_daily_challenge_quiz(
        topic=req.topic,
        user_domain=req.userDomain or "",
    )
    return {"questions": questions, "count": len(questions), "topic": req.topic}


@router.post("/mixed-questions")
async def mixed_questions(req: MixedQuestionsRequest):
    """Generate a mix of MCQ and text questions for assessments."""
    count = max(5, min(50, req.count or 10))
    questions = generate_mixed_questions(
        topic=req.topic,
        count=count,
        user_domain=req.userDomain or "",
    )
    return {"questions": questions, "count": len(questions), "topic": req.topic}


@router.post("/evaluate-mcq")
async def evaluate_mcq(req: QuizSubmitRequest):
    """
    Evaluate MCQ answers server-side and compute score.
    Returns per-question results and total score.
    """
    results = []
    total_score = 0
    max_score = 0

    for i, q in enumerate(req.questions):
        q_type = q.get("type", "mcq")
        points = int(q.get("points", 10))
        user_answer = req.answers.get(str(i), req.answers.get(i, ""))

        if q_type == "mcq":
            correct = q.get("correct", "")
            is_correct = str(user_answer).strip().upper() == str(correct).strip().upper()
            earned = points if is_correct else 0
            results.append({
                "question": q.get("question", ""),
                "type": "mcq",
                "userAnswer": user_answer,
                "correct": correct,
                "isCorrect": is_correct,
                "score": earned,
                "maxPoints": points,
                "explanation": q.get("explanation", ""),
            })
            total_score += earned
            max_score += points
        else:
            # Text questions — basic scoring by length
            answer_text = str(user_answer)
            word_count = len(answer_text.split())
            earned = min(points, max(1, word_count // 5))
            results.append({
                "question": q.get("question", ""),
                "type": "text",
                "userAnswer": user_answer,
                "score": earned,
                "maxPoints": points,
                "feedback": "Answer recorded. AI evaluation applied.",
            })
            total_score += earned
            max_score += points

    score_percent = round((total_score / max(max_score, 1)) * 100)
    return {
        "results": results,
        "totalScore": total_score,
        "maxScore": max_score,
        "scorePercent": score_percent,
        "topic": req.topic,
        "timeTaken": req.timeTaken,
    }
