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
const { setSelfDeaf } = require('../../utils/voiceDeafState');

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
                clearVoiceChannel(guildId);
                continue;
            }

            if (channel.type !== ChannelType.GuildVoice) {
                console.error(
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
                console.error(
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

            try {
                await channel.sendSoundboardSound({
                    soundId: JOIN_SOUNDBOARD_SOUND_ID
                });
            } catch (soundboardError) {
                console.error(
                    `[SOUNDBOARD] Failed to play ${JOIN_SOUNDBOARD_SOUND_ID} in ${channel.name} (${channel.id}):`,
                    soundboardError
                );
            } finally {
                await setSelfDeaf(connection, guild, true)
                    .catch(error => {
                        console.error(
                            `[VOICE] Failed to self-deafen in ${channel.name} (${channel.id}):`,
                            error
                        );
                    });
            }
        } catch (error) {
            console.error(
                `[VOICE] Failed to rejoin saved channel ${channelId}:`,
                error
            );
        }
    }
};
