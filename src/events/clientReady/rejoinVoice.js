const {
    ChannelType,
    PermissionFlagsBits
} = require('discord.js');
const {
    entersState,
    joinVoiceChannel,
    VoiceConnectionStatus
} = require('@discordjs/voice');
const {
    clearVoiceChannel,
    readVoiceChannels
} = require('../../utils/voiceStateStore');

let hasAttemptedReconnect = false;

module.exports = async function rejoinVoice(_readyClient, client) {
    if (hasAttemptedReconnect) {
        return;
    }

    hasAttemptedReconnect = true;

    for (const [guildId, channelId] of Object.entries(readVoiceChannels())) {
        try {
            const guild = await client.guilds.fetch(guildId);
            const channel = await guild.channels.fetch(channelId);

            if (!channel || channel.type !== ChannelType.GuildVoice) {
                console.warn(
                    `[VOICE] Saved channel ${channelId} is no longer a voice channel.`
                );
                clearVoiceChannel(guildId);
                continue;
            }

            const permissions = channel.permissionsFor(guild.members.me);

            if (!permissions?.has(PermissionFlagsBits.Connect)) {
                console.warn(
                    `[VOICE] Cannot rejoin ${channel.name} (${channel.id}): missing Connect permission.`
                );
                continue;
            }

            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: guild.id,
                adapterCreator: guild.voiceAdapterCreator,
                selfDeaf: true
            });

            await entersState(
                connection,
                VoiceConnectionStatus.Ready,
                15_000
            );

            console.log(
                `[VOICE] Rejoined ${channel.name} (${channel.id}).`
            );
        } catch (error) {
            console.error(
                `[VOICE] Failed to rejoin saved channel ${channelId}:`,
                error
            );
        }
    }
};
