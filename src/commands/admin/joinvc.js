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

        if (!permissions?.has(PermissionFlagsBits.Connect)) {
            await interaction.editReply(
                `I do not have permission to connect to ${channel}.`
            );
            return;
        }

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator,
            selfDeaf: true
        });

        try {
            await entersState(
                connection,
                VoiceConnectionStatus.Ready,
                15_000
            );

            saveVoiceChannel(interaction.guild.id, channel.id);
            await interaction.editReply(`Joined ${channel}.`);
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
