import os
from dotenv import load_dotenv
from pathlib import Path

# Explicitly find the .env file, assuming it's in the root folder above src/
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")

# Add this temporarily to verify it loaded (REMOVE before submitting your hackathon project)
if not MISTRAL_API_KEY:
    raise ValueError("API Key not found! Check your .env file path.")