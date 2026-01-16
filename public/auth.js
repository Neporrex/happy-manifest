# api/auth.py
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
import httpx
import os
from dotenv import load_dotenv
import json

load_dotenv()

router = APIRouter()

# Discord OAuth2 credentials
DISCORD_CLIENT_ID = os.getenv("DISCORD_CLIENT_ID", "1460690691834249257")
DISCORD_CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET")
DISCORD_REDIRECT_URI = os.getenv("DISCORD_REDIRECT_URI", "https://api-happy-production.up.railway.app/api/auth/callback")
DASHBOARD_URL = os.getenv("DASHBOARD_URL", "https://happy-manifest.vercel.app")

# In-memory token storage (use database in production)
user_tokens = {}

@router.get("/login")
async def login():
    """Redirect to Discord OAuth2"""
    discord_url = f"https://discord.com/api/oauth2/authorize?client_id={DISCORD_CLIENT_ID}&redirect_uri={DISCORD_REDIRECT_URI}&response_type=code&scope=identify%20guilds"
    return RedirectResponse(url=discord_url)

@router.get("/callback")
async def callback(code: str = None, error: str = None):
    """Handle Discord OAuth2 callback"""
    if error:
        raise HTTPException(status_code=400, detail=f"Discord OAuth error: {error}")
    
    if not code:
        raise HTTPException(status_code=400, detail="No authorization code received")
    
    try:
        # Exchange code for access token
        async with httpx.AsyncClient() as client:
            # Get access token
            token_data = {
                'client_id': DISCORD_CLIENT_ID,
                'client_secret': DISCORD_CLIENT_SECRET,
                'grant_type': 'authorization_code',
                'code': code,
                'redirect_uri': DISCORD_REDIRECT_URI
            }
            
            token_response = await client.post(
                "https://discord.com/api/oauth2/token",
                data=token_data,
                headers={'Content-Type': 'application/x-www-form-urlencoded'}
            )
            
            if token_response.status_code != 200:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Failed to get access token: {token_response.text}"
                )
            
            tokens = token_response.json()
            access_token = tokens['access_token']
            
            # Get user info
            user_response = await client.get(
                "https://discord.com/api/users/@me",
                headers={'Authorization': f'Bearer {access_token}'}
            )
            
            user_data = user_response.json()
            
            # Generate a simple session token (use JWT in production)
            import uuid
            session_token = str(uuid.uuid4())
            
            # Store user data with token
            user_tokens[session_token] = {
                'user': user_data,
                'access_token': access_token,
                'expires_at': tokens.get('expires_in', 3600)
            }
            
            print(f"✅ User authenticated: {user_data['username']}#{user_data.get('discriminator', '0')}")
            
            # Redirect to dashboard with token
            redirect_url = f"{DASHBOARD_URL}/dashboard?token={session_token}"
            return RedirectResponse(url=redirect_url)
            
    except Exception as e:
        print(f"❌ Auth error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")

@router.get("/me")
async def get_current_user(request: Request):
    """Get current authenticated user"""
    auth_header = request.headers.get("Authorization")
    
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization token")
    
    token = auth_header[7:]  # Remove "Bearer "
    
    if token not in user_tokens:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return user_tokens[token]['user']

@router.get("/guilds")
async def get_user_guilds(request: Request):
    """Get user's Discord guilds"""
    auth_header = request.headers.get("Authorization")
    
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization token")
    
    token = auth_header[7:]
    
    if token not in user_tokens:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    try:
        async with httpx.AsyncClient() as client:
            # Get user's guilds from Discord API
            guilds_response = await client.get(
                "https://discord.com/api/users/@me/guilds",
                headers={'Authorization': f'Bearer {user_tokens[token]["access_token"]}'}
            )
            
            if guilds_response.status_code != 200:
                raise HTTPException(
                    status_code=guilds_response.status_code,
                    detail="Failed to fetch guilds from Discord"
                )
            
            guilds = guilds_response.json()
            print(f"✅ Fetched {len(guilds)} guilds for user")
            
            return guilds
            
    except Exception as e:
        print(f"❌ Failed to fetch guilds: {str(e)}")
        # Return empty array if API fails
        return []
