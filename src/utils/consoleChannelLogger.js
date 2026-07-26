const { inspect } = require('node:util');
const { EmbedBuilder } = require('discord.js');

const MAX_DESCRIPTION_LENGTH = 4000;
const consoleMethods = ['log', 'warn', 'error'];
const originalConsole = Object.fromEntries(
    consoleMethods.map(method => [method, console[method].bind(console)])
);

const colors = {
    log: 0x2bafd8,
    warn: 0xf0b232,
    error: 0xed4245
};

let client;
let logChannelId;
let isInstalled = false;
let sendQueue = Promise.resolve();
const pendingEntries = [];

function formatArgument(argument) {
    if (typeof argument === 'string') {
        return argument;
    }

    if (argument instanceof Error) {
        return inspect(argument, {
            depth: null,
            colors: false
        });
    }

    return inspect(argument, {
        depth: null,
        colors: false
    });
}

function splitText(text) {
    const cleanText = text
        .replace(/\u001b\[[0-9;]*m/g, '')
        .replaceAll('```', "'''");

    const chunks = [];

    for (
        let index = 0;
        index < cleanText.length;
        index += MAX_DESCRIPTION_LENGTH
    ) {
        chunks.push(cleanText.slice(index, index + MAX_DESCRIPTION_LENGTH));
    }

    return chunks.length > 0 ? chunks : ['(empty log entry)'];
}

async function sendEntry(entry) {
    if (!client?.isReady()) {
        pendingEntries.push(entry);
        return;
    }

    const channel =
        client.channels.cache.get(logChannelId) ??
        await client.channels.fetch(logChannelId).catch(() => null);

    if (!channel?.isTextBased() || !channel.isSendable()) {
        originalConsole.error(
            `[CONSOLE LOGGER] Channel ${logChannelId} was not found or is not sendable.`
        );
        return;
    }

    const chunks = splitText(entry.text);

    for (const [index, chunk] of chunks.entries()) {
        const titleSuffix = chunks.length > 1
            ? ` (${index + 1}/${chunks.length})`
            : '';

        const embed = new EmbedBuilder()
            .setColor(colors[entry.level])
            .setTitle(`Console ${entry.level.toUpperCase()}${titleSuffix}`)
            .setDescription(`\`\`\`\n${chunk}\n\`\`\``)
            .setTimestamp(entry.timestamp);

        await channel.send({ embeds: [embed] });
    }
}

function enqueueEntry(entry) {
    if (!client?.isReady()) {
        pendingEntries.push(entry);
        return;
    }

    sendQueue = sendQueue
        .then(() => sendEntry(entry))
        .catch(error => {
            originalConsole.error(
                '[CONSOLE LOGGER] Failed to send a log embed:',
                error
            );
        });
}

function installConsoleChannelLogger(channelId) {
    if (isInstalled) {
        return;
    }

    isInstalled = true;
    logChannelId = channelId;

    for (const method of consoleMethods) {
        console[method] = (...arguments_) => {
            originalConsole[method](...arguments_);

            enqueueEntry({
                level: method,
                text: arguments_.map(formatArgument).join(' '),
                timestamp: new Date()
            });
        };
    }
}

function attachConsoleLoggerClient(discordClient) {
    client = discordClient;

    const flushPending = () => {
        const entries = pendingEntries.splice(0);

        for (const entry of entries) {
            enqueueEntry(entry);
        }
    };

    if (client.isReady()) {
        flushPending();
    } else {
        client.once('clientReady', flushPending);
    }
}

function flushConsoleLogs() {
    return sendQueue;
}

module.exports = {
    attachConsoleLoggerClient,
    flushConsoleLogs,
    installConsoleChannelLogger
};
