const { Readable } = require('node:stream');
const {
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder
} = require('discord.js');
const {
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    getVoiceConnection,
    NoSubscriberBehavior
} = require('@discordjs/voice');
const SamJs = require('sam-js');
const { setSelfDeaf } = require('../../utils/voiceDeafState');

const MAX_PLAYBACK_MS = 120_000;
const PLAYBACK_VOLUME = 0.8;
const activeGuilds = new Set();

const sam = new SamJs({
    speed: 96,
    pitch: 64,
    throat: 128,
    mouth: 128
});

function lowerWavVolume(wav) {
    const audioBuffer = Buffer.from(wav);

    // SAM produces mono, unsigned 8-bit PCM with a standard 44-byte WAV header.
    for (let index = 44; index < audioBuffer.length; index++) {
        audioBuffer[index] = Math.round(
            128 + (audioBuffer[index] - 128) * PLAYBACK_VOLUME
        );
    }

    return audioBuffer;
}

function playAudio(connection, audioBuffer) {
    const player = createAudioPlayer({
        behaviors: {
            noSubscriber: NoSubscriberBehavior.Stop
        }
    });
    const resource = createAudioResource(
        Readable.from([audioBuffer])
    );
    const subscription = connection.subscribe(player);

    if (!subscription) {
        throw new Error('The voice connection could not subscribe to the audio player.');
    }

    return new Promise((resolve, reject) => {
        let settled = false;
        const timeout = setTimeout(() => {
            player.stop(true);
            finish(reject, new Error('SAM playback timed out.'));
        }, MAX_PLAYBACK_MS);

        const finish = (settle, value) => {
            if (settled) {
                return;
            }

            settled = true;
            clearTimeout(timeout);
            player.removeAllListeners();
            subscription.unsubscribe();
            settle(value);
        };

        player.once(AudioPlayerStatus.Idle, () => {
            finish(resolve);
        });

        player.once('error', error => {
            finish(reject, error);
        });

        player.play(resource);
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sam')
        .setDescription('Reads text in the classic SAM robotic voice.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false)
        .addStringOption(option =>
            option
                .setName('text')
                .setDescription('The text for SAM to read.')
                .setMinLength(1)
                .setMaxLength(300)
                .setRequired(true)
        ),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const connection = getVoiceConnection(guildId);

        if (!connection) {
            await interaction.reply({
                content: 'AUTORESPONSE // No active voice connection. Use /joinvc first.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        if (activeGuilds.has(guildId)) {
            await interaction.reply({
                content: 'AUTORESPONSE // SAM is already transmitting in this server.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        activeGuilds.add(guildId);

        try {
            await interaction.deferReply({
                flags: MessageFlags.Ephemeral
            });

            const text = interaction.options.getString('text', true).trim();

            if (!text) {
                throw new Error('SAM text was empty after trimming whitespace.');
            }

            const wav = sam.wav(text);

            if (!wav) {
                throw new Error('SAM could not synthesize the supplied text.');
            }

            await setSelfDeaf(connection, interaction.guild, false);

            await playAudio(connection, lowerWavVolume(wav));
            await interaction.editReply('SAM transmission complete.');
        } catch (error) {
            console.error(`[SAM] Failed in guild ${guildId}:`, error);

            const response =
                'AUTORESPONSE // SAM transmission failed. Check the voice connection and try again.';

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(response);
            } else {
                await interaction.reply({
                    content: response,
                    flags: MessageFlags.Ephemeral
                });
            }
        } finally {
            activeGuilds.delete(guildId);

            await setSelfDeaf(connection, interaction.guild, true)
                .catch(error => {
                    console.error(
                        `[SAM] Failed to self-deafen in guild ${guildId}:`,
                        error
                    );
                });
        }
    }
};
