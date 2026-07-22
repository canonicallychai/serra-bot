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

        const output = [
    "```ansi",
    "\u001b[2;36mS.E.R.R.A // DIAGNOSTICS",
    "",
    `RTT    :: \u001b[2;35m${latency}ms\u001b[2;36m`,
    `API    :: \u001b[2;35m${apiPing}ms\u001b[2;36m`,
    "",
    "STATUS :: \u001b[2;35mREADY\u001b[0m",
    "```"
].join("\n");

await interaction.editReply(output);
    }
};