export const moodQuestions = [
  {
    id: 'day',
    question: 'How was your day?',
    emoji: '🌤️',
    options: [
      { label: 'Amazing!', value: 3, emoji: '🤩' },
      { label: 'It was okay', value: 2, emoji: '😊' },
      { label: 'Not great', value: 1, emoji: '😔' },
    ],
  },
  {
    id: 'energy',
    question: "How's your energy level?",
    emoji: '⚡',
    options: [
      { label: 'Full of energy!', value: 3, emoji: '🔋' },
      { label: 'Moderate', value: 2, emoji: '🔌' },
      { label: 'Drained', value: 1, emoji: '😴' },
    ],
  },
  {
    id: 'motivation',
    question: 'How motivated do you feel?',
    emoji: '🎯',
    options: [
      { label: 'Super motivated!', value: 3, emoji: '🚀' },
      { label: 'Somewhat', value: 2, emoji: '🤔' },
      { label: 'Not at all', value: 1, emoji: '😶' },
    ],
  },
];

export function getMoodMessage(score) {
  if (score <= 4) {
    return {
      type: 'low',
      message: "Your mood looks off today 🫂 Let's do a hobby or play a game to refresh!",
      color: '#E17055',
      bg: '#FFF3F0',
    };
  }
  if (score <= 6) {
    return {
      type: 'medium',
      message: "You're doing okay! Let's keep the momentum going 💪",
      color: '#FDCB6E',
      bg: '#FFF9E6',
    };
  }
  return {
    type: 'high',
    message: "You're full of energy! 🔥 Let's learn something new today!",
    color: '#00B894',
    bg: '#F0FFF4',
  };
}

export const motivationalQuotes = [
  "The expert in anything was once a beginner. – Helen Hayes",
  "Success is the sum of small efforts repeated day in and day out. – Robert Collier",
  "Don't watch the clock; do what it does. Keep going. – Sam Levenson",
  "Education is the most powerful weapon you can use to change the world. – Nelson Mandela",
  "The future belongs to those who believe in the beauty of their dreams. – Eleanor Roosevelt",
  "It always seems impossible until it's done. – Nelson Mandela",
  "Believe you can and you're halfway there. – Theodore Roosevelt",
  "Your limitation—it's only your imagination.",
  "Push yourself, because no one else is going to do it for you.",
  "Great things never come from comfort zones.",
  "Dream it. Wish it. Do it.",
  "Success doesn't just find you. You have to go out and get it.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
  "Don't stop when you're tired. Stop when you're done.",
  "Wake up with determination. Go to bed with satisfaction.",
  "Do something today that your future self will thank you for.",
  "Little things make big days.",
  "It's going to be hard, but hard does not mean impossible.",
  "Don't wait for opportunity. Create it.",
  "Sometimes we're tested not to show our weaknesses, but to discover our strengths.",
];
