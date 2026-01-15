from fastapi import APIRouter, HTTPException, Header
import jwt
import os
import sys
import aiosqlite
from typing import Dict, Any, Optional

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../..'))

from bot.utils.database import Database
from api.config import API_SECRET_KEY, DATABASE_PATH

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

@router.get("/{guild_id}")
async def get_config(guild_id: str, authorization: Optional[str] = Header(None)):
    verify_token(authorization)
    
    db = Database(DATABASE_PATH)
    await db.connect()
    
    try:
        settings = await db.get_guild_settings(int(guild_id))
        if not settings:
            settings = {
                "guild_id": int(guild_id),
                "welcome_enabled": 0,
                "welcome_channel_id": None,
                "welcome_message": "Welcome {user} to {guild}!",
                "leave_enabled": 0,
                "leave_channel_id": None,
                "log_enabled": 0,
                "log_channel_id": None,
                "ticket_enabled": 0,
                "ticket_category_id": None
            }
        
        return settings
    finally:
        await db.close()

@router.post("/{guild_id}")
async def update_config(guild_id: str, config: Dict[str, Any], authorization: Optional[str] = Header(None)):
    verify_token(authorization)
    
    db = Database(DATABASE_PATH)
    await db.connect()
    
    try:
        await db.update_guild_settings(int(guild_id), config)
        return {"success": True, "message": "Configuration updated"}
    finally:
        await db.close()

@router.get("/{guild_id}/warns")
async def get_warns(guild_id: str, user_id: str = None, authorization: Optional[str] = Header(None)):
    verify_token(authorization)
    
    db = Database(DATABASE_PATH)
    await db.connect()
    
    try:
        if user_id:
            warns = await db.get_warns(int(guild_id), int(user_id))
        else:
            async with db.conn.execute(
                "SELECT * FROM warns WHERE guild_id = ? ORDER BY created_at DESC LIMIT 100",
                (int(guild_id),)
            ) as cursor:
                rows = await cursor.fetchall()
                columns = [description[0] for description in cursor.description]
                warns = [dict(zip(columns, row)) for row in rows]
        
        return warns
    finally:
        await db.close()

@router.get("/{guild_id}/tickets")
async def get_tickets(guild_id: str, authorization: Optional[str] = Header(None)):
    verify_token(authorization)
    
    db = Database(DATABASE_PATH)
    await db.connect()
    
    try:
        async with db.conn.execute(
            "SELECT * FROM tickets WHERE guild_id = ? ORDER BY created_at DESC LIMIT 50",
            (int(guild_id),)
        ) as cursor:
            rows = await cursor.fetchall()
            columns = [description[0] for description in cursor.description]
            tickets = [dict(zip(columns, row)) for row in rows]
        
        return tickets
    finally:
        await db.close()

@router.get("/{guild_id}/analytics")
async def get_analytics(guild_id: str, authorization: Optional[str] = Header(None)):
    verify_token(authorization)
    
    db = Database(DATABASE_PATH)
    await db.connect()
    
    try:
        analytics = await db.get_analytics(int(guild_id))
        
        event_counts = {}
        for event in analytics:
            event_type = event['event_type']
            event_counts[event_type] = event_counts.get(event_type, 0) + 1
        
        return {
            "events": analytics[:50],
            "summary": event_counts
        }
    finally:
        await db.close()