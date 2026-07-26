const fs = require('node:fs');
const path = require('node:path');

const dataDirectory = path.join(__dirname, '..', '..', 'data');
const stateFile = path.join(dataDirectory, 'voiceChannels.json');

function readVoiceChannels() {
    try {
        return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('[VOICE STATE] Failed to read saved channels:', error);
        }

        return {};
    }
}

function writeVoiceChannels(channels) {
    fs.mkdirSync(dataDirectory, { recursive: true });
    fs.writeFileSync(
        stateFile,
        `${JSON.stringify(channels, null, 2)}\n`,
        'utf8'
    );
}

function saveVoiceChannel(guildId, channelId) {
    const channels = readVoiceChannels();
    channels[guildId] = channelId;
    writeVoiceChannels(channels);
}

function clearVoiceChannel(guildId) {
    const channels = readVoiceChannels();

    if (!(guildId in channels)) {
        return;
    }

    delete channels[guildId];
    writeVoiceChannels(channels);
}

module.exports = {
    clearVoiceChannel,
    readVoiceChannels,
    saveVoiceChannel
};
