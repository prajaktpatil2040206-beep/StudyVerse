"""
Advanced Timetable Generator for StudyVerse
Uses AI and efficient algorithms to create personalized schedules
"""
from datetime import datetime, timedelta
from typing import List, Dict
import requests
import os

ULTRATHINKZ_API_KEY = os.getenv('ULTRATHINKZ_API_KEY', '')
ULTRATHINKZ_URL = "https://api.ultrathinkz.ai/v1/chat/completions"

class TimetableGenerator:
    def __init__(self):
        self.time_blocks = {
            'early_morning': (5, 7),    # 5 AM - 7 AM
            'morning': (7, 12),          # 7 AM - 12 PM
            'afternoon': (12, 17),       # 12 PM - 5 PM
            'evening': (17, 20),         # 5 PM - 8 PM
            'night': (20, 23),           # 8 PM - 11 PM
            'sleep': (23, 5)             # 11 PM - 5 AM
        }
    
    def generate_timetable(self, user_data: Dict) -> Dict:
        """
        Generate personalized timetable based on user data
        
        Args:
            user_data: {
                'subjects': List[str],
                'college_timing': {'start': '09:00', 'end': '17:00'},
                'sleep_hours': int,
                'goals': List[str],
                'weak_subjects': List[str],
                'preferred_study_time': str  # 'morning', 'evening', 'night'
            }
        """
        try:
            # Parse college timing
            college_start = self._parse_time(user_data.get('college_timing', {}).get('start', '09:00'))
            college_end = self._parse_time(user_data.get('college_timing', {}).get('end', '17:00'))
            
            # Get subjects and priorities
            subjects = user_data.get('subjects', [])
            weak_subjects = user_data.get('weak_subjects', [])
            sleep_hours = user_data.get('sleep_hours', 7)
            
            # Use AI to generate optimal schedule
            ai_schedule = self._generate_ai_schedule(user_data)
            
            if ai_schedule:
                return ai_schedule
            
            # Fallback: Rule-based generation
            return self._generate_rule_based_schedule(
                subjects, college_start, college_end, weak_subjects, sleep_hours
            )
        
        except Exception as e:
            print(f"Timetable generation error: {str(e)}")
            return self._get_default_timetable()
    
    def _generate_ai_schedule(self, user_data: Dict) -> Dict:
        """Use UltraThinkz AI to generate schedule"""
        try:
            prompt = f"""Generate a detailed daily timetable for a student with the following profile:

Subjects: {', '.join(user_data.get('subjects', []))}
College Timing: {user_data.get('college_timing', {}).get('start', '09:00')} to {user_data.get('college_timing', {}).get('end', '17:00')}
Sleep Hours: {user_data.get('sleep_hours', 7)} hours
Weak Subjects: {', '.join(user_data.get('weak_subjects', []))}
Preferred Study Time: {user_data.get('preferred_study_time', 'evening')}

Create a JSON timetable with time slots in 24-hour format. Include:
- Morning routine (exercise, breakfast)
- College hours
- Study sessions (prioritize weak subjects)
- Breaks and meals
- Recreation time
- Sleep schedule

Format: {{"slots": [{{"time": "HH:MM", "activity": "...", "type": "study/college/break/sleep", "subject": "..."}}]}}"""

            response = requests.post(
                ULTRATHINKZ_URL,
                headers={
                    'Authorization': f'Bearer {ULTRATHINKZ_API_KEY}',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': 'gpt-4',
                    'messages': [{'role': 'user', 'content': prompt}],
                    'temperature': 0.7
                },
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                content = result.get('choices', [{}])[0].get('message', {}).get('content', '')
                
                # Parse JSON from response
                import json
                import re
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    schedule = json.loads(json_match.group())
                    return schedule
            
            return None
        
        except Exception as e:
            print(f"AI schedule generation error: {str(e)}")
            return None
    
    def _generate_rule_based_schedule(self, subjects, college_start, college_end, weak_subjects, sleep_hours):
        """Generate schedule using rule-based algorithm"""
        slots = []
        
        # Morning routine (5:00 - 7:00)
        slots.append({'time': '05:00', 'activity': 'Wake up & Exercise', 'type': 'routine', 'duration': 60})
        slots.append({'time': '06:00', 'activity': 'Morning Study (Peak Focus)', 'type': 'study', 'subject': weak_subjects[0] if weak_subjects else subjects[0] if subjects else 'General', 'duration': 60})
        slots.append({'time': '07:00', 'activity': 'Breakfast & Preparation', 'type': 'break', 'duration': 60})
        
        # College hours
        slots.append({'time': college_start, 'activity': 'College Classes', 'type': 'college', 'duration': self._time_diff(college_start, college_end)})
        
        # Post-college
        slots.append({'time': college_end, 'activity': 'Lunch & Rest', 'type': 'break', 'duration': 60})
        
        # Evening study sessions
        evening_start = self._add_minutes(college_end, 60)
        for i, subject in enumerate(subjects[:3]):
            study_time = self._add_minutes(evening_start, i * 90)
            slots.append({
                'time': study_time,
                'activity': f'Study: {subject}',
                'type': 'study',
                'subject': subject,
                'duration': 60
            })
            # Add break
            break_time = self._add_minutes(study_time, 60)
            slots.append({'time': break_time, 'activity': 'Break', 'type': 'break', 'duration': 15})
        
        # Dinner
        slots.append({'time': '20:00', 'activity': 'Dinner', 'type': 'break', 'duration': 45})
        
        # Night revision
        slots.append({'time': '20:45', 'activity': 'Revision & Practice', 'type': 'study', 'subject': 'Revision', 'duration': 75})
        
        # Recreation
        slots.append({'time': '22:00', 'activity': 'Recreation & Relaxation', 'type': 'recreation', 'duration': 60})
        
        # Sleep
        sleep_time = 23 if sleep_hours >= 7 else 24 - sleep_hours
        slots.append({'time': f'{sleep_time:02d}:00', 'activity': 'Sleep', 'type': 'sleep', 'duration': sleep_hours * 60})
        
        return {'slots': slots}
    
    def _parse_time(self, time_str: str) -> str:
        """Parse time string to HH:MM format"""
        try:
            dt = datetime.strptime(time_str, '%H:%M')
            return time_str
        except:
            return '09:00'
    
    def _add_minutes(self, time_str: str, minutes: int) -> str:
        """Add minutes to time string"""
        try:
            dt = datetime.strptime(time_str, '%H:%M')
            new_dt = dt + timedelta(minutes=minutes)
            return new_dt.strftime('%H:%M')
        except:
            return time_str
    
    def _time_diff(self, start: str, end: str) -> int:
        """Calculate time difference in minutes"""
        try:
            start_dt = datetime.strptime(start, '%H:%M')
            end_dt = datetime.strptime(end, '%H:%M')
            diff = (end_dt - start_dt).seconds // 60
            return diff
        except:
            return 60
    
    def _get_default_timetable(self) -> Dict:
        """Return default timetable"""
        return {
            'slots': [
                {'time': '06:00', 'activity': 'Morning Study', 'type': 'study', 'subject': 'General', 'duration': 60},
                {'time': '09:00', 'activity': 'College', 'type': 'college', 'duration': 480},
                {'time': '18:00', 'activity': 'Evening Study', 'type': 'study', 'subject': 'General', 'duration': 120},
                {'time': '21:00', 'activity': 'Recreation', 'type': 'recreation', 'duration': 60},
                {'time': '23:00', 'activity': 'Sleep', 'type': 'sleep', 'duration': 420}
            ]
        }

# Singleton instance
timetable_generator = TimetableGenerator()
