import os
import secrets
import sys

CLIENT_ID = os.getenv("DISCORD_CLIENT_ID")
CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET")
REDIRECT_URI = os.getenv("REDIRECT_URI", "http://localhost:8000/api/auth/callback")
DASHBOARD_URL = os.getenv("DASHBOARD_URL", "http://localhost:5173")
DATABASE_PATH = os.getenv("DATABASE_PATH", "data/happy.db")

API_SECRET_KEY = os.getenv("API_SECRET_KEY")

if not API_SECRET_KEY or API_SECRET_KEY == "neporrex_proj080612@":
    print("━" * 60)
    print("⚠️  CRITICAL WARNING: API_SECRET_KEY is not configured!")
    print("   Using auto-generated temporary key for this session.")
    print("   Set API_SECRET_KEY environment variable for production!")
    print("━" * 60)
    API_SECRET_KEY = secrets.token_urlsafe(32)

DISCORD_API = "https://discord.com/api/v10"
BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN")
