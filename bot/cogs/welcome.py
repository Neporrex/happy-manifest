import discord
from discord.ext import commands
from discord import app_commands
from typing import Optional

class Welcome(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
    
    @commands.Cog.listener()
    async def on_member_join(self, member: discord.Member):
        settings = await self.bot.db.get_guild_settings(member.guild.id)
        
        if settings and settings['welcome_enabled']:
            channel_id = settings['welcome_channel_id']
            if channel_id:
                channel = member.guild.get_channel(channel_id)
                if channel:
                    message = settings['welcome_message'].replace(
                        '{user}', member.mention
                    ).replace(
                        '{guild}', member.guild.name
                    ).replace(
                        '{membercount}', str(member.guild.member_count)
                    )
                    
                    embed = discord.Embed(
                        title="👋 Welcome!",
                        description=message,
                        color=discord.Color.green()
                    )
                    embed.set_thumbnail(url=member.display_avatar.url)
                    embed.set_footer(text=f"Member #{member.guild.member_count}")
                    
                    await channel.send(embed=embed)
        
        await self.bot.db.log_event(
            member.guild.id,
            "member_join",
            f"User {member.id} joined"
        )
    
    @commands.Cog.listener()
    async def on_member_remove(self, member: discord.Member):
        settings = await self.bot.db.get_guild_settings(member.guild.id)
        
        if settings and settings['leave_enabled']:
            channel_id = settings['leave_channel_id']
            if channel_id:
                channel = member.guild.get_channel(channel_id)
                if channel:
                    embed = discord.Embed(
                        title="👋 Goodbye",
                        description=f"{member.mention} has left the server",
                        color=discord.Color.red()
                    )
                    embed.set_thumbnail(url=member.display_avatar.url)
                    embed.set_footer(text=f"Members: {member.guild.member_count}")
                    
                    await channel.send(embed=embed)
        
        await self.bot.db.log_event(
            member.guild.id,
            "member_leave",
            f"User {member.id} left"
        )
    
    @commands.Cog.listener()
    async def on_message_delete(self, message: discord.Message):
        if message.author.bot or not message.guild:
            return
        
        settings = await self.bot.db.get_guild_settings(message.guild.id)
        
        if settings and settings['log_enabled']:
            channel_id = settings['log_channel_id']
            if channel_id:
                channel = message.guild.get_channel(channel_id)
                if channel:
                    embed = discord.Embed(
                        title="🗑️ Message Deleted",
                        color=discord.Color.red()
                    )
                    embed.add_field(name="Author", value=message.author.mention, inline=True)
                    embed.add_field(name="Channel", value=message.channel.mention, inline=True)
                    embed.add_field(name="Content", value=message.content[:1024] if message.content else "*No content*", inline=False)
                    embed.timestamp = discord.utils.utcnow()
                    
                    await channel.send(embed=embed)
    
    @commands.Cog.listener()
    async def on_message_edit(self, before: discord.Message, after: discord.Message):
        if before.author.bot or not before.guild or before.content == after.content:
            return
        
        settings = await self.bot.db.get_guild_settings(before.guild.id)
        
        if settings and settings['log_enabled']:
            channel_id = settings['log_channel_id']
            if channel_id:
                channel = before.guild.get_channel(channel_id)
                if channel:
                    embed = discord.Embed(
                        title="✏️ Message Edited",
                        color=discord.Color.blue()
                    )
                    embed.add_field(name="Author", value=before.author.mention, inline=True)
                    embed.add_field(name="Channel", value=before.channel.mention, inline=True)
                    embed.add_field(name="Before", value=before.content[:1024] if before.content else "*No content*", inline=False)
                    embed.add_field(name="After", value=after.content[:1024] if after.content else "*No content*", inline=False)
                    embed.add_field(name="Jump to Message", value=f"[Click here]({after.jump_url})", inline=False)
                    embed.timestamp = discord.utils.utcnow()
                    
                    await channel.send(embed=embed)
    
    @app_commands.command(name="setwelcome", description="Configure welcome messages")
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.describe(
        enabled="Enable or disable welcome messages",
        channel="Channel to send welcome messages",
        message="Welcome message (use {user}, {guild}, {membercount})"
    )
    async def setwelcome(
        self,
        interaction: discord.Interaction,
        enabled: bool,
        channel: Optional[discord.TextChannel] = None,
        message: Optional[str] = None
    ):
        try:
            settings = {}
            settings['welcome_enabled'] = 1 if enabled else 0
            
            if channel:
                settings['welcome_channel_id'] = channel.id
            
            if message:
                settings['welcome_message'] = message
            
            await self.bot.db.update_guild_settings(interaction.guild.id, settings)
            
            embed = discord.Embed(
                title="✓ Welcome Settings Updated",
                color=discord.Color.green()
            )
            embed.add_field(name="Enabled", value=str(enabled), inline=True)
            if channel:
                embed.add_field(name="Channel", value=channel.mention, inline=True)
            if message:
                embed.add_field(name="Message", value=message, inline=False)
            
            await interaction.response.send_message(embed=embed)
        except Exception as e:
            await interaction.response.send_message(f"❌ Failed to update settings: {e}", ephemeral=True)
    
    @app_commands.command(name="setleavelog", description="Configure leave logging")
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.describe(
        enabled="Enable or disable leave logging",
        channel="Channel to send leave logs"
    )
    async def setleavelog(
        self,
        interaction: discord.Interaction,
        enabled: bool,
        channel: Optional[discord.TextChannel] = None
    ):
        try:
            settings = {}
            settings['leave_enabled'] = 1 if enabled else 0
            
            if channel:
                settings['leave_channel_id'] = channel.id
            
            await self.bot.db.update_guild_settings(interaction.guild.id, settings)
            
            embed = discord.Embed(
                title="✓ Leave Log Settings Updated",
                color=discord.Color.green()
            )
            embed.add_field(name="Enabled", value=str(enabled), inline=True)
            if channel:
                embed.add_field(name="Channel", value=channel.mention, inline=True)
            
            await interaction.response.send_message(embed=embed)
        except Exception as e:
            await interaction.response.send_message(f"❌ Failed to update settings: {e}", ephemeral=True)
    
    @app_commands.command(name="setmessagelog", description="Configure message logging")
    @app_commands.default_permissions(manage_guild=True)
    @app_commands.describe(
        enabled="Enable or disable message logging",
        channel="Channel to send message logs"
    )
    async def setmessagelog(
        self,
        interaction: discord.Interaction,
        enabled: bool,
        channel: Optional[discord.TextChannel] = None
    ):
        try:
            settings = {}
            settings['log_enabled'] = 1 if enabled else 0
            
            if channel:
                settings['log_channel_id'] = channel.id
            
            await self.bot.db.update_guild_settings(interaction.guild.id, settings)
            
            embed = discord.Embed(
                title="✓ Message Log Settings Updated",
                color=discord.Color.green()
            )
            embed.add_field(name="Enabled", value=str(enabled), inline=True)
            if channel:
                embed.add_field(name="Channel", value=channel.mention, inline=True)
            
            await interaction.response.send_message(embed=embed)
        except Exception as e:
            await interaction.response.send_message(f"❌ Failed to update settings: {e}", ephemeral=True)

async def setup(bot):
    await bot.add_cog(Welcome(bot))