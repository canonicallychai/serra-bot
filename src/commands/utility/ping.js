const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Displays the current gateway latency.'),

    async execute(interaction, client) {
        await interaction.reply({
            content: 'Pinging SHARKSYS...'
        });

        const sent = await interaction.fetchReply();
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiPing = Math.round(client.ws.ping);

        await interaction.editReply(
            `\
            \`\`\`
            ╔══════════════════════════════╗
            ║      S.E.R.R.A STATUS        ║
            ╠══════════════════════════════╣
            ║ Gateway : ${latency} ms
            ║ API     : ${apiPing} ms
            ╚══════════════════════════════╝
            \`\`\``
        );
    }
};