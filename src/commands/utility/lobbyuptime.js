const {
    ChannelType,
    SlashCommandBuilder
} = require('discord.js');
const {
    formatDuration,
    formatRuntime,
    requestVoiceStartTime
} = require('./vctime');
const {
    LOBBY_RECORD_MS,
    LOBBY_VOICE_CHANNEL_ID,
    saveLobbyUptime
} = require('../../utils/lobbyUptimeStore');

const PROGRESS_BAR_LENGTH = 20;

const TEAL = '\u001b[2;36m';
const MAGENTA = '\u001b[2;35m';
const RESET = '\u001b[0m';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lobbyuptime')
        .setDescription('Reports the uptime of The Trench voice lobby.')
        .setDMPermission(false),

    async execute(interaction, client) {
        await interaction.deferReply();

        const channel = await interaction.guild.channels
            .fetch(LOBBY_VOICE_CHANNEL_ID)
            .catch(() => null);

        if (!channel || channel.type !== ChannelType.GuildVoice) {
            await interaction.editReply(
                'AUTORESPONSE // The Trench voice signal could not be located.'
            );
            return;
        }

        try {
            const startTime = await requestVoiceStartTime(
                client,
                interaction.guild,
                channel.id
            );

            if (!startTime) {
                saveLobbyUptime({
                    channelId: LOBBY_VOICE_CHANNEL_ID,
                    active: false,
                    updatedAt: Math.floor(Date.now() / 1_000)
                });

                await interaction.editReply(
                    'AUTORESPONSE // The Trench has no active voice session.'
                );
                return;
            }

            const runtimeMs = Math.max(
                0,
                Date.now() - (startTime * 1_000)
            );
            const timeUntilRecordMs = Math.max(0, LOBBY_RECORD_MS - runtimeMs);
            const progress = Math.min(1, runtimeMs / LOBBY_RECORD_MS);
            const filledSegments = Math.floor(
                progress * PROGRESS_BAR_LENGTH
            );
            const emptySegments = PROGRESS_BAR_LENGTH - filledSegments;
            const progressPercent = (progress * 100).toFixed(1);
            const recordCountdown = timeUntilRecordMs > 0
                ? `${formatDuration(timeUntilRecordMs)} remaining`
                : 'RECORD SURPASSED';
            const longestUptime = formatDuration(LOBBY_RECORD_MS);
            const progressBar = [
                MAGENTA,
                '[',
                '█'.repeat(filledSegments),
                TEAL,
                '░'.repeat(emptySegments),
                `] ${MAGENTA}${progressPercent}%${TEAL}`
            ].join('');

            saveLobbyUptime({
                channelId: LOBBY_VOICE_CHANNEL_ID,
                active: true,
                voiceStartTime: startTime,
                runtimeSeconds: Math.floor(runtimeMs / 1_000),
                recordSeconds: Math.floor(LOBBY_RECORD_MS / 1_000),
                remainingSeconds: Math.floor(timeUntilRecordMs / 1_000),
                progress: Number(progress.toFixed(6)),
                updatedAt: Math.floor(Date.now() / 1_000)
            });

            const output = [
                '```ansi',
                `${TEAL}THE TRENCH // LOBBY UPTIME`,
                '',
                `${MAGENTA}CURRENT SESSION${TEAL}`,
                `RUNTIME :: ${MAGENTA}${formatRuntime(startTime)}${TEAL}`,
                '',
                `${MAGENTA}UPTIME RECORD${TEAL}`,
                `TARGET  :: ${MAGENTA}${longestUptime}${TEAL}`,
                'PROGRESS',
                progressBar,
                `${MAGENTA}${recordCountdown}${TEAL}`,
                '',
                `SYSTEM STATUS :: ${MAGENTA}SIGNAL ACTIVE${RESET}`,
                '```'
            ].join('\n');

            await interaction.editReply(output);
        } catch (error) {
            console.error(
                `[LOBBY UPTIME] Failed to retrieve runtime for ${channel.name} (${channel.id}):`,
                error
            );

            await interaction.editReply(
                'AUTORESPONSE // Voice session telemetry is currently unavailable.'
            );
        }
    }
};
