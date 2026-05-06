import os

EMAIL_ADDRESS = os.getenv('EMAIL_USER', 'your-email@gmail.com')
# Gmail app password — spaces are stripped (SMTP requires the raw 16-char token)
EMAIL_APP_PASSWORD = os.getenv('EMAIL_PASSWORD', '')
OLLAMA_MODEL = "qwen2.5:0.5b"
OLLAMA_BASE_URL = "http://localhost:11434"
# Z.AI API key — used only for MCQ quiz generation
ZAI_API_KEY = os.getenv('ZAI_API_KEY', '')
ZAI_BASE_URL = "https://api.z.ai/v1"
ZAI_MODEL = "z-pro"
