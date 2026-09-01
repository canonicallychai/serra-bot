const {
    clearVoiceChannel,
    saveVoiceChannel
} = require('../../utils/voiceStateStore');
const {
    shouldPreserveVoiceChannel
} = require('../../utils/voiceDisconnectPolicy');

module.exports = function syncVoiceChannel(oldState, newState, client) {
    if (oldState.id !== client.user.id) {
        return;
    }

    if (oldState.channelId === newState.channelId) {
        return;
    }

    if (newState.channelId) {
        saveVoiceChannel(newState.guild.id, newState.channelId);

        return;
    }

    if (!oldState.channelId) {
        return;
    }

    if (shouldPreserveVoiceChannel(oldState.guild.id)) {
        return;
    }

    clearVoiceChannel(oldState.guild.id);

};
