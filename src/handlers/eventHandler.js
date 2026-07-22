const fs = require('node:fs');
const path = require('node:path');

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

function loadEvents(client) {
    const eventsPath = path.join(__dirname, '..', 'events');
    const eventFiles = getJavaScriptFiles(eventsPath);

    let loadedEvents = 0;

    for (const filePath of eventFiles) {
        const event = require(filePath);

        if (!event.name || typeof event.execute !== 'function') {
            console.warn(
                `[EVENT HANDLER] Skipped ${filePath}: missing "name" or "execute".`
            );
            continue;
        }

        const listener = (...args) => event.execute(...args, client);

        if (event.once) {
            client.once(event.name, listener);
        } else {
            client.on(event.name, listener);
        }

        loadedEvents++;

        console.log(`[EVENT HANDLER] Loaded ${event.name}`);
    }

    console.log(`[EVENT HANDLER] ${loadedEvents} event(s) loaded.`);
}

module.exports = { loadEvents };