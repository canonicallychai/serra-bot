const {
    SlashCommandBuilder,
    ChannelType,
    PermissionFlagsBits,
    MessageFlags
} = require('discord.js');

const TEAL = '\u001b[2;36m';
const RESET = '\u001b[0m';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Sends a S.E.R.R.A transmission.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('The channel to send the transmission in.')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('text')
                .setDescription('The text S.E.R.R.A will send.')
                .setMaxLength(1800)
                .setRequired(true)
        )
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Reply to this user’s latest message.')
                .setRequired(false)
        ),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel', true);
        const text = interaction.options.getString('text', true);
        const user = interaction.options.getUser('user');

        // Prevent submitted text from escaping or modifying the ANSI block.
        const safeText = text
            .replaceAll('\u001b', '')
            .replaceAll('```', "'''");

        const output =
`\`\`\`ansi
${TEAL}${safeText}${RESET}
\`\`\``;

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        if (!user) {
            await channel.send({
                content: output,
                allowedMentions: { parse: [] }
            });

            await interaction.editReply(
                `Transmission sent in ${channel}.`
            );

            return;
        }

        const messages = await channel.messages.fetch({ limit: 100 });

        const latestMessage = messages.find(
            message =>
                message.author.id === user.id &&
                !message.system
        );

        if (!latestMessage) {
            await interaction.editReply(
                `No recent message from ${user} was found in ${channel}.`
            );

            return;
        }

        await latestMessage.reply({
            content: output,
            allowedMentions: {
                parse: [],
                repliedUser: false
            }
        });

        await interaction.editReply(
            `Transmission sent as a reply to ${user} in ${channel}.`
        );
    }
};