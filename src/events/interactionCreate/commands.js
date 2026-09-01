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

    const startedAt = Date.now();
    const context =
        `command=/${interaction.commandName} ` +
        `user=${interaction.user.id} ` +
        `guild=${interaction.guildId ?? 'DM'} ` +
        `channel=${interaction.channelId ?? 'unknown'}`;

    console.log(`[COMMAND] Started ${context}.`);

    try {
        await command.execute(interaction, client);

        console.log(
            `[COMMAND] Completed ${context} durationMs=${Date.now() - startedAt}.`
        );
    } catch (error) {
        console.error(
            `[COMMAND] Failed ${context} durationMs=${Date.now() - startedAt}:`,
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
