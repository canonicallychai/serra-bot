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
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ],

    partials: [
        Partials.Channel
    ]
});

loadCommands(client);
loadEvents(client);

client.login(process.env.DISCORD_TOKEN);