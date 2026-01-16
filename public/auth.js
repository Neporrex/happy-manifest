# api/auth.py
from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import RedirectResponse
import httpx
import os
from dotenv import load_dotenv
from typing import Optional
import urllib.parse

load_dotenv()

router = APIRouter()

# Discord OAuth2 credentials
DISCORD_CLIENT_ID = os.getenv("DISCORD_CLIENT_ID", "1460690691834249257")
DISCORD_CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET")
DISCORD_REDIRECT_URI = os.getenv("DISCORD_REDIRECT_URI", "https://api-happy-production.up.railway.app/api/auth/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://happy-manifest.vercel.app")

# In-memory token storage (use database in production)
user_tokens = {}

@router.get("/login")
async def login():
    """Redirect to Discord OAuth2"""
    # Properly encode the redirect URI
    encoded_redirect = urllib.parse.quote(DISCORD_REDIRECT_URI, safe='')
    
    discord_url = (
        f"https://discord.com/api/oauth2/authorize"
        f"?client_id={DISCORD_CLIENT_ID}"
        f"&response_type=code"
        f"&redirect_uri={encoded_redirect}"
        f"&scope=identify%20guilds"
    )
    
    print(f"🔗 Discord OAuth URL: {discord_url}")
    return RedirectResponse(url=discord_url)

@router.get("/callback")
async def callback(
    code: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None)
):
    """Handle Discord OAuth2 callback"""
    print(f"🔄 OAuth Callback received - Code: {code}, Error: {error}")
    
    if error:
        error_msg = f"Discord OAuth error: {error}"
        if error_description:
            error_msg += f" - {error_description}"
        
        print(f"❌ {error_msg}")
        
        # Redirect to frontend with error
        error_redirect = f"{FRONTEND_URL}/?auth_error={urllib.parse.quote(error_msg)}"
        return RedirectResponse(url=error_redirect)
    
    if not code:
        print("❌ No authorization code received")
        error_redirect = f"{FRONTEND_URL}/?auth_error=no_code"
        return RedirectResponse(url=error_redirect)
    
    try:
        print("🔄 Exchanging code for access token...")
        
        # Exchange code for access token
        async with httpx.AsyncClient() as client:
            token_data = {
                'client_id': DISCORD_CLIENT_ID,
                'client_secret': DISCORD_CLIENT_SECRET,
                'grant_type': 'authorization_code',
                'code': code,
                'redirect_uri': DISCORD_REDIRECT_URI,
                'scope': 'identify guilds'
            }
            
            token_response = await client.post(
                "https://discord.com/api/oauth2/token",
                data=token_data,
                headers={'Content-Type': 'application/x-www-form-urlencoded'}
            )
            
            print(f"📥 Token response status: {token_response.status_code}")
            
            if token_response.status_code != 200:
                error_text = token_response.text[:200]
                print(f"❌ Token error: {error_text}")
                raise HTTPException(
                    status_code=400, 
                    detail=f"Discord token error: {error_text}"
                )
            
            tokens = token_response.json()
            access_token = tokens['access_token']
            
            print(f"✅ Access token received")
            
            # Get user info
            user_response = await client.get(
                "https://discord.com/api/users/@me",
                headers={'Authorization': f'Bearer {access_token}'}
            )
            
            if user_response.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to get user info: {user_response.text}"
                )
            
            user_data = user_response.json()
            print(f"✅ User authenticated: {user_data['username']}#{user_data.get('discriminator', '0')}")
            
            # Generate session token
            import uuid
            import time
            session_token = str(uuid.uuid4())
            
            # Store user data
            user_tokens[session_token] = {
                'user': user_data,
                'access_token': access_token,
                'expires_at': time.time() + tokens.get('expires_in', 604800)
            }
            
            # Get guilds (optional, can be fetched later)
            try:
                guilds_response = await client.get(
                    "https://discord.com/api/users/@me/guilds",
                    headers={'Authorization': f'Bearer {access_token}'}
                )
                
                if guilds_response.status_code == 200:
                    guilds = guilds_response.json()
                    print(f"✅ Fetched {len(guilds)} guilds")
                    user_tokens[session_token]['guilds'] = guilds
            except Exception as guild_error:
                print(f"⚠️ Guild fetch error: {guild_error}")
            
            # Redirect to frontend dashboard with token
            redirect_url = f"{FRONTEND_URL}/dashboard?token={session_token}"
            print(f"🔗 Redirecting to: {redirect_url}")
            
            return RedirectResponse(url=redirect_url)
            
    except Exception as e:
        print(f"❌ Auth error: {str(e)}")
        
        # Redirect to frontend with error
        error_msg = urllib.parse.quote(str(e))
        error_redirect = f"{FRONTEND_URL}/?auth_error={error_msg}"
        return RedirectResponse(url=error_redirect)

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
    
    # Return cached guilds or fetch fresh
    if 'guilds' in user_tokens[token]:
        return user_tokens[token]['guilds']
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://discord.com/api/users/@me/guilds",
                headers={'Authorization': f'Bearer {user_tokens[token]["access_token"]}'}
            )
            
            if response.status_code == 200:
                guilds = response.json()
                user_tokens[token]['guilds'] = guilds
                return guilds
            else:
                return []
                
    except Exception:
        return []
