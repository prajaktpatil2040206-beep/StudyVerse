"""
StudyVerse AI Service
Uses the local Qwen2.5-0.5B-Instruct model via app.ai_model.ModelManager
Falls back gracefully if model is not available.
"""
import json

_model_manager = None
_model_available = False

def _get_model():
    global _model_manager, _model_available
    if _model_manager is not None:
        return _model_manager
    try:
        from app.ai_model.model_manager import ModelManager
        _model_manager = ModelManager.get_instance()
        _model_available = True
        return _model_manager
    except Exception as e:
        print(f"[StudyVerse AI] Model not available: {e}")
        _model_available = False
        return None

def chat_with_ai(message: str, history: list = None, system_prompt: str = None):
    mgr = _get_model()
    if mgr is None:
        return "AI model is loading or not available. Please try again later."
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    if history:
        for h in history[-6:]:
            messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
    messages.append({"role": "user", "content": message})
    try:
        return mgr.generate(messages, max_new_tokens=768, temperature=0.7)
    except Exception as e:
        return f"AI error: {str(e)}"

def generate_timetable(preferences: dict):
    prompt = f"""Generate a daily study timetable as JSON array based on these preferences:
- Wake up: {preferences.get('wakeUp', '7 AM')}
- Peak study time: {preferences.get('peakStudy', 'Morning')}
- Free time: {preferences.get('freeTime', '2-3 hrs')}
- College timing: {preferences.get('collegeTiming', '9-1 PM')}
- Tough subject: {preferences.get('toughSubject', 'Math')}
- Sleep time: {preferences.get('sleepTime', '11 PM')}
- Events: {preferences.get('events', 'None')}
- Subjects count: {preferences.get('subjects', '5')}
Return ONLY a JSON array with keys: time, subject, type (study/break/routine/college)."""

    system = "You are a study planner AI. Return ONLY valid JSON arrays."
    result = chat_with_ai(prompt, system_prompt=system)
    try:
        parsed = json.loads(result)
        if isinstance(parsed, list):
            return parsed
    except:
        pass
    ts = preferences.get("toughSubject", "Study")
    return [
        {"time": "6:00-7:00", "subject": "Morning Routine", "type": "routine"},
        {"time": "7:00-8:30", "subject": ts, "type": "study"},
        {"time": "8:30-9:00", "subject": "Breakfast", "type": "break"},
        {"time": "9:00-10:30", "subject": "Study Block 2", "type": "study"},
        {"time": "10:30-11:00", "subject": "Break", "type": "break"},
        {"time": "11:00-12:30", "subject": "Study Block 3", "type": "study"},
        {"time": "12:30-1:30", "subject": "Lunch", "type": "break"},
        {"time": "1:30-3:30", "subject": "College", "type": "college"},
        {"time": "3:30-5:00", "subject": "Practice Problems", "type": "study"},
        {"time": "5:00-5:30", "subject": "Break", "type": "break"},
        {"time": "5:30-7:00", "subject": ts, "type": "study"},
        {"time": "7:00-8:00", "subject": "Free Time", "type": "break"},
        {"time": "8:00-9:30", "subject": "Evening Study", "type": "study"},
        {"time": "9:30-10:00", "subject": "Wind Down", "type": "routine"},
    ]

def generate_timetable_from_prompt(prompt_text: str):
    """Generate timetable from free-text user description."""
    prompt = f"""A student described their ideal day as follows:
"{prompt_text}"

Based on this, generate a full daily timetable as a JSON array.
Each entry must have keys: time (e.g. "6:00-7:00"), subject (activity name), type (one of: study, break, routine, college).
Return ONLY a valid JSON array, no extra text."""
    system = "You are a study planner AI. Return ONLY valid JSON arrays."
    result = chat_with_ai(prompt, system_prompt=system)
    try:
        parsed = json.loads(result)
        if isinstance(parsed, list):
            return parsed
    except:
        pass
    return [
        {"time": "6:00-7:00", "subject": "Morning Routine", "type": "routine"},
        {"time": "7:00-9:00", "subject": "Study Block 1", "type": "study"},
        {"time": "9:00-9:30", "subject": "Breakfast", "type": "break"},
        {"time": "9:30-11:30", "subject": "Study Block 2", "type": "study"},
        {"time": "11:30-12:00", "subject": "Break", "type": "break"},
        {"time": "12:00-1:30", "subject": "Study Block 3", "type": "study"},
        {"time": "1:30-2:30", "subject": "Lunch", "type": "break"},
        {"time": "2:30-4:30", "subject": "College / Class", "type": "college"},
        {"time": "4:30-6:00", "subject": "Practice", "type": "study"},
        {"time": "6:00-7:00", "subject": "Free Time", "type": "break"},
        {"time": "7:00-8:30", "subject": "Revision", "type": "study"},
        {"time": "8:30-9:00", "subject": "Dinner", "type": "routine"},
        {"time": "9:00-10:00", "subject": "Light Study", "type": "study"},
        {"time": "10:00-10:30", "subject": "Wind Down", "type": "routine"},
    ]

def get_goal_suggestion(goal: str):
    prompt = f'A student set this goal: "{goal}". Give a brief 2-3 sentence actionable suggestion.'
    return chat_with_ai(prompt, system_prompt="You are a motivational study coach.")

def generate_questions(topic: str, content: str = ""):
    """Generate 10 AI-powered quiz questions about a topic."""
    prompt = f"""Generate exactly 10 quiz questions about: {topic}
{f'Additional context: {content[:1000]}' if content else ''}
Each question should test understanding at different levels (basic, intermediate, advanced).
Return ONLY a JSON array with exactly 10 items. Each item has keys: question (string), points (always 10).
Example: [{{"question": "What is X?", "points": 10}}]"""
    result = chat_with_ai(prompt, system_prompt="You are an exam question generator. Return ONLY valid JSON arrays with exactly 10 questions.")
    try:
        parsed = json.loads(result)
        if isinstance(parsed, list) and len(parsed) >= 5:
            return parsed[:10]
    except:
        pass
    return [
        {"question": f"Define {topic} and explain its significance.", "points": 10},
        {"question": f"What are the fundamental principles of {topic}?", "points": 10},
        {"question": f"List and explain the key components of {topic}.", "points": 10},
        {"question": f"Give a real-world example of {topic} in practice.", "points": 10},
        {"question": f"What are the main advantages of {topic}?", "points": 10},
        {"question": f"What challenges are commonly faced in {topic}?", "points": 10},
        {"question": f"Compare two approaches within {topic}.", "points": 10},
        {"question": f"How does {topic} relate to other subjects?", "points": 10},
        {"question": f"Explain a common misconception about {topic}.", "points": 10},
        {"question": f"Predict the future impact of {topic} on its field.", "points": 10},
    ]

def evaluate_answer(question: str, answer: str):
    prompt = f'Question: {question}\nStudent Answer: {answer}\nEvaluate the answer on a scale of 1-10. Provide constructive feedback. Return JSON: {{"score": N, "feedback": "..."}}'
    result = chat_with_ai(prompt, system_prompt="You are a fair exam evaluator. Grade answers honestly. Return ONLY valid JSON with score and feedback.")
    try:
        return json.loads(result)
    except:
        score = min(10, max(1, len(answer.split()) // 5))
        return {"score": score, "feedback": "Answer evaluated. Add more detail for higher scores."}

def evaluate_batch(questions_and_answers: list):
    """Evaluate all Q&A pairs at once. Returns list of {score, feedback}."""
    results = []
    for qa in questions_and_answers:
        result = evaluate_answer(qa.get("question", ""), qa.get("answer", ""))
        results.append(result)
    return results

def generate_daily_test(completed_tasks: list):
    """Generate a daily test based on completed todo tasks."""
    tasks_text = ", ".join(completed_tasks[:20])
    prompt = f"""A student completed these tasks today: {tasks_text}

Generate exactly 10 quiz questions to test what they learned from these tasks.
Questions should verify understanding and retention of the topics studied.
Return ONLY a JSON array with 10 items. Each item: {{"question": "...", "points": 10}}"""
    result = chat_with_ai(prompt, system_prompt="Generate quiz questions based on completed study tasks. Return ONLY valid JSON arrays.")
    try:
        parsed = json.loads(result)
        if isinstance(parsed, list) and len(parsed) >= 3:
            return parsed[:10]
    except:
        pass
    fallback = []
    for i, task in enumerate(completed_tasks[:10]):
        fallback.append({"question": f"Explain what you learned about: {task}", "points": 10})
    while len(fallback) < 10:
        fallback.append({"question": f"Summarize key concepts from today's study (topic {len(fallback)+1})", "points": 10})
    return fallback[:10]

def generate_dashboard_suggestions(stats: dict):
    """Generate AI-powered dashboard insights based on user statistics."""
    prompt = f"""Analyze this student's productivity data and give 4 brief actionable suggestions:
- XP: {stats.get('xp', 0)}, Level: {stats.get('level', 1)}, Streak: {stats.get('streak', 0)} days
- Tasks completed today: {stats.get('tasksCompleted', 0)} / {stats.get('totalTasks', 0)}
- Study hours this week: {stats.get('studyHours', 0)}
- Average assessment score: {stats.get('avgScore', 0)}%
- Weak subjects: {stats.get('weakSubjects', 'None identified')}

Return ONLY a JSON array of 4 items: {{"title": "...", "suggestion": "...", "icon": "trend|target|zap|award"}}"""
    result = chat_with_ai(prompt, system_prompt="You are a student productivity advisor. Return ONLY valid JSON arrays.")
    try:
        parsed = json.loads(result)
        if isinstance(parsed, list):
            return parsed[:4]
    except:
        pass
    return [
        {"title": "Study Consistency", "suggestion": "Maintain your study streak for better retention.", "icon": "trend"},
        {"title": "Weak Areas", "suggestion": f"Focus extra time on {stats.get('weakSubjects', 'challenging subjects')}.", "icon": "target"},
        {"title": "Peak Performance", "suggestion": "Schedule difficult subjects during your peak focus hours.", "icon": "zap"},
        {"title": "Daily Goals", "suggestion": "Complete daily challenges to earn XP and level up faster.", "icon": "award"},
    ]

def teacher_chat(message: str, history: list = None):
    system = """You are a friendly AI teacher for students. Help with academics, code debugging, study tips, and emotional support.
If student mentions self-harm/suicide, provide helpline numbers: iCall 9152987821, Vandrevala 1860-2662-345, AASRA 9820466726.
Be warm and encouraging."""
    return chat_with_ai(message, history=history, system_prompt=system)
