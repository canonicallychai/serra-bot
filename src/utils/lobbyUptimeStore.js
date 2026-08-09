const fs = require('node:fs');
const path = require('node:path');

const dataDirectory = path.join(__dirname, '..', '..', 'data');
const stateFile = path.join(dataDirectory, 'lobbyUptime.json');

const LOBBY_VOICE_CHANNEL_ID = '1226396905748299836';
const LOBBY_RECORD_HOURS = 1_346;
const LOBBY_RECORD_MS = LOBBY_RECORD_HOURS * 60 * 60 * 1_000;

function saveLobbyUptime(snapshot) {
    try {
        fs.mkdirSync(dataDirectory, { recursive: true });
        fs.writeFileSync(
            stateFile,
            `${JSON.stringify(snapshot)}\n`,
            'utf8'
        );
    } catch (error) {
        console.error('[LOBBY UPTIME] Failed to save uptime snapshot:', error);
    }
}

module.exports = {
    LOBBY_RECORD_HOURS,
    LOBBY_RECORD_MS,
    LOBBY_VOICE_CHANNEL_ID,
    saveLobbyUptime
};
