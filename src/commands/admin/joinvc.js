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

const JOIN_SOUNDBOARD_SOUND_ID = '1325100051403505685';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('joinvc')
        .setDescription('Joins a voice channel by its ID.')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
        .setDMPermission(false)
        .addStringOption(option =>
            option
                .setName('vc_id')
                .setDescription('The ID of the voice channel to join.')
                .setMinLength(17)
                .setMaxLength(20)
                .setRequired(true)
        ),

    async execute(interaction) {
        const channelId = interaction.options
            .getString('vc_id', true)
            .trim();

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        if (!/^\d{17,20}$/.test(channelId)) {
            await interaction.editReply(
                'That is not a valid Discord channel ID.'
            );
            return;
        }

        const channel = await interaction.guild.channels
            .fetch(channelId)
            .catch(() => null);

        if (!channel || channel.type !== ChannelType.GuildVoice) {
            await interaction.editReply(
                'That ID does not belong to a voice channel in this server.'
            );
            return;
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
                `I need the Connect, Speak, and Use Soundboard permissions in ${channel}.`
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
                if (!connection.rejoin({ selfDeaf: true })) {
                    console.error(
                        `[VOICE] Failed to self-deafen in ${channel.name} (${channel.id}).`
                    );
                }
            }
        } catch (error) {
            connection.destroy();

            console.error(
                `[VOICE] Failed to join ${channel.name} (${channel.id}):`,
                error
            );

            await interaction.editReply(
                `I could not connect to ${channel}. Check my permissions and try again.`
            );
        }
    }
};
