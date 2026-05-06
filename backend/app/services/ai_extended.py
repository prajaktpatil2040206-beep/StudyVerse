"""
Extended ollama_service.py — adds goal plan, detailed insights, unified timetable, mixed questions.
"""
import json
from app.services.ollama_service import chat_with_ai


def generate_goal_plan(goal: str) -> dict:
    prompt = f"""A student set this goal: "{goal}"
Generate a structured implementation plan as JSON with these exact keys. Make sure all text fields are proper paragraphs, not JSON objects:

{{
  "overview": "Write 2-3 complete sentences explaining the goal and approach. Use proper grammar and punctuation.",
  "timeline": "e.g. 8 weeks",
  "phases": [
    {{
      "phase": 1, 
      "name": "Phase Name", 
      "duration": "Week 1-2", 
      "tasks": ["Complete task 1", "Complete task 2", "Complete task 3"]
    }}
  ],
  "milestones": [
    {{
      "week": 2, 
      "milestone": "Write a complete sentence describing what should be achieved"
    }}
  ],
  "resources": [
    {{
      "type": "book/video/course/tool", 
      "name": "Resource name", 
      "description": "Write a complete sentence describing this resource"
    }}
  ],
  "dailyRoutine": "Write 2-3 complete sentences describing what the student should do every day. Be specific and actionable.",
  "successMetrics": [
    "Write a complete sentence for metric 1",
    "Write a complete sentence for metric 2", 
    "Write a complete sentence for metric 3"
  ]
}}

IMPORTANT: 
- All text fields must be complete sentences with proper grammar
- Do NOT use nested JSON objects in text fields
- Do NOT use arrays of objects where strings are expected
- Return ONLY the JSON object, no markdown, no extra text"""
    
    result = chat_with_ai(prompt, system_prompt="You are an expert study coach. Return ONLY valid JSON objects with properly formatted text fields.")
    try:
        parsed = json.loads(result)
        if isinstance(parsed, dict) and "phases" in parsed:
            return parsed
    except Exception:
        pass
    # Try extracting JSON
    start = result.find("{")
    end = result.rfind("}") + 1
    if start >= 0 and end > start:
        try:
            parsed = json.loads(result[start:end])
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass
    return {
        "overview": f"This is a comprehensive plan to achieve your goal: {goal}. The plan is structured into phases with clear milestones and daily routines. Follow this systematically for best results.",
        "timeline": "8 weeks",
        "phases": [
            {"phase": 1, "name": "Foundation Building", "duration": "Week 1-2", "tasks": ["Understand core fundamentals and basic concepts", "Set up all necessary resources and tools", "Create a detailed daily study schedule"]},
            {"phase": 2, "name": "Core Learning", "duration": "Week 3-5", "tasks": ["Deep dive into main topics with focused study sessions", "Complete practice exercises and assignments regularly", "Take comprehensive notes and create summaries"]},
            {"phase": 3, "name": "Practical Application", "duration": "Week 6-7", "tasks": ["Apply learned concepts to real-world problems", "Work on projects that demonstrate understanding", "Review and strengthen weak areas identified"]},
            {"phase": 4, "name": "Mastery & Assessment", "duration": "Week 8", "tasks": ["Conduct final comprehensive review of all topics", "Complete self-assessment tests to measure progress", "Plan next steps and advanced learning goals"]},
        ],
        "milestones": [
            {"week": 2, "milestone": "Complete foundation phase with solid understanding of basics"},
            {"week": 5, "milestone": "Master all core concepts with 80%+ accuracy in practice tests"},
            {"week": 8, "milestone": "Achieve goal with demonstrated competency and practical application"},
        ],
        "resources": [
            {"type": "book", "name": "Recommended Textbook", "description": "Core reading material covering all fundamental concepts systematically"},
            {"type": "video", "name": "Online Video Course", "description": "Comprehensive video lectures with visual explanations and examples"},
            {"type": "tool", "name": "Practice Platform", "description": "Interactive platform for hands-on exercises and skill development"},
        ],
        "dailyRoutine": "Dedicate 2-3 focused hours to this goal every day. Start each session with a 5-minute review of the previous day's learning. Then spend 90 minutes on new material using active learning techniques. End with 30 minutes of practice exercises to reinforce concepts.",
        "successMetrics": [
            "Complete all planned phases according to the timeline without major delays",
            "Achieve 80% or higher scores on all self-assessment tests and practice exercises", 
            "Successfully apply learned skills in at least one real-world project or practical scenario"
        ],
    }


def generate_detailed_insights(stats: dict) -> list:
    prompt = f"""Analyze this student's real productivity data and generate 4 detailed insights:
- XP: {stats.get('xp', 0)}, Level: {stats.get('level', 1)}, Streak: {stats.get('streak', 0)} days
- Tasks completed: {stats.get('tasksCompleted', 0)} / {stats.get('totalTasks', 0)} today
- Study hours this week: {stats.get('studyHours', 0):.1f}h
- Avg assessment score: {stats.get('avgScore', 0):.1f}%
- Pomodoro sessions today: {stats.get('pomodoroSessions', 0)}
- Wellness score: {stats.get('wellnessScore', 0)}/100
- Weak subjects: {stats.get('weakSubjects', 'None identified')}
- Goals in progress: {stats.get('goalsCount', 0)}

Return ONLY a JSON array of exactly 4 objects:
{{"title": "...", "paragraph": "3-4 sentences with specific numbers from the data above", "icon": "trend|target|zap|award|book|heart", "actionItem": "One specific action to take today"}}"""
    result = chat_with_ai(prompt, system_prompt="You are a detailed student productivity analyst. Return ONLY valid JSON arrays.")
    try:
        parsed = json.loads(result)
        if isinstance(parsed, list) and len(parsed) >= 2:
            return parsed[:4]
    except Exception:
        pass
    start = result.find("[")
    end = result.rfind("]") + 1
    if start >= 0 and end > start:
        try:
            parsed = json.loads(result[start:end])
            if isinstance(parsed, list):
                return parsed[:4]
        except Exception:
            pass
    return [
        {"title": "Study Consistency", "paragraph": f"You have maintained a {stats.get('streak', 0)}-day study streak, which places you among dedicated learners. Your current XP of {stats.get('xp', 0)} reflects consistent effort over time. Maintaining this streak will compound your learning benefits significantly. Keep pushing — even 30 minutes daily beats sporadic 3-hour sessions.", "icon": "trend", "actionItem": "Log at least one Pomodoro session today to maintain your streak."},
        {"title": "Task Completion Rate", "paragraph": f"You completed {stats.get('tasksCompleted', 0)} of {stats.get('totalTasks', 0)} planned tasks today. Task completion directly correlates with academic progress and builds self-discipline. Breaking tasks into smaller chunks using the Pomodoro technique can boost your completion rate. Aim for 85%+ completion rate for optimal productivity.", "icon": "target", "actionItem": f"Focus on completing {max(1, stats.get('totalTasks',0) - stats.get('tasksCompleted',0))} remaining task(s) before end of day."},
        {"title": "Assessment Performance", "paragraph": f"Your average assessment score is {stats.get('avgScore', 0):.1f}%. {'This is excellent — you are mastering your subjects.' if stats.get('avgScore', 0) >= 75 else 'There is room for improvement — focus on understanding concepts, not memorization.'} Regular practice tests are the most effective way to identify and fix knowledge gaps. Schedule one assessment per subject per week.", "icon": "zap", "actionItem": f"Practice {'weak subjects: ' + stats.get('weakSubjects', 'your weakest subject') if stats.get('weakSubjects') else 'one challenging topic'} today."},
        {"title": "Wellness & Focus", "paragraph": f"Your wellness score of {stats.get('wellnessScore', 0)}/100 impacts your study capacity. Research shows that sleep quality, physical activity, and stress levels directly influence memory retention and cognitive performance. Students who maintain wellness metrics above 70/100 consistently outperform those who don't. Prioritise 7-8 hours of sleep tonight.", "icon": "heart", "actionItem": "Complete today's wellness check-in to track your mental and physical state."},
    ]


def generate_unified_timetable(prompt_text: str, form_data: dict) -> list:
    wake = form_data.get("wakeUp", "07:00")
    sleep = form_data.get("sleepTime", "23:00")
    college_start = form_data.get("collegeStart", "")
    college_end = form_data.get("collegeEnd", "")
    tough = form_data.get("toughSubjects", form_data.get("toughSubject", "Math"))
    subjects = form_data.get("subjects", "5")
    events = form_data.get("events", "None")
    peak = form_data.get("peakStudy", "Morning")

    college_info = f"College: {college_start} to {college_end}." if college_start and college_end else "No college today."
    prompt = f"""Create a detailed daily timetable. Student description: "{prompt_text}"

Key constraints (USE THESE EXACT TIMES):
- Wake up: {wake}
- Sleep: {sleep}
- {college_info}
- Peak study preference: {peak}
- Tough subjects (schedule during peak): {tough}
- Total subjects: {subjects}
- Events/notes: {events}

Rules:
1. First slot starts at wake up time exactly
2. Last slot ends at sleep time exactly
3. Schedule tough subjects during peak hours
4. Include breakfast, lunch, dinner at appropriate times
5. Include 5-10 min breaks every 90 min of study
6. All times must be contiguous and realistic

Return ONLY a JSON array. Each item: {{"time": "HH:MM - HH:MM", "subject": "Activity name", "type": "study|break|routine|college|health"}}
No markdown, no extra text."""

    system = "You are a precise schedule planner. Return ONLY valid JSON arrays with realistic consecutive time slots."
    result = chat_with_ai(prompt, system_prompt=system)
    try:
        start = result.find("[")
        end = result.rfind("]") + 1
        if start >= 0 and end > start:
            parsed = json.loads(result[start:end])
            if isinstance(parsed, list) and len(parsed) >= 5:
                return parsed
    except Exception:
        pass
    return _default_timetable(wake, sleep, college_start, college_end, tough)


def _default_timetable(wake, sleep, col_start, col_end, tough):
    slots = [
        {"time": f"{wake} - {_add_minutes(wake, 60)}", "subject": "Morning Routine", "type": "routine"},
        {"time": f"{_add_minutes(wake, 60)} - {_add_minutes(wake, 150)}", "subject": tough or "Deep Study", "type": "study"},
        {"time": f"{_add_minutes(wake, 150)} - {_add_minutes(wake, 180)}", "subject": "Breakfast", "type": "routine"},
    ]
    if col_start and col_end:
        slots.append({"time": f"{col_start} - {col_end}", "subject": "College", "type": "college"})
    slots += [
        {"time": "15:00 - 16:30", "subject": "Study Block", "type": "study"},
        {"time": "16:30 - 17:00", "subject": "Break", "type": "break"},
        {"time": "17:00 - 18:30", "subject": "Revision", "type": "study"},
        {"time": "19:00 - 19:30", "subject": "Dinner", "type": "routine"},
        {"time": "19:30 - 21:00", "subject": "Evening Study", "type": "study"},
        {"time": f"21:30 - {sleep}", "subject": "Wind Down", "type": "routine"},
    ]
    return slots


def _add_minutes(time_str: str, minutes: int) -> str:
    try:
        h, m = map(int, time_str.split(":"))
        total = h * 60 + m + minutes
        return f"{(total // 60) % 24:02d}:{total % 60:02d}"
    except Exception:
        return time_str


def calculate_productivity_score(data: dict) -> dict:
    """Calculate weighted productivity score from real Firebase data."""
    tasks_done = data.get("tasksCompleted", 0)
    tasks_total = data.get("totalTasks", 1)
    task_completion = min(100, (tasks_done / max(tasks_total, 1)) * 100)

    pomodoro_sessions = data.get("pomodoroSessions", 0)
    total_study_mins = data.get("totalStudyMins", 0)
    focus_quality = min(100, (pomodoro_sessions * 25 / max(total_study_mins, 1)) * 100) if total_study_mins > 0 else min(100, pomodoro_sessions * 15)

    avg_score = data.get("avgScore", 0)
    questions_answered = data.get("questionsAnswered", 0)
    learning_outcomes = min(100, (avg_score * 0.7) + (min(questions_answered, 30) / 30 * 30))

    streak = data.get("streak", 0)
    login_today = data.get("loginToday", True)
    consistency = min(100, (min(streak, 30) / 30 * 70) + (30 if login_today else 0))

    sleep = data.get("sleepHours", 7)
    mood = data.get("mood", 3)
    stress = data.get("stress", 3)
    energy = data.get("energy", 3)
    wellness = min(100, (min(sleep, 9) / 9 * 40) + (mood / 5 * 20) + ((6 - stress) / 5 * 20) + (energy / 5 * 20))

    goals_total = data.get("goalsCount", 1)
    goals_on_track = data.get("goalsOnTrack", 0)
    goal_achievement = min(100, (goals_on_track / max(goals_total, 1)) * 100)

    total = (
        task_completion * 0.25 +
        focus_quality * 0.20 +
        learning_outcomes * 0.20 +
        consistency * 0.15 +
        wellness * 0.10 +
        goal_achievement * 0.10
    )

    return {
        "total": round(total, 1),
        "breakdown": {
            "taskCompletion": round(task_completion, 1),
            "focusQuality": round(focus_quality, 1),
            "learningOutcomes": round(learning_outcomes, 1),
            "consistency": round(consistency, 1),
            "wellness": round(wellness, 1),
            "goalAchievement": round(goal_achievement, 1),
        }
    }


def classify_tasks_for_matrix(tasks: list) -> dict:
    """Use AI to classify tasks into the Eisenhower Matrix quadrants."""
    if not tasks:
        return {"do_first": [], "schedule": [], "delegate": [], "eliminate": []}

    task_list = "\n".join([f"- {t}" for t in tasks[:20]])
    prompt = f"""Classify each task into one of 4 Eisenhower Matrix quadrants:
1. do_first: Important AND Urgent (deadlines, crises)
2. schedule: Important but NOT Urgent (planning, learning, goals)
3. delegate: Urgent but NOT Important (interruptions, some meetings)
4. eliminate: NOT Important AND NOT Urgent (time wasters)

Tasks:
{task_list}

Return ONLY a JSON object:
{{"do_first": ["task1",...], "schedule": ["task2",...], "delegate": ["task3",...], "eliminate": ["task4",...]}}"""

    result = chat_with_ai(prompt, system_prompt="You are a productivity coach. Classify tasks into Eisenhower Matrix. Return ONLY valid JSON.")
    try:
        start = result.find("{")
        end = result.rfind("}") + 1
        if start >= 0 and end > start:
            parsed = json.loads(result[start:end])
            if isinstance(parsed, dict):
                return {
                    "do_first": parsed.get("do_first", []),
                    "schedule": parsed.get("schedule", []),
                    "delegate": parsed.get("delegate", []),
                    "eliminate": parsed.get("eliminate", []),
                }
    except Exception:
        pass
    # Simple fallback split
    half = len(tasks) // 2
    return {
        "do_first": tasks[:max(1, half//2)],
        "schedule": tasks[max(1, half//2):half],
        "delegate": tasks[half:half + max(1, len(tasks)//4)],
        "eliminate": [],
    }
