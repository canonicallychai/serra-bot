const VERIFY_CHANNEL_ID = '1226396905366622280';
const VERIFIED_ROLE_ID = '1226396904481489021';
const ENTRY_LOG_CHANNEL_ID = '1226396905366622289';

const TEAL = '\u001b[2;36m';
const PINK = '\u001b[2;35m';
const RESET = '\u001b[0m';

const INPUT_DELETE_DELAY = 1000;
const DELETE_DELAY = 5000;

module.exports = async function verify(message) {
    if (message.author.bot) return;

    if (message.channel.id !== VERIFY_CHANNEL_ID) return;

    const input = message.content.trim();
    const member = message.member;

    if (!member) return;

    /*
     * Correct input
     */
    if (/^confirm$/i.test(input)) {
        /*
         * Member already accepted the terms.
         */
        if (member.roles.cache.has(VERIFIED_ROLE_ID)) {
            try {
                const warning = await message.channel.send({
                    content: `\`\`\`ansi
${TEAL}ACCESS REQUEST REJECTED
YOU HAVE ALREADY ACCEPTED THE TERMS.${RESET}
\`\`\``,
                    allowedMentions: {
                        parse: []
                    }
                });

                setTimeout(() => {
                    message.delete().catch(() => {});
                    warning.delete().catch(() => {});
                }, DELETE_DELAY);
            } catch (error) {
                console.error(
                    '[VERIFY] Failed to send existing-access warning:',
                    error
                );
            }

            return;
        }

        /*
         * Grant access.
         */
        try {
            await member.roles.add(VERIFIED_ROLE_ID);

            const success = await message.channel.send({
                content: `\`\`\`ansi
${TEAL}ACCESS CONFIRMED
CLEARANCE GRANTED${RESET}
\`\`\``,
                allowedMentions: {
                    parse: []
                }
            });

            /*
             * Send the permanent entry log.
             */
            const entryLogChannel =
                message.guild.channels.cache.get(ENTRY_LOG_CHANNEL_ID);

            if (entryLogChannel?.isTextBased()) {
                const now = new Date();

                const date = now.toLocaleDateString('en-US', {
                    month: '2-digit',
                    day: '2-digit',
                    year: '2-digit'
                });

                const time = now.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                });

                const username = message.author.username;
                const memberCount = message.guild.memberCount;

                await entryLogChannel.send({
                    content: `\`\`\`ansi
${TEAL}[${date} ${time}] ENTRY
${PINK}${username}${TEAL} has entered the simulation.
There are now ${PINK}${memberCount}${TEAL} active subjects.${RESET}
\`\`\``,
                    allowedMentions: {
                        parse: []
                    }
                });
            } else {
                console.error(
                    '[VERIFY] Entry log channel was not found or is not text-based.'
                );
            }

            /*
             * Delete the confirmation and success message after five seconds.
             */
            setTimeout(() => {
                message.delete().catch(() => {});
                success.delete().catch(() => {});
            }, DELETE_DELAY);
        } catch (error) {
            console.error(
                '[VERIFY] Failed to grant verification role:',
                error
            );
        }

        return;
    }

    /*
     * Wrong input
     */
    try {
        const warning = await message.channel.send({
            content: `\`\`\`ansi
${TEAL}INVALID AUTHORIZATION STRING
EXPECTED INPUT: CONFIRM${RESET}
\`\`\``,
            allowedMentions: {
                parse: []
            }
        });

        setTimeout(() => {
            message.delete().catch(() => {});
        }, INPUT_DELETE_DELAY);

        setTimeout(() => {
            warning.delete().catch(() => {});
        }, DELETE_DELAY);
    } catch (error) {
        console.error(
            '[VERIFY] Failed to process invalid input:',
            error
        );
    }
};