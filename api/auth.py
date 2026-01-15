from fastapi import APIRouter, HTTPException, Response, Header
from fastapi.responses import RedirectResponse
import httpx
import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict

from api.config import (
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI,
    DASHBOARD_URL,
    API_SECRET_KEY,
    DISCORD_API
)

router = APIRouter()

OAUTH2_URL = f"https://discord.com/api/oauth2/authorize?client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}&response_type=code&scope=identify%20guilds"

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, API_SECRET_KEY, algorithm="HS256")
    return encoded_jwt

@router.get("/login")
async def login():
    return RedirectResponse(url=OAUTH2_URL)

@router.get("/callback")
async def callback(code: str):
    try:
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                f"{DISCORD_API}/oauth2/token",
                data={
                    "client_id": CLIENT_ID,
                    "client_secret": CLIENT_SECRET,
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": REDIRECT_URI,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            if token_response.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to get access token")
            
            token_data = token_response.json()
            access_token = token_data["access_token"]
            
            user_response = await client.get(
                f"{DISCORD_API}/users/@me",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if user_response.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to get user data")
            
            user_data = user_response.json()
            
            guilds_response = await client.get(
                f"{DISCORD_API}/users/@me/guilds",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            guilds_data = guilds_response.json() if guilds_response.status_code == 200 else []
            
            jwt_token = create_access_token({
                "user_id": user_data["id"],
                "username": user_data["username"],
                "discord_token": access_token
            })
            
            redirect_url = f"{DASHBOARD_URL}?token={jwt_token}"
            return RedirectResponse(url=redirect_url)
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/me")
async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "")
    
    try:
        payload = jwt.decode(token, API_SECRET_KEY, algorithms=["HS256"])
        
        async with httpx.AsyncClient() as client:
            user_response = await client.get(
                f"{DISCORD_API}/users/@me",
                headers={"Authorization": f"Bearer {payload['discord_token']}"}
            )
            
            if user_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid token")
            
            user_data = user_response.json()
            
            avatar_url = None
            if user_data.get("avatar"):
                avatar_url = f"https://cdn.discordapp.com/avatars/{user_data['id']}/{user_data['avatar']}.png"
            
            return {
                "id": user_data["id"],
                "username": user_data["username"],
                "discriminator": user_data.get("discriminator", "0"),
                "avatar": avatar_url,
                "global_name": user_data.get("global_name")
            }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.get("/guilds")
async def get_user_guilds(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "")
    
    try:
        payload = jwt.decode(token, API_SECRET_KEY, algorithms=["HS256"])
        
        async with httpx.AsyncClient() as client:
            guilds_response = await client.get(
                f"{DISCORD_API}/users/@me/guilds",
                headers={"Authorization": f"Bearer {payload['discord_token']}"}
            )
            
            if guilds_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Failed to get guilds")
            
            guilds = guilds_response.json()
            
            manageable_guilds = [
                {
                    "id": guild["id"],
                    "name": guild["name"],
                    "icon": f"https://cdn.discordapp.com/icons/{guild['id']}/{guild['icon']}.png" if guild.get("icon") else None,
                    "owner": guild.get("owner", False),
                    "permissions": guild.get("permissions", "0")
                }
                for guild in guilds
                if int(guild.get("permissions", 0)) & 0x20
            ]
            
            return manageable_guilds
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")