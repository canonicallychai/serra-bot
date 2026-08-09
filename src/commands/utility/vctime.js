const {
    ChannelType,
    Events,
    GatewayDispatchEvents,
    GatewayOpcodes,
    GatewayRequestChannelInfoField,
    MessageFlags,
    SlashCommandBuilder
} = require('discord.js');

const TEAL = '\u001b[2;36m';
const MAGENTA = '\u001b[2;35m';
const RESET = '\u001b[0m';

const RESPONSE_TIMEOUT_MS = 5_000;

const SECOND_MS = 1_000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MONTH_MS = 30 * DAY_MS;

function requestVoiceStartTime(client, guild, channelId) {
    return new Promise((resolve, reject) => {
        const shard = client.ws.shards.get(guild.shardId);

        if (!shard) {
            reject(new Error(`Gateway shard ${guild.shardId} is unavailable.`));
            return;
        }

        const cleanup = () => {
            clearTimeout(timeout);
            client.off(Events.Raw, handlePacket);
        };

        const handlePacket = packet => {
            if (
                packet.t !== GatewayDispatchEvents.ChannelInfo ||
                packet.d.guild_id !== guild.id
            ) {
                return;
            }

            const channelInfo = packet.d.channels.find(
                channel => channel.id === channelId
            );

            if (!channelInfo) {
                return;
            }

            cleanup();
            resolve(channelInfo.voice_start_time ?? null);
        };

        const timeout = setTimeout(() => {
            client.off(Events.Raw, handlePacket);
            reject(new Error('Discord did not return channel information in time.'));
        }, RESPONSE_TIMEOUT_MS);

        client.on(Events.Raw, handlePacket);

        try {
            shard.send({
                op: GatewayOpcodes.RequestChannelInfo,
                d: {
                    guild_id: guild.id,
                    fields: [GatewayRequestChannelInfoField.VoiceStartTime]
                }
            });
        } catch (error) {
            cleanup();
            reject(error);
        }
    });
}

function formatDuration(durationMs) {
    let remaining = Math.max(0, durationMs);

    const months = Math.floor(remaining / MONTH_MS);
    remaining %= MONTH_MS;

    const days = Math.floor(remaining / DAY_MS);
    remaining %= DAY_MS;

    const hours = Math.floor(remaining / HOUR_MS);
    remaining %= HOUR_MS;

    const minutes = Math.floor(remaining / MINUTE_MS);
    remaining %= MINUTE_MS;

    const seconds = Math.floor(remaining / SECOND_MS);
    const pad = value => String(value).padStart(2, '0');

    const units = [
        { value: months, label: 'months' },
        { value: days, label: 'days' },
        { value: hours, label: 'hours' },
        { value: minutes, label: 'minutes' },
        { value: seconds, label: 'seconds' }
    ];

    const firstActiveUnit = units.findIndex(unit => unit.value > 0);
    const visibleUnits = firstActiveUnit === -1
        ? units.slice(-1)
        : units.slice(firstActiveUnit);

    return visibleUnits
        .map(unit => `${pad(unit.value)} ${unit.label}`)
        .join(' ');
}

function formatRuntime(startTimeSeconds) {
    return formatDuration(
        Date.now() - (startTimeSeconds * SECOND_MS)
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vctime')
        .setDescription('Reports the runtime of your active voice simulation.')
        .setDMPermission(false),

    async execute(interaction, client) {
        const channel = interaction.member?.voice?.channel;

        if (!channel || channel.type !== ChannelType.GuildVoice) {
            await interaction.reply({
                content: 'AUTORESPONSE // No active voice signal detected. Join a voice channel and try again.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        await interaction.deferReply();

        try {
            const startTime = await requestVoiceStartTime(
                client,
                interaction.guild,
                channel.id
            );

            if (!startTime) {
                await interaction.editReply(
                    'AUTORESPONSE // Voice signal detected, but no active session timer was found.'
                );
                return;
            }

            const output = [
                '```ansi',
                `${TEAL}THE TRENCH // SUBJECT VOICE SESSION`,
                '',
                `RUNTIME :: ${MAGENTA}${formatRuntime(startTime)}${TEAL}`,
                '',
                `STATUS  :: ${MAGENTA}SIGNAL ACTIVE${RESET}`,
                '```'
            ].join('\n');

            await interaction.editReply(output);
        } catch (error) {
            console.error(
                `[VCTIME] Failed to retrieve runtime for ${channel.name} (${channel.id}):`,
                error
            );

            await interaction.editReply(
                'AUTORESPONSE // Voice session telemetry is currently unavailable.'
            );
        }
    },
    formatDuration,
    formatRuntime,
    requestVoiceStartTime
};
