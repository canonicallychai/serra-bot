require('dotenv').config();

const { REST, Routes } = require('discord.js');

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

async function clearCommands() {
    try {
        console.log('Clearing guild commands...');

        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),
            { body: [] }
        );

        console.log('Guild commands cleared.');

        console.log('Clearing global commands...');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: [] }
        );

        console.log('Global commands cleared.');
    } catch (error) {
        console.error('Failed to clear commands:', error);
    }
}

clearCommands();