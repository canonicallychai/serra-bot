const {
    EmbedBuilder,
    SlashCommandBuilder
} = require('discord.js');

const INATURALIST_API_URL = 'https://api.inaturalist.org/v1/observations';
const SHARK_TAXON_ID = '551307';
const PHOTO_LICENSES = 'cc0,cc-by,cc-by-sa';

const TEAL = '\u001b[2;36m';
const MAGENTA = '\u001b[2;35m';
const RESET = '\u001b[0m';

function getLargePhotoUrl(photo) {
    return photo.medium_url || photo.url.replace('/square.', '/large.');
}

function cleanText(value, maxLength = 200) {
    return String(value)
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shark')
        .setDescription('Shows a random shark observation and its information.'),

    async execute(interaction) {
        await interaction.deferReply();

        const query = new URLSearchParams({
            taxon_id: SHARK_TAXON_ID,
            quality_grade: 'research',
            photos: 'true',
            captive: 'false',
            photo_license: PHOTO_LICENSES,
            order_by: 'random',
            per_page: '30'
        });

        const response = await fetch(`${INATURALIST_API_URL}?${query}`, {
            headers: {
                'User-Agent': 'serra-bot/1.0 (Discord bot)'
            },
            signal: AbortSignal.timeout(10_000)
        });

        if (!response.ok) {
            throw new Error(
                `iNaturalist returned ${response.status} ${response.statusText}`
            );
        }

        const data = await response.json();
        const observations = data.results.filter(
            observation => observation.taxon && observation.photos.length > 0
        );

        if (observations.length === 0) {
            await interaction.editReply(
                'No licensed shark observations are available right now.'
            );
            return;
        }

        const observation = observations[
            Math.floor(Math.random() * observations.length)
        ];
        const taxon = observation.taxon;
        const photo = observation.photos[0];
        const commonName = taxon.preferred_common_name || taxon.name;
        const observedOn = observation.observed_on || 'Unknown';
        const location = observation.place_guess || 'Location not provided';
        const attribution = photo.attribution || 'Attribution unavailable';

        const description = [
            '```ansi',
            `${TEAL}THE TRENCH // SPECIMEN ARCHIVE`,
            '',
            `${MAGENTA}SUBJECT IDENTIFIED${TEAL}`,
            `COMMON NAME    :: ${MAGENTA}${cleanText(commonName)}${TEAL}`,
            `CLASSIFICATION :: ${MAGENTA}${cleanText(taxon.name)}${TEAL}`,
            '',
            `${MAGENTA}ENCOUNTER RECORD${TEAL}`,
            `OBSERVED       :: ${MAGENTA}${cleanText(observedOn)}${TEAL}`,
            `LOCATION       :: ${MAGENTA}${cleanText(location)}${TEAL}`,
            '',
            `ARCHIVE STATUS :: ${MAGENTA}RESEARCH GRADE // VERIFIED${RESET}`,
            '```'
        ].join('\n');

        const embed = new EmbedBuilder()
            .setDescription(description)
            .setImage(getLargePhotoUrl(photo))
            .setFooter({ text: cleanText(attribution, 500) });

        await interaction.editReply({ embeds: [embed] });
    }
};
