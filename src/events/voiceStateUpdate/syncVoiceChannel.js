const {
    clearVoiceChannel,
    saveVoiceChannel
} = require('../../utils/voiceStateStore');
const {
    shouldPreserveVoiceChannel
} = require('../../utils/voiceDisconnectPolicy');

module.exports = function syncVoiceChannel(oldState, newState, client) {
    if (
        oldState.id !== client.user.id ||
        oldState.channelId === newState.channelId
    ) {
        return;
    }

    if (newState.channelId) {
        saveVoiceChannel(newState.guild.id, newState.channelId);

        console.log(
            `[VOICE] Updated the saved voice channel to ${newState.channel?.name ?? newState.channelId}.`
        );
        return;
    }

    if (!oldState.channelId) {
        return;
    }

    if (shouldPreserveVoiceChannel(oldState.guild.id)) {
        return;
    }

    clearVoiceChannel(oldState.guild.id);

    console.log(
        `[VOICE] Bot was disconnected from ${oldState.channel?.name ?? oldState.channelId}; cleared the saved voice channel.`
    );
};
