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

const JOIN_SOUNDBOARD_SOUND_ID = '1325100051403505685';

let hasAttemptedReconnect = false;

module.exports = async function rejoinVoice(_readyClient, client) {
    if (hasAttemptedReconnect) {
        return;
    }

    hasAttemptedReconnect = true;

    for (const [guildId, channelId] of Object.entries(readVoiceChannels())) {
        try {
            const guild = await client.guilds.fetch(guildId);
            const channel = await guild.channels.fetch(channelId).catch(error => {
                if (error.code === 10003) {
                    return null;
                }

                throw error;
            });

            if (!channel) {
                console.log(
                    `[VOICE] No rejoin channel found for guild ${guildId}; cleared the saved channel.`
                );
                clearVoiceChannel(guildId);
                continue;
            }

            if (channel.type !== ChannelType.GuildVoice) {
                console.warn(
                    `[VOICE] Saved channel ${channelId} is no longer a voice channel.`
                );
                clearVoiceChannel(guildId);
                continue;
            }

            const permissions = channel.permissionsFor(guild.members.me);
            const requiredPermissions = [
                PermissionFlagsBits.Connect,
                PermissionFlagsBits.Speak,
                PermissionFlagsBits.UseSoundboard
            ];

            if (!permissions?.has(requiredPermissions)) {
                console.warn(
                    `[VOICE] Cannot rejoin ${channel.name} (${channel.id}): missing Connect, Speak, or Use Soundboard permission.`
                );
                continue;
            }

            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: guild.id,
                adapterCreator: guild.voiceAdapterCreator,
                selfDeaf: false
            });

            await entersState(
                connection,
                VoiceConnectionStatus.Ready,
                15_000
            );

            console.log(
                `[VOICE] Rejoined ${channel.name} (${channel.id}).`
            );

            try {
                await channel.sendSoundboardSound({
                    soundId: JOIN_SOUNDBOARD_SOUND_ID
                });
                console.log(
                    `[SOUNDBOARD] Played the join sound in ${channel.name} (${channel.id}).`
                );
            } catch (soundboardError) {
                console.error(
                    `[SOUNDBOARD] Failed to play ${JOIN_SOUNDBOARD_SOUND_ID} in ${channel.name} (${channel.id}):`,
                    soundboardError
                );
            } finally {
                if (!connection.rejoin({ selfDeaf: true })) {
                    console.error(
                        `[VOICE] Failed to self-deafen in ${channel.name} (${channel.id}).`
                    );
                }
            }
        } catch (error) {
            console.error(
                `[VOICE] Failed to rejoin saved channel ${channelId}:`,
                error
            );
        }
    }
};
