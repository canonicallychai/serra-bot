const fs = require('node:fs');
const path = require('node:path');
const { Collection } = require('discord.js');

function getJavaScriptFiles(directory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            files.push(...getJavaScriptFiles(fullPath));
            continue;
        }

        if (entry.isFile() && entry.name.endsWith('.js')) {
            files.push(fullPath);
        }
    }

    return files;
}

function loadCommands(client) {
    client.commands = new Collection();

    const commandsPath = path.join(__dirname, '..', 'commands');
    const commandFiles = getJavaScriptFiles(commandsPath);

    for (const filePath of commandFiles) {
        const command = require(filePath);

        if (!command.data || typeof command.execute !== 'function') {
            console.warn(
                `[COMMAND HANDLER] Skipped ${filePath}: missing "data" or "execute".`
            );
            continue;
        }

        const commandName = command.data.name;

        if (client.commands.has(commandName)) {
            console.warn(
                `[COMMAND HANDLER] Duplicate command "${commandName}" skipped.`
            );
            continue;
        }

        client.commands.set(commandName, command);

        console.log(`[COMMAND HANDLER] Loaded /${commandName}`);
    }

    console.log(
        `[COMMAND HANDLER] ${client.commands.size} command(s) loaded.`
    );
}

module.exports = { loadCommands };