const {
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder
} = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');
const { clearVoiceChannel } = require('../../utils/voiceStateStore');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leavevc')
        .setDescription('Leaves the active voice channel in this server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
        .setDMPermission(false),

    async execute(interaction) {
        const connection = getVoiceConnection(interaction.guild.id);

        if (!connection) {
            clearVoiceChannel(interaction.guild.id);

            await interaction.reply({
                content: 'I am not connected to a voice channel in this server.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        connection.destroy();
        clearVoiceChannel(interaction.guild.id);

        await interaction.reply({
            content: 'Disconnected from the voice channel.',
            flags: MessageFlags.Ephemeral
        });
    }
};
