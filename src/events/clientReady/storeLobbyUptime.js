const { ChannelType } = require('discord.js');
const { requestVoiceStartTime } = require('../../commands/utility/vctime');
const {
    LOBBY_RECORD_MS,
    LOBBY_VOICE_CHANNEL_ID,
    saveLobbyUptime
} = require('../../utils/lobbyUptimeStore');

const SNAPSHOT_INTERVAL_MS = 60 * 60 * 1_000;

let hasStarted = false;

async function updateLobbyUptime(client) {
    const updatedAt = Math.floor(Date.now() / 1_000);
    const channel = await client.channels
        .fetch(LOBBY_VOICE_CHANNEL_ID)
        .catch(() => null);

    if (!channel || channel.type !== ChannelType.GuildVoice) {
        saveLobbyUptime({
            channelId: LOBBY_VOICE_CHANNEL_ID,
            active: false,
            status: 'channel_unavailable',
            updatedAt
        });
        return;
    }

    try {
        const startTime = await requestVoiceStartTime(
            client,
            channel.guild,
            channel.id
        );

        if (!startTime) {
            saveLobbyUptime({
                channelId: LOBBY_VOICE_CHANNEL_ID,
                active: false,
                updatedAt
            });
            return;
        }

        const runtimeMs = Math.max(0, Date.now() - (startTime * 1_000));
        const remainingMs = Math.max(0, LOBBY_RECORD_MS - runtimeMs);

        saveLobbyUptime({
            channelId: LOBBY_VOICE_CHANNEL_ID,
            active: true,
            voiceStartTime: startTime,
            runtimeSeconds: Math.floor(runtimeMs / 1_000),
            recordSeconds: Math.floor(LOBBY_RECORD_MS / 1_000),
            remainingSeconds: Math.floor(remainingMs / 1_000),
            progress: Number(
                Math.min(1, runtimeMs / LOBBY_RECORD_MS).toFixed(6)
            ),
            updatedAt: Math.floor(Date.now() / 1_000)
        });

    } catch (error) {
        saveLobbyUptime({
            channelId: LOBBY_VOICE_CHANNEL_ID,
            active: false,
            status: 'telemetry_unavailable',
            updatedAt: Math.floor(Date.now() / 1_000)
        });
        console.error('[LOBBY UPTIME] Hourly snapshot failed:', error);
    }
}

module.exports = async function storeLobbyUptime(_readyClient, client) {
    if (hasStarted) {
        return;
    }

    hasStarted = true;

    await updateLobbyUptime(client);

    const interval = setInterval(() => {
        updateLobbyUptime(client).catch(error => {
            console.error('[LOBBY UPTIME] Unexpected snapshot error:', error);
        });
    }, SNAPSHOT_INTERVAL_MS);

    interval.unref();
};
