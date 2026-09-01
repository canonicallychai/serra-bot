const {
    ChannelType,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder
} = require('discord.js');
const {
    entersState,
    joinVoiceChannel,
    VoiceConnectionStatus
} = require('@discordjs/voice');
const { saveVoiceChannel } = require('../../utils/voiceStateStore');
const { setSelfDeaf } = require('../../utils/voiceDeafState');

const JOIN_SOUNDBOARD_SOUND_ID = '1325100051403505685';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('joinvc')
        .setDescription('Joins a voice channel.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false)
        .addStringOption(option =>
            option
                .setName('vc_id')
                .setDescription('The voice channel ID. Defaults to your current channel.')
                .setMinLength(17)
                .setMaxLength(20)
                .setRequired(false)
        ),

    async execute(interaction) {
        const channelId = interaction.options.getString('vc_id')?.trim();

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        let channel;

        if (channelId) {
            if (!/^\d{17,20}$/.test(channelId)) {
                await interaction.editReply(
                    'That is not a valid Discord channel ID.'
                );
                return;
            }

            channel = await interaction.guild.channels
                .fetch(channelId)
                .catch(() => null);

            if (!channel || channel.type !== ChannelType.GuildVoice) {
                await interaction.editReply(
                    'That ID does not belong to a voice channel in this server.'
                );
                return;
            }
        } else {
            channel = interaction.member?.voice?.channel;

            if (!channel || channel.type !== ChannelType.GuildVoice) {
                await interaction.editReply(
                    'AUTORESPONSE // No active voice signal detected. Join a voice channel and try again.'
                );
                return;
            }
        }

        const botMember = interaction.guild.members.me;
        const permissions = channel.permissionsFor(botMember);

        const requiredPermissions = [
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak,
            PermissionFlagsBits.UseSoundboard
        ];

        if (!permissions?.has(requiredPermissions)) {
            await interaction.editReply(
                `AUTORESPONSE // Unable to enter ${channel}. Connect, Speak, and Use Soundboard access are required.`
            );
            return;
        }

        if (!channel.joinable) {
            await interaction.editReply(
                `AUTORESPONSE // Unable to enter ${channel}. The voice channel is not currently accessible.`
            );
            return;
        }

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator,
            selfDeaf: false
        });

        try {
            await entersState(
                connection,
                VoiceConnectionStatus.Ready,
                15_000
            );

            saveVoiceChannel(interaction.guild.id, channel.id);

            try {
                await channel.sendSoundboardSound({
                    soundId: JOIN_SOUNDBOARD_SOUND_ID
                });
                await interaction.editReply(
                    `Joined ${channel} and played the join sound.`
                );
            } catch (soundboardError) {
                console.error(
                    `[SOUNDBOARD] Failed to play ${JOIN_SOUNDBOARD_SOUND_ID} in ${channel.name} (${channel.id}):`,
                    soundboardError
                );

                await interaction.editReply(
                    `Joined ${channel}, but I could not play the join sound. Make sure that sound belongs to this server and is available.`
                );
            } finally {
                await setSelfDeaf(connection, interaction.guild, true)
                    .catch(error => {
                        console.error(
                            `[VOICE] Failed to self-deafen in ${channel.name} (${channel.id}):`,
                            error
                        );
                    });
            }
        } catch (error) {
            connection.destroy();

            console.error(
                `[VOICE] Failed to join ${channel.name} (${channel.id}):`,
                error
            );

            await interaction.editReply(
                `AUTORESPONSE // Connection to ${channel} failed. Check channel access and try again.`
            );
        }
    }
};
