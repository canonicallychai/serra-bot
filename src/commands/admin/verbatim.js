const {
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder
} = require('discord.js');

const pendingCaptures = new Set();
const CAPTURE_TIMEOUT_MS = 5 * 60 * 1000;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verbatim')
        .setDescription('Copies your next message to another channel.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false)
        .addStringOption(option =>
            option
                .setName('output_channel_id')
                .setDescription('The ID of the channel that receives the copy.')
                .setMinLength(17)
                .setMaxLength(20)
                .setRequired(true)
        ),

    async execute(interaction) {
        const outputChannelId = interaction.options
            .getString('output_channel_id', true)
            .trim();

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        if (!/^\d{17,20}$/.test(outputChannelId)) {
            await interaction.editReply(
                'That is not a valid Discord channel ID.'
            );
            return;
        }

        const outputChannel = await interaction.guild.channels
            .fetch(outputChannelId)
            .catch(() => null);

        if (!outputChannel?.isTextBased() || !outputChannel.isSendable()) {
            await interaction.editReply(
                'That ID does not belong to a channel I can send messages in.'
            );
            return;
        }

        const inputChannel = interaction.channel;

        if (!inputChannel?.isTextBased()) {
            await interaction.editReply(
                'This command must be run in a text-based channel.'
            );
            return;
        }

        const captureKey = [
            interaction.guild.id,
            inputChannel.id,
            interaction.user.id
        ].join(':');

        if (pendingCaptures.has(captureKey)) {
            await interaction.editReply(
                'I am already waiting for your next message in this channel.'
            );
            return;
        }

        pendingCaptures.add(captureKey);

        await interaction.editReply(
            `Waiting up to 5 minutes for your next message in ${inputChannel}. It will be copied to ${outputChannel}.`
        );

        try {
            const messages = await inputChannel.awaitMessages({
                filter: message =>
                    message.author.id === interaction.user.id &&
                    !message.author.bot,
                max: 1,
                time: CAPTURE_TIMEOUT_MS
            });

            const message = messages.first();

            if (!message) {
                await interaction.editReply(
                    'Verbatim capture expired before you sent a message.'
                );
                return;
            }

            const files = message.attachments.map(attachment => ({
                attachment: attachment.url,
                name: attachment.name,
                description: attachment.description ?? undefined
            }));

            const stickers = [...message.stickers.keys()];

            if (!message.content && files.length === 0 && stickers.length === 0) {
                await interaction.editReply(
                    'That message has no content I can copy.'
                );
                return;
            }

            await outputChannel.send({
                content: message.content || undefined,
                files,
                stickers,
                allowedMentions: {
                    parse: ['users', 'roles', 'everyone']
                }
            });

            await interaction.editReply(
                `Copied your message to ${outputChannel}.`
            );
        } finally {
            pendingCaptures.delete(captureKey);
        }
    }
};
