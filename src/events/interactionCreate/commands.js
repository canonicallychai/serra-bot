const { MessageFlags } = require('discord.js');

module.exports = async function commands(interaction, client) {
    if (!interaction.isChatInputCommand()) {
        return;
    }

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(
            `[INTERACTION] No command found for /${interaction.commandName}`
        );

        return;
    }

    try {
        await command.execute(interaction, client);
    } catch (error) {
        console.error(
            `[INTERACTION] Failed to execute /${interaction.commandName}:`,
            error
        );

        const response = {
            content: 'An internal processing error occurred.',
            flags: MessageFlags.Ephemeral
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(response);
        } else {
            await interaction.reply(response);
        }
    }
};