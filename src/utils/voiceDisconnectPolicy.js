const preservedGuilds = new Set();

function preserveVoiceChannelOnDisconnect(guildId) {
    preservedGuilds.add(guildId);
}

function shouldPreserveVoiceChannel(guildId) {
    return preservedGuilds.has(guildId);
}

module.exports = {
    preserveVoiceChannelOnDisconnect,
    shouldPreserveVoiceChannel
};
