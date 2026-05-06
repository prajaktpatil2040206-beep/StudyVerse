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

def get_goal_suggestion(goal: str):
    prompt = f'A student set this goal: "{goal}". Give a brief 2-3 sentence actionable suggestion.'
    return chat_with_ai(prompt, system_prompt="You are a motivational study coach.")

def generate_questions(topic: str, content: str = ""):
    prompt = f"""Generate 5 quiz questions about: {topic}
{f'Content: {content[:1000]}' if content else ''}
Return ONLY a JSON array with keys: question, points (always 10)."""
    result = chat_with_ai(prompt, system_prompt="Return ONLY valid JSON arrays.")
    try:
        parsed = json.loads(result)
        if isinstance(parsed, list):
            return parsed
    except:
        pass
    return [
        {"question": f"Explain the core concept of {topic}", "points": 10},
        {"question": f"What are the key components of {topic}?", "points": 10},
        {"question": f"Give a practical example of {topic}", "points": 10},
        {"question": f"What are common challenges in {topic}?", "points": 10},
        {"question": f"How does {topic} connect to real-world use?", "points": 10},
    ]

def evaluate_answer(question: str, answer: str):
    prompt = f'Question: {question}\nAnswer: {answer}\nScore 1-10 with feedback. Return JSON: {{"score": N, "feedback": "..."}}'
    result = chat_with_ai(prompt, system_prompt="Grade answers fairly. Return ONLY valid JSON.")
    try:
        return json.loads(result)
    except:
        score = min(10, max(1, len(answer.split()) // 5))
        return {"score": score, "feedback": "Answer evaluated. Add more detail for higher scores."}

def teacher_chat(message: str, history: list = None):
    system = """You are a friendly AI teacher for students. Help with academics, code debugging, study tips, and emotional support.
If student mentions self-harm/suicide, provide helpline numbers: iCall 9152987821, Vandrevala 1860-2662-345, AASRA 9820466726.
Be warm and encouraging."""
    return chat_with_ai(message, history=history, system_prompt=system)
