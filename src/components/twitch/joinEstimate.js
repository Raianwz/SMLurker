const BATCH_SIZE = 18;
const CHANNEL_DELAY_MS = 200;
const BATCH_DELAY_MS = 10_500;

function remainingJoinMs(totalChannels, nextChannelIndex = 0) {
    const remainingChannels = Math.max(0, totalChannels - nextChannelIndex);
    if (remainingChannels === 0) return 0;

    // A pausa acontece entre lotes, nunca depois do último canal.
    const remainingPauses = Math.floor((totalChannels - 1) / BATCH_SIZE)
        - Math.floor(nextChannelIndex / BATCH_SIZE);
    return remainingChannels * CHANNEL_DELAY_MS + remainingPauses * BATCH_DELAY_MS;
}

function formatRemainingMs(milliseconds) {
    const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
    const minutes = Math.floor(seconds / 60);
    return `${String(minutes).padStart(2, '0')}m ${String(seconds % 60).padStart(2, '0')}s`;
}

module.exports = { BATCH_SIZE, CHANNEL_DELAY_MS, BATCH_DELAY_MS, remainingJoinMs, formatRemainingMs };
