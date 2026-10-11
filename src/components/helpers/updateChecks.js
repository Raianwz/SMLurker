const HOUR = 60 * 60 * 1000;

function startUpdateChecks({ updater, isPackaged, onDownloaded, logger = console, schedule = setInterval }) {
    let checking = false;
    let downloaded = false;

    updater.on('update-downloaded', (info) => {
        downloaded = true;
        onDownloaded(info);
    });
    updater.on('error', (error) => {
        logger.warn('Falha no atualizador:', error);
    });

    async function check() {
        if (!isPackaged || checking || downloaded) return;
        checking = true;
        try {
            await updater.checkForUpdates();
        } catch (error) {
            logger.warn('Não foi possível verificar atualizações:', error);
        } finally {
            checking = false;
        }
    }

    if (isPackaged) {
        void check();
        schedule(check, HOUR);
    }

    return { isUpdateReady: () => downloaded, check };
}

module.exports = { startUpdateChecks, HOUR };
