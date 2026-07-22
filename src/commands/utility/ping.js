const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Displays the current gateway latency.'),

    async execute(interaction, client) {
        const sent = await interaction.reply({
            content: 'Pinging SHARKSYS...',
            fetchReply: true
        });

        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiPing = Math.round(client.ws.ping);

        await interaction.editReply(
            `🏓 **S.E.R.R.A Status**\n` +
            `Gateway: **${latency}ms**\n` +
            `API: **${apiPing}ms**`
        );
    }
};