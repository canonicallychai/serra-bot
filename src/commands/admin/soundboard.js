const {
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder
} = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');
const { setSelfDeaf } = require('../../utils/voiceDeafState');

const DEFAULT_SOUNDBOARD_SOUND_ID = '1325100051403505685';
const activeGuilds = new Set();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('soundboard')
        .setDescription('Plays a soundboard sound in the active voice channel.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false)
        .addStringOption(option =>
            option
                .setName('sound_id')
                .setDescription('The soundboard sound ID. Defaults to the join sound.')
                .setMinLength(17)
                .setMaxLength(20)
                .setRequired(false)
        ),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const soundId = interaction.options.getString('sound_id')?.trim()
            ?? DEFAULT_SOUNDBOARD_SOUND_ID;
        const connection = getVoiceConnection(guildId);
        const channel = interaction.guild.members.me?.voice.channel;

        if (!/^\d{17,20}$/.test(soundId)) {
            await interaction.reply({
                content: 'That is not a valid Discord soundboard sound ID.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        if (!connection || !channel) {
            await interaction.reply({
                content: 'AUTORESPONSE // No active voice connection. Use /joinvc first.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        if (activeGuilds.has(guildId)) {
            await interaction.reply({
                content: 'AUTORESPONSE // A soundboard sound is already being transmitted in this server.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        activeGuilds.add(guildId);

        try {
            await interaction.deferReply({
                flags: MessageFlags.Ephemeral
            });

            await setSelfDeaf(connection, interaction.guild, false);
            await channel.sendSoundboardSound({ soundId });
            await interaction.editReply(`Played soundboard sound \`${soundId}\` in ${channel}.`);
        } catch (error) {
            console.error(
                `[SOUNDBOARD] Failed to play ${soundId} in guild ${guildId}:`,
                error
            );

            const response =
                'AUTORESPONSE // Soundboard playback failed. Check the sound ID and voice-channel permissions.';

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(response);
            } else {
                await interaction.reply({
                    content: response,
                    flags: MessageFlags.Ephemeral
                });
            }
        } finally {
            activeGuilds.delete(guildId);

            if (connection && channel) {
                await setSelfDeaf(connection, interaction.guild, true)
                    .catch(error => {
                        console.error(
                            `[SOUNDBOARD] Failed to self-deafen in guild ${guildId}:`,
                            error
                        );
                    });
            }
        }
    }
};
