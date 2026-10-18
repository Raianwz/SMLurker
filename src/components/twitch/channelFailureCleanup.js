const path = require('node:path');

function backupAndRemoveFailedChannels(appcore, failedChannels, now = new Date()) {
    const original = appcore.channels.read();
    const targets = new Set(failedChannels.filter(channel => original.includes(channel)));
    if (!targets.size) return null;

    const stamp = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0')].join('-') + '_' +
        [now.getHours(), now.getMinutes(), now.getSeconds()].map(value => String(value).padStart(2, '0')).join('-') +
        '-' + String(now.getMilliseconds()).padStart(3, '0');
    const backupPath = path.join(appcore.appr.getPath('desktop'), `smlurker_backup-channels_${stamp}.json`);
    const textBackupPath = path.join(appcore.appr.getPath('desktop'), `smlurker_backup-channels_${stamp}.txt`);
    appcore.fs.write(backupPath, JSON.stringify(original, null, 2));
    appcore.fs.write(textBackupPath, `${original.join('\n')}\n`);
    appcore.fs.write(appcore.channels.path(), JSON.stringify(original.filter(channel => !targets.has(channel))));
    return { removed: [...targets], backupPath, textBackupPath };
}

module.exports = { backupAndRemoveFailedChannels };
