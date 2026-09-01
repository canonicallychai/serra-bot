const NUMBER_CHANNEL_ID = '1226396905366622284';
const COLOR_ROLES_START_ID = '1226396904762507399';
const COLOR_ROLES_END_ID = '1226396904762507398';

const TEAL = '\u001b[2;36m';
const PINK = '\u001b[2;35m';
const RESET = '\u001b[0m';

const INPUT_DELETE_DELAY = 1000;
const DELETE_DELAY = 5000;

module.exports = async function number(message) {
    if (message.author.bot) return;
    if (message.channel.id !== NUMBER_CHANNEL_ID) return;

    const input = message.content.trim();
    const isRemoveCommand = /^remove$/i.test(input);
    const isWholeNumber = /^(?:[1-9]|[1-4]\d|5[01])$/.test(input);

    if (isRemoveCommand || isWholeNumber) {
        try {
            const roles = message.guild.roles.cache;
            const startMarker = roles.get(COLOR_ROLES_START_ID);
            const endMarker = roles.get(COLOR_ROLES_END_ID);

            if (!startMarker || !endMarker) {
                throw new Error('Color role marker was not found.');
            }

            const colorRoles = [...roles.values()]
                .filter(role =>
                    role.position < startMarker.position &&
                    role.position > endMarker.position
                )
                .sort((first, second) =>
                    second.position - first.position
                );

            const member = message.member;

            if (!member) {
                throw new Error('Message author is not a guild member.');
            }

            if (isRemoveCommand) {
                const existingColorRoles = colorRoles.filter(role =>
                    member.roles.cache.has(role.id)
                );

                if (existingColorRoles.length > 0) {
                    await member.roles.remove(existingColorRoles);

                    console.log(
                        `[COLOR ROLE] Removed user=${message.author.id} guild=${message.guild.id}.`
                    );
                }

                const confirmation = await message.channel.send({
                    content: `\`\`\`ansi
${TEAL}COLOR ROLE REMOVED${RESET}
\`\`\``,
                    allowedMentions: {
                        parse: []
                    }
                });

                setTimeout(() => {
                    message.delete().catch(() => {});
                    confirmation.delete().catch(() => {});
                }, DELETE_DELAY);

                return;
            }

            const selectedRole = colorRoles[Number(input) - 1];

            if (!selectedRole) {
                throw new Error(
                    `No color role is mapped to number ${input}.`
                );
            }

            const previousColorRoles = colorRoles.filter(role =>
                role.id !== selectedRole.id &&
                member.roles.cache.has(role.id)
            );

            if (previousColorRoles.length > 0) {
                await member.roles.remove(previousColorRoles);
            }

            let roleChanged = previousColorRoles.length > 0;

            /*
             * Assign after removing the previous selection so the final role
             * operation always leaves the requested color on the member.
             */
            if (!member.roles.cache.has(selectedRole.id)) {
                await member.roles.add(selectedRole);
                roleChanged = true;
            }

            if (roleChanged) {
                console.log(
                    `[COLOR ROLE] Changed user=${message.author.id} guild=${message.guild.id} role=${selectedRole.id}.`
                );
            }

            const confirmation = await message.channel.send({
                content: `\`\`\`ansi
${TEAL}COLOR ROLE ASSIGNED
SELECTION: ${PINK}${input}${TEAL} — ${PINK}${selectedRole.name}${RESET}
\`\`\``,
                allowedMentions: {
                    parse: []
                }
            });

            setTimeout(() => {
                message.delete().catch(() => {});
                confirmation.delete().catch(() => {});
            }, DELETE_DELAY);
        } catch (error) {
            console.error(
                '[NUMBER] Failed to assign color role:',
                error
            );

            const warning = await message.channel.send({
                content: `\`\`\`ansi
${TEAL}COLOR ROLE ASSIGNMENT FAILED
PLEASE CONTACT AN ADMINISTRATOR.${RESET}
\`\`\``,
                allowedMentions: {
                    parse: []
                }
            }).catch(() => null);

            setTimeout(() => {
                message.delete().catch(() => {});
            }, INPUT_DELETE_DELAY);

            if (warning) {
                setTimeout(() => {
                    warning.delete().catch(() => {});
                }, DELETE_DELAY);
            }
        }

        return;
    }

    try {
        const warning = await message.channel.send({
            content: `\`\`\`ansi
${TEAL}INVALID NUMBER
EXPECTED INPUT: A WHOLE NUMBER FROM ${PINK}1-51${TEAL} OR ${PINK}REMOVE${RESET}
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
            '[NUMBER] Failed to process invalid input:',
            error
        );
    }
};
