from fastapi import APIRouter, HTTPException, Header
import httpx
import jwt
from typing import List, Dict, Any, Optional

from api.config import API_SECRET_KEY, DISCORD_API, BOT_TOKEN

router = APIRouter()

def verify_token(authorization: str) -> Dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "")
    
    try:
        payload = jwt.decode(token, API_SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.get("/{guild_id}/channels")
async def get_guild_channels(guild_id: str, authorization: Optional[str] = Header(None)):
    verify_token(authorization)
    
    if not BOT_TOKEN:
        raise HTTPException(status_code=500, detail="Bot token not configured")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{DISCORD_API}/guilds/{guild_id}/channels",
            headers={"Authorization": f"Bot {BOT_TOKEN}"}
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch channels")
        
        channels = response.json()
        
        text_channels = [
            {
                "id": channel["id"],
                "name": channel["name"],
                "type": channel["type"],
                "position": channel.get("position", 0)
            }
            for channel in channels
            if channel["type"] in [0, 4, 5]
        ]
        
        return text_channels

@router.get("/{guild_id}/roles")
async def get_guild_roles(guild_id: str, authorization: Optional[str] = Header(None)):
    verify_token(authorization)
    
    if not BOT_TOKEN:
        raise HTTPException(status_code=500, detail="Bot token not configured")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{DISCORD_API}/guilds/{guild_id}/roles",
            headers={"Authorization": f"Bot {BOT_TOKEN}"}
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch roles")
        
        roles = response.json()
        
        return [
            {
                "id": role["id"],
                "name": role["name"],
                "color": role["color"],
                "position": role["position"]
            }
            for role in roles
        ]

@router.get("/{guild_id}/info")
async def get_guild_info(guild_id: str, authorization: Optional[str] = Header(None)):
    verify_token(authorization)
    
    if not BOT_TOKEN:
        raise HTTPException(status_code=500, detail="Bot token not configured")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{DISCORD_API}/guilds/{guild_id}",
            headers={"Authorization": f"Bot {BOT_TOKEN}"}
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch guild info")
        
        guild = response.json()
        
        return {
            "id": guild["id"],
            "name": guild["name"],
            "icon": f"https://cdn.discordapp.com/icons/{guild['id']}/{guild['icon']}.png" if guild.get("icon") else None,
            "member_count": guild.get("approximate_member_count", 0),
            "owner_id": guild.get("owner_id")
        }