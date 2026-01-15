import discord
from discord.ext import commands
from discord import app_commands
from typing import Optional

class Tickets(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
    
    @app_commands.command(name="ticket", description="Create a support ticket")
    @app_commands.describe(reason="Reason for creating the ticket")
    async def ticket(self, interaction: discord.Interaction, reason: Optional[str] = "No reason provided"):
        await interaction.response.send_message(
            "❌ Ticket is not activated on this server",
            ephemeral=True
        )
    
    @app_commands.command(name="closeticket", description="Close a support ticket")
    async def closeticket(self, interaction: discord.Interaction):
        await interaction.response.send_message(
            "❌ Ticket is not activated on this server",
            ephemeral=True
        )
    
    @app_commands.command(name="setuptickets", description="Configure ticket system")
    async def setuptickets(self, interaction: discord.Interaction):
        await interaction.response.send_message(
            "❌ Ticket is not activated on this server",
            ephemeral=True
        )

async def setup(bot):
    await bot.add_cog(Tickets(bot))