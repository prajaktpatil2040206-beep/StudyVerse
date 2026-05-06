"""
Z.AI Service — Used ONLY for MCQ quiz generation.
All other AI tasks use the local Qwen model (ollama_service.py).
"""
import json
import urllib.request
import urllib.error
from app.config import ZAI_API_KEY, ZAI_BASE_URL, ZAI_MODEL


def _zai_request(messages: list, max_tokens: int = 2000) -> str:
    """Make a request to Z.AI API (OpenAI-compatible)."""
    payload = json.dumps({
        "model": ZAI_MODEL,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": 0.7,
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{ZAI_BASE_URL}/chat/completions",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {ZAI_API_KEY}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["choices"][0]["message"]["content"]
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        print(f"[Z.AI] HTTP {e.code}: {body}")
        return ""
    except Exception as e:
        print(f"[Z.AI] Error: {e}")
        return ""


def _parse_json(text: str):
    """Extract and parse JSON from AI response."""
    text = text.strip()
    # Try direct parse
    try:
        return json.loads(text)
    except Exception:
        pass
    # Try to find JSON array in text
    start = text.find("[")
    end = text.rfind("]") + 1
    if start >= 0 and end > start:
        try:
            return json.loads(text[start:end])
        except Exception:
            pass
    # Try JSON object
    start = text.find("{")
    end = text.rfind("}") + 1
    if start >= 0 and end > start:
        try:
            return json.loads(text[start:end])
        except Exception:
            pass
    return None


def generate_mcq_questions(topic: str, count: int = 10, user_domain: str = "", context: str = "") -> list:
    """
    Generate MCQ questions using Z.AI.
    Returns list of: {question, type:'mcq', options:{A,B,C,D}, correct:'A', explanation, points}
    """
    domain_hint = f" The student's domain is: {user_domain}." if user_domain else ""
    context_hint = f" Recent study context: {context[:300]}." if context else ""

    prompt = f"""Generate exactly {count} multiple-choice questions (MCQ) about: {topic}.{domain_hint}{context_hint}

Each question MUST test genuine understanding at varying difficulty levels (easy, medium, hard).
Return ONLY a valid JSON array with exactly {count} items. Each item must have these exact keys:
- "question": the question text (string)
- "type": always "mcq"
- "options": object with keys "A", "B", "C", "D" — each a string answer option
- "correct": the correct option key, one of "A", "B", "C", "D"
- "explanation": brief explanation of why the answer is correct (1-2 sentences)
- "points": integer, 5 for easy, 8 for medium, 10 for hard

Example item:
{{"question": "What does OOP stand for?", "type": "mcq", "options": {{"A": "Object Oriented Programming", "B": "Open Object Protocol", "C": "Optimized Output Process", "D": "Object Output Pattern"}}, "correct": "A", "explanation": "OOP stands for Object Oriented Programming, a paradigm based on objects.", "points": 5}}

Return ONLY the JSON array, no markdown, no extra text."""

    messages = [
        {"role": "system", "content": "You are an expert quiz generator. Return ONLY valid JSON arrays of MCQ questions. No markdown code blocks, no extra text."},
        {"role": "user", "content": prompt},
    ]

    raw = _zai_request(messages, max_tokens=3000)
    parsed = _parse_json(raw)

    if isinstance(parsed, list) and len(parsed) >= max(3, count // 3):
        # Validate and clean each item
        valid = []
        for item in parsed[:count]:
            if isinstance(item, dict) and "question" in item and "options" in item:
                valid.append({
                    "question": str(item.get("question", "")),
                    "type": "mcq",
                    "options": {
                        "A": str(item.get("options", {}).get("A", "Option A")),
                        "B": str(item.get("options", {}).get("B", "Option B")),
                        "C": str(item.get("options", {}).get("C", "Option C")),
                        "D": str(item.get("options", {}).get("D", "Option D")),
                    },
                    "correct": str(item.get("correct", "A")),
                    "explanation": str(item.get("explanation", "")),
                    "points": int(item.get("points", 10)),
                })
        if len(valid) >= max(3, count // 3):
            return valid

    # Fallback if Z.AI fails
    print(f"[Z.AI] MCQ generation failed for topic '{topic}', using fallback")
    return _fallback_mcq(topic, count)


def generate_daily_challenge_quiz(topic: str, user_domain: str = "") -> list:
    """Generate 5 MCQ questions for the daily gamification challenge."""
    return generate_mcq_questions(topic, count=5, user_domain=user_domain)


def generate_mixed_questions(topic: str, count: int = 10, user_domain: str = "") -> list:
    """
    Generate a mix of MCQ (60%) and text-based (40%) questions.
    MCQ items: {question, type:'mcq', options, correct, explanation, points}
    Text items: {question, type:'text', points}
    """
    mcq_count = round(count * 0.6)
    text_count = count - mcq_count

    # Generate MCQs via Z.AI
    mcqs = generate_mcq_questions(topic, mcq_count, user_domain)

    # Generate text questions via prompt (reuse Z.AI for consistency)
    prompt = f"""Generate exactly {text_count} open-ended (text-based) exam questions about: {topic}.
Questions should require thoughtful written answers, not just yes/no.
Return ONLY a valid JSON array with exactly {text_count} items. Each item:
{{"question": "...", "type": "text", "points": 10}}
Return ONLY the JSON array, no markdown."""

    messages = [
        {"role": "system", "content": "You are an expert exam question generator. Return ONLY valid JSON arrays."},
        {"role": "user", "content": prompt},
    ]
    raw = _zai_request(messages, max_tokens=800)
    parsed = _parse_json(raw)

    text_qs = []
    if isinstance(parsed, list):
        for item in parsed[:text_count]:
            if isinstance(item, dict) and "question" in item:
                text_qs.append({
                    "question": str(item["question"]),
                    "type": "text",
                    "points": int(item.get("points", 10)),
                })

    # Fill remaining text questions with fallback
    while len(text_qs) < text_count:
        idx = len(text_qs) + 1
        text_qs.append({"question": f"Explain concept #{idx} from {topic} with an example.", "type": "text", "points": 10})

    # Interleave MCQ and text questions
    combined = []
    mi, ti = 0, 0
    for i in range(count):
        if i % 5 < 3 and mi < len(mcqs):
            combined.append(mcqs[mi]); mi += 1
        elif ti < len(text_qs):
            combined.append(text_qs[ti]); ti += 1
        elif mi < len(mcqs):
            combined.append(mcqs[mi]); mi += 1

    return combined[:count]


def _fallback_mcq(topic: str, count: int) -> list:
    """Fallback MCQ questions when Z.AI is unavailable."""
    fallbacks = [
        {
            "question": f"Which of the following best describes {topic}?",
            "type": "mcq",
            "options": {"A": "A fundamental concept in the field", "B": "An advanced specialization", "C": "An unrelated technology", "D": "A deprecated practice"},
            "correct": "A",
            "explanation": f"{topic} is a fundamental concept in its field.",
            "points": 5,
        },
        {
            "question": f"What is the primary purpose of {topic}?",
            "type": "mcq",
            "options": {"A": "To complicate processes", "B": "To solve specific problems efficiently", "C": "To replace all existing solutions", "D": "To generate reports only"},
            "correct": "B",
            "explanation": f"{topic} is designed to solve specific problems efficiently.",
            "points": 8,
        },
        {
            "question": f"Which scenario is {topic} most commonly applied in?",
            "type": "mcq",
            "options": {"A": "Artistic design only", "B": "Hardware manufacturing", "C": "Real-world problem solving in its domain", "D": "Ancient history studies"},
            "correct": "C",
            "explanation": f"{topic} is widely applied in real-world problem-solving scenarios.",
            "points": 8,
        },
        {
            "question": f"What foundational knowledge is most important before learning {topic}?",
            "type": "mcq",
            "options": {"A": "No prerequisites needed", "B": "Basic domain fundamentals", "C": "Expert-level advanced skills", "D": "Unrelated subject expertise"},
            "correct": "B",
            "explanation": f"Basic domain fundamentals provide the necessary foundation for {topic}.",
            "points": 5,
        },
        {
            "question": f"How does mastering {topic} benefit a student in their field?",
            "type": "mcq",
            "options": {"A": "No benefit at all", "B": "Minimal improvement", "C": "Significant improvement in problem-solving ability", "D": "Replaces the need for other skills"},
            "correct": "C",
            "explanation": f"Mastering {topic} significantly improves problem-solving and analytical abilities.",
            "points": 10,
        },
    ]
    result = []
    for i in range(count):
        result.append(fallbacks[i % len(fallbacks)])
    return result[:count]
