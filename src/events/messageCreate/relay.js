const INPUT_CHANNEL_ID = '1529549620471009410';
const DEFAULT_OUTPUT_CHANNEL_ID = '1226396905366622289';

let currentDestination = {
    type: 'channel',
    id: DEFAULT_OUTPUT_CHANNEL_ID
};

let hasAnnouncedDefault = false;

const TEAL = '\u001b[2;36m';
const RESET = '\u001b[0m';

module.exports = async function relay(message) {
    // Ignore the bot's own messages everywhere.
    if (message.author.id === message.client.user.id) return;

    /*
     * Incoming DM echo
     *
     * When the destination is set to a DM, echo messages from
     * that selected person into the input channel.
     */
    if (!message.guild) {
        if (message.author.bot) return;
        if (currentDestination.type !== 'dm') return;
        if (message.author.id !== currentDestination.id) return;

        const inputChannel =
            message.client.channels.cache.get(INPUT_CHANNEL_ID) ??
            await message.client.channels
                .fetch(INPUT_CHANNEL_ID)
                .catch(() => null);

        if (!inputChannel?.isTextBased()) {
            console.error(
                '[RELAY] Input channel was not found.'
            );
            return;
        }

        const text = message.content.trim();
        const files = [...message.attachments.values()];

        try {
            // First message: username
            await inputChannel.send({
                content: `${message.author.username}:`,
                allowedMentions: {
                    parse: []
                }
            });

            // Second message: text, links, images, and attachments
            if (text || files.length > 0) {
                await inputChannel.send({
                    content: text || null,
                    files,
                    allowedMentions: {
                        parse: []
                    }
                });
            }
        } catch (error) {
            console.error(
                '[RELAY] Failed to echo incoming DM:',
                error
            );
        }

        return;
    }

    /*
     * Only process outgoing relay messages from the input channel.
     */
    if (message.channel.id !== INPUT_CHANNEL_ID) return;
    if (message.author.bot) return;

    /*
     * First relay message after startup.
     *
     * The message is not relayed. It only informs the operator
     * that the destination has reset to the default channel.
     */
    if (!hasAnnouncedDefault) {
        hasAnnouncedDefault = true;

        try {
            await message.channel.send({
                content: `\`\`\`ansi
${TEAL}ROUTING SESSION INITIALIZED
DESTINATION SET TO DEFAULT CHANNEL${RESET}
\`\`\``,
                allowedMentions: {
                    parse: []
                }
            });
        } catch (error) {
            console.error(
                '[RELAY] Failed to send startup notice:',
                error
            );
        }

        return;
    }

    const messageText = message.content.trim();

    /*
     * switch: CHANNEL_ID
     * Changes the output to a server channel.
     */
    const switchMatch = messageText.match(
        /^switch:\s*(\d{17,20})$/i
    );

    if (switchMatch) {
        const channelId = switchMatch[1];

        const targetChannel =
            message.guild.channels.cache.get(channelId) ??
            await message.guild.channels
                .fetch(channelId)
                .catch(() => null);

        if (!targetChannel?.isTextBased()) {
            console.error(
                `[RELAY] Channel ${channelId} is not a valid text-based channel.`
            );
            return;
        }

        currentDestination = {
            type: 'channel',
            id: channelId
        };

        return;
    }

    /*
     * dm: USER_ID
     * Changes the output to a person's DM.
     */
    const dmMatch = messageText.match(
        /^dm:\s*(\d{17,20})$/i
    );

    if (dmMatch) {
        const userId = dmMatch[1];

        const targetUser = await message.client.users
            .fetch(userId)
            .catch(() => null);

        if (!targetUser || targetUser.bot) {
            console.error(
                `[RELAY] User ${userId} was not found or is a bot.`
            );
            return;
        }

        const dmChannel = await targetUser
            .createDM()
            .catch(() => null);

        if (!dmChannel) {
            console.error(
                `[RELAY] Could not open a DM with user ${userId}.`
            );
            return;
        }

        currentDestination = {
            type: 'dm',
            id: userId
        };

        return;
    }

    /*
     * Resolve the current output destination.
     */
    let outputChannel;

    if (currentDestination.type === 'dm') {
        const targetUser = await message.client.users
            .fetch(currentDestination.id)
            .catch(() => null);

        outputChannel = targetUser
            ? await targetUser.createDM().catch(() => null)
            : null;
    } else {
        outputChannel =
            message.guild.channels.cache.get(
                currentDestination.id
            ) ??
            await message.guild.channels
                .fetch(currentDestination.id)
                .catch(() => null);
    }

    if (!outputChannel?.isTextBased()) {
        console.error(
            '[RELAY] Output destination was not found.'
        );
        return;
    }

    /*
     * reply: MESSAGE
     * Replies to the latest message in the selected destination.
     */
    const isReply = /^reply:/i.test(messageText);

    const contentText = isReply
        ? messageText.replace(/^reply:\s*/i, '').trim()
        : messageText;

    const safeText = contentText
        .replace(/\u001b/g, '')
        .replace(/```/g, "'''");

    const isOnlyUrl = /^https?:\/\/\S+$/i.test(safeText);

    const output = !safeText
        ? null
        : isOnlyUrl
            ? safeText
            : `\`\`\`ansi
${TEAL}${safeText}${RESET}
\`\`\``;

    const files = [...message.attachments.values()];

    if (!output && files.length === 0) {
        return;
    }

    try {
        if (isReply) {
            const recentMessages =
                await outputChannel.messages.fetch({
                    limit: 1
                });

            const latestMessage = recentMessages.first();

            if (!latestMessage) {
                console.error(
                    '[RELAY] No message was found to reply to.'
                );
                return;
            }

            await latestMessage.reply({
                content: output,
                files,
                allowedMentions: {
                    parse: [],
                    repliedUser: false
                }
            });
        } else {
            await outputChannel.send({
                content: output,
                files,
                allowedMentions: {
                    parse: []
                }
            });
        }
    } catch (error) {
        console.error(
            '[RELAY] Failed to send message:',
            error
        );
    }
};
