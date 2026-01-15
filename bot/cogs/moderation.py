import discord
from discord.ext import commands
from discord import app_commands
from datetime import timedelta
from typing import Optional

class Moderation(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
    
    @app_commands.command(name="ban", description="Ban a member from the server")
    @app_commands.default_permissions(ban_members=True)
    @app_commands.describe(
        member="The member to ban",
        reason="Reason for the ban"
    )
    async def ban(
        self,
        interaction: discord.Interaction,
        member: discord.Member,
        reason: Optional[str] = "No reason provided"
    ):
        try:
            await member.ban(reason=f"{reason} (by {interaction.user})")
            await self.bot.db.log_event(
                interaction.guild.id,
                "moderation_ban",
                f"User {member.id} banned by {interaction.user.id}"
            )
            
            embed = discord.Embed(
                title="✓ Member Banned",
                description=f"{member.mention} has been banned",
                color=discord.Color.red()
            )
            embed.add_field(name="Reason", value=reason, inline=False)
            embed.add_field(name="Moderator", value=interaction.user.mention, inline=False)
            await interaction.response.send_message(embed=embed)
        except Exception as e:
            await interaction.response.send_message(f"❌ Failed to ban member: {e}", ephemeral=True)
    
    @app_commands.command(name="kick", description="Kick a member from the server")
    @app_commands.default_permissions(kick_members=True)
    @app_commands.describe(
        member="The member to kick",
        reason="Reason for the kick"
    )
    async def kick(
        self,
        interaction: discord.Interaction,
        member: discord.Member,
        reason: Optional[str] = "No reason provided"
    ):
        try:
            await member.kick(reason=f"{reason} (by {interaction.user})")
            await self.bot.db.log_event(
                interaction.guild.id,
                "moderation_kick",
                f"User {member.id} kicked by {interaction.user.id}"
            )
            
            embed = discord.Embed(
                title="✓ Member Kicked",
                description=f"{member.mention} has been kicked",
                color=discord.Color.orange()
            )
            embed.add_field(name="Reason", value=reason, inline=False)
            embed.add_field(name="Moderator", value=interaction.user.mention, inline=False)
            await interaction.response.send_message(embed=embed)
        except Exception as e:
            await interaction.response.send_message(f"❌ Failed to kick member: {e}", ephemeral=True)
    
    @app_commands.command(name="timeout", description="Timeout a member")
    @app_commands.default_permissions(moderate_members=True)
    @app_commands.describe(
        member="The member to timeout",
        duration="Duration in minutes",
        reason="Reason for the timeout"
    )
    async def timeout(
        self,
        interaction: discord.Interaction,
        member: discord.Member,
        duration: int,
        reason: Optional[str] = "No reason provided"
    ):
        try:
            await member.timeout(
                timedelta(minutes=duration),
                reason=f"{reason} (by {interaction.user})"
            )
            await self.bot.db.log_event(
                interaction.guild.id,
                "moderation_timeout",
                f"User {member.id} timed out for {duration}m by {interaction.user.id}"
            )
            
            embed = discord.Embed(
                title="✓ Member Timed Out",
                description=f"{member.mention} has been timed out",
                color=discord.Color.yellow()
            )
            embed.add_field(name="Duration", value=f"{duration} minutes", inline=False)
            embed.add_field(name="Reason", value=reason, inline=False)
            embed.add_field(name="Moderator", value=interaction.user.mention, inline=False)
            await interaction.response.send_message(embed=embed)
        except Exception as e:
            await interaction.response.send_message(f"❌ Failed to timeout member: {e}", ephemeral=True)
    
    @app_commands.command(name="purge", description="Delete multiple messages")
    @app_commands.default_permissions(manage_messages=True)
    @app_commands.describe(amount="Number of messages to delete (1-100)")
    async def purge(self, interaction: discord.Interaction, amount: int):
        if amount < 1 or amount > 100:
            await interaction.response.send_message("❌ Amount must be between 1 and 100", ephemeral=True)
            return
        
        try:
            await interaction.response.defer(ephemeral=True)
            deleted = await interaction.channel.purge(limit=amount)
            await self.bot.db.log_event(
                interaction.guild.id,
                "moderation_purge",
                f"{len(deleted)} messages purged in {interaction.channel.id} by {interaction.user.id}"
            )
            await interaction.followup.send(f"✓ Deleted {len(deleted)} messages", ephemeral=True)
        except Exception as e:
            await interaction.followup.send(f"❌ Failed to purge messages: {e}", ephemeral=True)
    
    @app_commands.command(name="warn", description="Warn a member")
    @app_commands.default_permissions(moderate_members=True)
    @app_commands.describe(
        member="The member to warn",
        reason="Reason for the warning"
    )
    async def warn(
        self,
        interaction: discord.Interaction,
        member: discord.Member,
        reason: str
    ):
        try:
            warn_id = await self.bot.db.add_warn(
                interaction.guild.id,
                member.id,
                interaction.user.id,
                reason
            )
            
            warns = await self.bot.db.get_warns(interaction.guild.id, member.id)
            warn_count = len(warns)
            
            await self.bot.db.log_event(
                interaction.guild.id,
                "moderation_warn",
                f"User {member.id} warned by {interaction.user.id}"
            )
            
            embed = discord.Embed(
                title="⚠️ Member Warned",
                description=f"{member.mention} has been warned",
                color=discord.Color.gold()
            )
            embed.add_field(name="Reason", value=reason, inline=False)
            embed.add_field(name="Total Warnings", value=str(warn_count), inline=False)
            embed.add_field(name="Moderator", value=interaction.user.mention, inline=False)
            embed.set_footer(text=f"Warning ID: {warn_id}")
            
            await interaction.response.send_message(embed=embed)
            
            try:
                dm_embed = discord.Embed(
                    title=f"⚠️ Warning from {interaction.guild.name}",
                    description=f"You have been warned",
                    color=discord.Color.gold()
                )
                dm_embed.add_field(name="Reason", value=reason, inline=False)
                dm_embed.add_field(name="Total Warnings", value=str(warn_count), inline=False)
                await member.send(embed=dm_embed)
            except:
                pass
        except Exception as e:
            await interaction.response.send_message(f"❌ Failed to warn member: {e}", ephemeral=True)
    
    @app_commands.command(name="warnings", description="View warnings for a member")
    @app_commands.default_permissions(moderate_members=True)
    @app_commands.describe(member="The member to check warnings for")
    async def warnings(self, interaction: discord.Interaction, member: discord.Member):
        try:
            warns = await self.bot.db.get_warns(interaction.guild.id, member.id)
            
            if not warns:
                await interaction.response.send_message(
                    f"{member.mention} has no warnings",
                    ephemeral=True
                )
                return
            
            embed = discord.Embed(
                title=f"⚠️ Warnings for {member.display_name}",
                color=discord.Color.gold()
            )
            
            for warn in warns[:10]:
                moderator = interaction.guild.get_member(warn['moderator_id'])
                mod_mention = moderator.mention if moderator else f"<@{warn['moderator_id']}>"
                
                embed.add_field(
                    name=f"Warning #{warn['id']}",
                    value=f"**Reason:** {warn['reason']}\n**By:** {mod_mention}\n**Date:** {warn['created_at']}",
                    inline=False
                )
            
            embed.set_footer(text=f"Total warnings: {len(warns)}")
            await interaction.response.send_message(embed=embed, ephemeral=True)
        except Exception as e:
            await interaction.response.send_message(f"❌ Failed to fetch warnings: {e}", ephemeral=True)
    
    @app_commands.command(name="clearwarn", description="Remove a warning")
    @app_commands.default_permissions(moderate_members=True)
    @app_commands.describe(warn_id="The ID of the warning to remove")
    async def clearwarn(self, interaction: discord.Interaction, warn_id: int):
        try:
            success = await self.bot.db.remove_warn(warn_id)
            if success:
                await interaction.response.send_message(f"✓ Warning #{warn_id} has been removed", ephemeral=True)
            else:
                await interaction.response.send_message(f"❌ Warning #{warn_id} not found", ephemeral=True)
        except Exception as e:
            await interaction.response.send_message(f"❌ Failed to remove warning: {e}", ephemeral=True)

async def setup(bot):
    await bot.add_cog(Moderation(bot))