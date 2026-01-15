import aiosqlite
import os
from datetime import datetime
from typing import Optional, List, Dict, Any

class Database:
    def __init__(self, db_path: str = "data/happy.db"):
        self.db_path = db_path
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    async def connect(self):
        self.conn = await aiosqlite.connect(self.db_path)
        await self.create_tables()
    
    async def close(self):
        if hasattr(self, 'conn'):
            await self.conn.close()
    
    async def create_tables(self):
        await self.conn.execute('''
            CREATE TABLE IF NOT EXISTS guilds (
                guild_id INTEGER PRIMARY KEY,
                name TEXT,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        await self.conn.execute('''
            CREATE TABLE IF NOT EXISTS guild_settings (
                guild_id INTEGER PRIMARY KEY,
                welcome_enabled INTEGER DEFAULT 0,
                welcome_channel_id INTEGER,
                welcome_message TEXT DEFAULT 'Welcome {user} to {guild}!',
                leave_enabled INTEGER DEFAULT 0,
                leave_channel_id INTEGER,
                log_enabled INTEGER DEFAULT 0,
                log_channel_id INTEGER,
                ticket_enabled INTEGER DEFAULT 0,
                ticket_category_id INTEGER,
                FOREIGN KEY (guild_id) REFERENCES guilds(guild_id)
            )
        ''')
        
        await self.conn.execute('''
            CREATE TABLE IF NOT EXISTS warns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id INTEGER,
                user_id INTEGER,
                moderator_id INTEGER,
                reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (guild_id) REFERENCES guilds(guild_id)
            )
        ''')
        
        await self.conn.execute('''
            CREATE TABLE IF NOT EXISTS tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id INTEGER,
                channel_id INTEGER,
                user_id INTEGER,
                status TEXT DEFAULT 'open',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                closed_at TIMESTAMP,
                FOREIGN KEY (guild_id) REFERENCES guilds(guild_id)
            )
        ''')
        
        await self.conn.execute('''
            CREATE TABLE IF NOT EXISTS analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id INTEGER,
                event_type TEXT,
                event_data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (guild_id) REFERENCES guilds(guild_id)
            )
        ''')
        
        await self.conn.commit()