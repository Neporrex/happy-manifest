import discord
from discord.ext import commands
from discord import app_commands
from datetime import datetime

class Utility(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
    
    @app_commands.command(name="ping", description="Check bot latency")
    async def ping(self, interaction: discord.Interaction):
        latency = round(self.bot.latency * 1000)
        
        embed = discord.Embed(
            title="🏓 Pong!",
            description=f"Latency: **{latency}ms**",
            color=discord.Color.green() if latency < 100 else discord.Color.orange()
        )
        await interaction.response.send_message(embed=embed)
    
    @app_commands.command(name="uptime", description="Check how long the bot has been running")
    async def uptime(self, interaction: discord.Interaction):
        uptime_duration = datetime.utcnow() - self.bot.start_time
        days = uptime_duration.days
        hours, remainder = divmod(uptime_duration.seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        
        embed = discord.Embed(
            title="⏰ Bot Uptime",
            description=f"**{days}d {hours}h {minutes}m {seconds}s**",
            color=discord.Color.blue()
        )
        embed.set_footer(text=f"Started at {self.bot.start_time.strftime('%Y-%m-%d %H:%M:%S')} UTC")
        await interaction.response.send_message(embed=embed)
    
    @app_commands.command(name="serverinfo", description="Get information about the server")
    async def serverinfo(self, interaction: discord.Interaction):
        guild = interaction.guild
        
        embed = discord.Embed(
            title=f"📊 {guild.name}",
            color=discord.Color.blue()
        )
        
        if guild.icon:
            embed.set_thumbnail(url=guild.icon.url)
        
        embed.add_field(name="Owner", value=guild.owner.mention if guild.owner else "Unknown", inline=True)
        embed.add_field(name="Server ID", value=str(guild.id), inline=True)
        embed.add_field(name="Created", value=f"<t:{int(guild.created_at.timestamp())}:R>", inline=True)
        
        embed.add_field(name="Members", value=str(guild.member_count), inline=True)
        embed.add_field(name="Roles", value=str(len(guild.roles)), inline=True)
        embed.add_field(name="Channels", value=str(len(guild.channels)), inline=True)
        
        embed.add_field(name="Boost Level", value=f"Level {guild.premium_tier}", inline=True)
        embed.add_field(name="Boosts", value=str(guild.premium_subscription_count), inline=True)
        embed.add_field(name="Verification", value=str(guild.verification_level).title(), inline=True)
        
        await interaction.response.send_message(embed=embed)
    
    @app_commands.command(name="userinfo", description="Get information about a user")
    @app_commands.describe(member="The member to get info about (leave empty for yourself)")
    async def userinfo(self, interaction: discord.Interaction, member: discord.Member = None):
        member = member or interaction.user
        
        embed = discord.Embed(
            title=f"👤 {member}",
            color=member.color if member.color != discord.Color.default() else discord.Color.blue()
        )
        
        embed.set_thumbnail(url=member.display_avatar.url)
        
        embed.add_field(name="ID", value=str(member.id), inline=True)
        embed.add_field(name="Nickname", value=member.nick or "None", inline=True)
        embed.add_field(name="Bot", value="Yes" if member.bot else "No", inline=True)
        
        embed.add_field(name="Account Created", value=f"<t:{int(member.created_at.timestamp())}:R>", inline=True)
        embed.add_field(name="Joined Server", value=f"<t:{int(member.joined_at.timestamp())}:R>", inline=True)
        
        roles = [role.mention for role in member.roles[1:]]
        if roles:
            embed.add_field(
                name=f"Roles [{len(roles)}]",
                value=" ".join(roles[:10]) + (f" (+{len(roles) - 10} more)" if len(roles) > 10 else ""),
                inline=False
            )
        
        await interaction.response.send_message(embed=embed)
    
    @app_commands.command(name="avatar", description="Get a user's avatar")
    @app_commands.describe(member="The member to get avatar of (leave empty for yourself)")
    async def avatar(self, interaction: discord.Interaction, member: discord.Member = None):
        member = member or interaction.user
        
        embed = discord.Embed(
            title=f"🖼️ {member}'s Avatar",
            color=discord.Color.blue()
        )
        embed.set_image(url=member.display_avatar.url)
        embed.add_field(
            name="Links",
            value=f"[PNG]({member.display_avatar.replace(format='png', size=1024).url}) | "
                  f"[JPG]({member.display_avatar.replace(format='jpg', size=1024).url}) | "
                  f"[WEBP]({member.display_avatar.replace(format='webp', size=1024).url})",
            inline=False
        )
        
        await interaction.response.send_message(embed=embed)
    
    @app_commands.command(name="analytics", description="View server analytics")
    @app_commands.default_permissions(manage_guild=True)
    async def analytics(self, interaction: discord.Interaction):
        try:
            events = await self.bot.db.get_analytics(interaction.guild.id)
            
            event_counts = {}
            for event in events:
                event_type = event['event_type']
                event_counts[event_type] = event_counts.get(event_type, 0) + 1
            
            embed = discord.Embed(
                title=f"📊 Analytics for {interaction.guild.name}",
                color=discord.Color.blue()
            )
            
            if event_counts:
                for event_type, count in sorted(event_counts.items(), key=lambda x: x[1], reverse=True):
                    embed.add_field(
                        name=event_type.replace('_', ' ').title(),
                        value=str(count),
                        inline=True
                    )
            else:
                embed.description = "No analytics data available yet"
            
            embed.set_footer(text=f"Showing last {len(events)} events")
            
            await interaction.response.send_message(embed=embed)
        except Exception as e:
            await interaction.response.send_message(f"❌ Failed to fetch analytics: {e}", ephemeral=True)

async def setup(bot):
    await bot.add_cog(Utility(bot))