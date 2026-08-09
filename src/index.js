const {
    attachConsoleLoggerClient,
    installConsoleChannelLogger
} = require('./utils/consoleChannelLogger');
const { installCrashHandlers } = require('./utils/crashLogger');

installConsoleChannelLogger('1531032187330363403');
installCrashHandlers();

require('dotenv').config();

const {
    Client,
    Collection,
    GatewayIntentBits,
    Partials
} = require('discord.js');

const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ],

    partials: [
        Partials.Channel
    ],

    presence: {
        status: 'idle'
    }
});

attachConsoleLoggerClient(client);

loadCommands(client);
loadEvents(client);

client.login(process.env.DISCORD_TOKEN);
