const fs = require('node:fs');
const path = require('node:path');

function loadEvents(client) {
    const eventsPath = path.join(__dirname, '..', 'events');

    const eventFolders = fs.readdirSync(eventsPath, {
        withFileTypes: true
    });

    for (const folder of eventFolders) {
        if (!folder.isDirectory()) continue;

        const eventName = folder.name;
        const folderPath = path.join(eventsPath, eventName);

        const eventFiles = fs
            .readdirSync(folderPath, {
                withFileTypes: true
            })
            .filter(entry =>
                entry.isFile() &&
                entry.name.endsWith('.js')
            );

        for (const file of eventFiles) {
            const filePath = path.join(folderPath, file.name);
            const handler = require(filePath);

            if (typeof handler !== 'function') {
                console.error(
                    `[EVENT HANDLER] Skipped ${eventName}/${file.name}: expected a function export.`
                );
                continue;
            }

            client.on(eventName, (...args) => {
                Promise.resolve(handler(...args, client))
                    .catch(error => {
                        console.error(
                            `[EVENT ERROR] ${eventName}/${file.name}:`,
                            error
                        );
                    });
            });

        }
    }
}

module.exports = {
    loadEvents
};
