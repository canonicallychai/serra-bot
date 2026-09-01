const { inspect } = require('node:util');
const { getVoiceConnections } = require('@discordjs/voice');
const {
    preserveVoiceChannelOnDisconnect
} = require('./voiceDisconnectPolicy');
const { flushConsoleLogs } = require('./consoleChannelLogger');

let isShuttingDown = false;
let hasLoggedOffline = false;

function logOffline(exitCode) {
    if (hasLoggedOffline) {
        return;
    }

    hasLoggedOffline = true;
    console.log(`[CLIENT] Offline exitCode=${exitCode}.`);
}

function disconnectVoiceConnections() {
    const connections = [...getVoiceConnections().values()];

    for (const connection of connections) {
        try {
            preserveVoiceChannelOnDisconnect(
                connection.joinConfig.guildId
            );
            connection.destroy();
        } catch (error) {
            console.error(
                '[SHUTDOWN] Failed to destroy a voice connection:',
                formatError(error)
            );
        }
    }

}

function shutDown(exitCode) {
    if (isShuttingDown) {
        return;
    }

    isShuttingDown = true;
    logOffline(exitCode);
    disconnectVoiceConnections();
    process.exitCode = exitCode;

    // Give Discord a moment to receive voice-state and console-log updates.
    const exitTimer = setTimeout(() => process.exit(exitCode), 2_000);

    flushConsoleLogs().finally(() => {
        clearTimeout(exitTimer);
        setTimeout(() => process.exit(exitCode), 250);
    });
}

function formatError(error, seen = new Set()) {
    if (!(error instanceof Error)) {
        return inspect(error, {
            depth: null,
            colors: Boolean(process.stderr.isTTY)
        });
    }

    if (seen.has(error)) {
        return '[Circular error reference]';
    }

    seen.add(error);

    const sections = [error.stack || `${error.name}: ${error.message}`];

    if (error.cause !== undefined) {
        sections.push(`Caused by:\n${formatError(error.cause, seen)}`);
    }

    if (error instanceof AggregateError) {
        for (const [index, nestedError] of [...error.errors].entries()) {
            sections.push(
                `Aggregate error ${index + 1}:\n${formatError(nestedError, seen)}`
            );
        }
    }

    const extraProperties = Object.fromEntries(
        Object.entries(error).filter(
            ([key]) => key !== 'cause' && key !== 'errors'
        )
    );

    if (Object.keys(extraProperties).length > 0) {
        sections.push(
            `Error properties:\n${inspect(extraProperties, {
                depth: null,
                colors: Boolean(process.stderr.isTTY)
            })}`
        );
    }

    return sections.join('\n');
}

function logCrash(type, error) {
    const timestamp = new Date().toISOString();

    console.error(
        `\n========== ${type} (${timestamp}) ==========`
    );
    console.error(formatError(error));
    console.error('========== END CRASH LOG ==========\n');
}

function installCrashHandlers() {
    process.on('uncaughtException', error => {
        logCrash('UNCAUGHT EXCEPTION', error);

        // Continuing after an uncaught exception can leave the bot corrupted.
        shutDown(1);
    });

    process.on('unhandledRejection', reason => {
        logCrash('UNHANDLED PROMISE REJECTION', reason);
        shutDown(1);
    });

    process.on('SIGINT', () => {
        shutDown(130);
    });

    process.on('SIGTERM', () => {
        shutDown(143);
    });

    // This is also called for direct process.exit() calls.
    process.on('exit', exitCode => {
        logOffline(exitCode);
        disconnectVoiceConnections();
    });
}

module.exports = {
    disconnectVoiceConnections,
    formatError,
    installCrashHandlers,
    logCrash
};
