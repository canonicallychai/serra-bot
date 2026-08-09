const { SlashCommandBuilder } = require('discord.js');

const TEAL = '\u001b[2;36m';
const MAGENTA = '\u001b[2;35m';
const RESET = '\u001b[0m';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('members')
        .setDescription('Reports the number of active simulations.')
        .setDMPermission(false),

    async execute(interaction) {
        const memberCount = interaction.guild.memberCount.toLocaleString();

        const output = [
            '```ansi',
            `${TEAL}THE TRENCH // SIMULATION STATUS`,
            '',
            `ACTIVE SIMULATIONS :: ${MAGENTA}${memberCount}${TEAL}`,
            '',
            `STATUS             :: ${MAGENTA}SIGNALS STABLE${RESET}`,
            '```'
        ].join('\n');

        await interaction.reply({ content: output });
    }
};
