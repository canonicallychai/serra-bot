const { VoiceConnectionStatus } = require('@discordjs/voice');

const DEFAULT_ATTEMPTS = 3;
const DEFAULT_TIMEOUT_MS = 5_000;

function waitForSelfDeaf(guild, selfDeaf, timeoutMs) {
    if (guild.members.me?.voice.selfDeaf === selfDeaf) {
        return {
            cancel() {},
            promise: Promise.resolve()
        };
    }

    let cleanup;

    const promise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error(
                `Discord did not confirm selfDeaf=${selfDeaf} within ${timeoutMs}ms.`
            ));
        }, timeoutMs);

        const onVoiceStateUpdate = (_oldState, newState) => {
            if (
                newState.guild.id === guild.id &&
                newState.id === guild.client.user.id &&
                newState.selfDeaf === selfDeaf
            ) {
                cleanup();
                resolve();
            }
        };

        cleanup = () => {
            clearTimeout(timeout);
            guild.client.off('voiceStateUpdate', onVoiceStateUpdate);
        };

        guild.client.on('voiceStateUpdate', onVoiceStateUpdate);
    });

    return {
        cancel: cleanup,
        promise
    };
}

async function setSelfDeaf(
    connection,
    guild,
    selfDeaf,
    { attempts = DEFAULT_ATTEMPTS, timeoutMs = DEFAULT_TIMEOUT_MS } = {}
) {
    let lastError;

    for (let attempt = 1; attempt <= attempts; attempt++) {
        if (guild.members.me?.voice.selfDeaf === selfDeaf) {
            return;
        }

        if (connection.state.status === VoiceConnectionStatus.Destroyed) {
            throw new Error('The voice connection was destroyed.');
        }

        const confirmation = waitForSelfDeaf(guild, selfDeaf, timeoutMs);

        if (!connection.rejoin({ selfDeaf })) {
            confirmation.cancel();
            lastError = new Error('The voice adapter rejected the state update.');
            continue;
        }

        try {
            await confirmation.promise;
            return;
        } catch (error) {
            lastError = error;
        }
    }

    throw new Error(
        `Failed to set selfDeaf=${selfDeaf} after ${attempts} attempts.`,
        { cause: lastError }
    );
}

module.exports = {
    setSelfDeaf
};
