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
        GatewayIntentBits.GuildMembers,
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

client.once('clientReady', readyClient => {
    console.log(
        `[CLIENT] Ready user=${readyClient.user.id} guilds=${readyClient.guilds.cache.size}.`
    );
});

client.on('error', error => {
    console.error('[CLIENT] Discord client error:', error);
});

client.login(process.env.DISCORD_TOKEN)
    .catch(error => {
        console.error('[CLIENT] Discord login failed:', error);
    });
