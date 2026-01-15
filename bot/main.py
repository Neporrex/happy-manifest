import discord
from discord.ext import commands
import asyncio
from datetime import datetime
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import DISCORD_TOKEN, DATABASE_PATH
from utils.database import Database

class HappyBot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.all()
        
        super().__init__(
            command_prefix="/",
            intents=intents,
            help_command=None
        )
        
        self.db = Database(DATABASE_PATH)
        self.start_time = datetime.utcnow()
    
    async def setup_hook(self):
        print("Starting setup_hook")
        await self.db.connect()
        print("DB connected")
        
        cogs_to_load = [
            "cogs.moderation",
            "cogs.welcome",
            "cogs.tickets",
            "cogs.utility"
        ]
        
        for cog in cogs_to_load:
            try:
                await self.load_extension(cog)
                print(f"✓ Loaded {cog}")
            except Exception as e:
                print(f"✗ Failed to load {cog}: {e}")
        
    
    async def on_ready(self):
        print(f"✓ Logged in as {self.user} (ID: {self.user.id})")
        print(f"✓ Bot is in {len(self.guilds)} guilds")
        print("━" * 50)

        await self.change_presence(
            activity=discord.Activity(
                type=discord.ActivityType.watching,
                name=f"{len(self.guilds)} Servers."
            )
        )

        try:
            await self.tree.sync()
            print("✓ Slash commands synced")
        except Exception as e:
            print(f"✗ Failed to sync commands: {e}")
    
    async def on_guild_join(self, guild: discord.Guild):
        await self.db.add_guild(guild.id, guild.name)
        await self.db.log_event(guild.id, "guild_join", f"Bot joined {guild.name}")
    
    async def on_guild_remove(self, guild: discord.Guild):
        await self.db.log_event(guild.id, "guild_leave", f"Bot left {guild.name}")
    
    async def close(self):
        await self.db.close()
        await super().close()

def main():
    if not DISCORD_TOKEN:
        print("ERROR: DISCORD_BOT_TOKEN not found in environment variables!")
        print("Please create a .env file with your bot token.")
        return
    
    bot = HappyBot()
    try:
        bot.run(DISCORD_TOKEN)
    except Exception as e:
        print(f"Bot crashed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()