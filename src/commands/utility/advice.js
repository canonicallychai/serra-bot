const { SlashCommandBuilder } = require('discord.js');

const ADVICE_API_URL = 'https://api.adviceslip.com/advice';

const TEAL = '\u001b[2;36m';
const MAGENTA = '\u001b[2;35m';
const RESET = '\u001b[0m';

function cleanText(value) {
    return String(value)
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/`/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('advice')
        .setDescription('Retrieves a directive from The Trench archives.'),

    async execute(interaction) {
        await interaction.deferReply();

        const response = await fetch(ADVICE_API_URL, {
            headers: {
                Accept: 'application/json',
                'User-Agent': 'serra-bot/1.0 (Discord bot)'
            },
            signal: AbortSignal.timeout(10_000)
        });

        if (!response.ok) {
            throw new Error(
                `Advice Slip returned ${response.status} ${response.statusText}`
            );
        }

        const data = await response.json();
        const advice = cleanText(data.slip?.advice || '');
        const slipId = data.slip?.id ?? data.slip?.slip_id;

        if (!advice || slipId === undefined) {
            throw new Error('Advice Slip returned an invalid response.');
        }

        const output = [
            '```ansi',
            `${TEAL}THE TRENCH // RECOVERED DIRECTIVE`,
            '',
            `ARCHIVE ENTRY :: ${MAGENTA}${slipId}${TEAL}`,
            '',
            `${MAGENTA}${advice}${TEAL}`,
            '',
            `SIGNAL STATUS :: ${MAGENTA}DECRYPTED // VERIFIED${RESET}`,
            '```'
        ].join('\n');

        await interaction.editReply(output);
    }
};
