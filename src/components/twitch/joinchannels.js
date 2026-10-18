const { smcore } = require('../../internal/smcore')
const { appcore } = require('../../internal/appcore');
const { ipcRenderer } = require('electron');
const { setTimeout: sleep } = require('node:timers/promises');
const { BATCH_SIZE, BATCH_DELAY_MS, CHANNEL_DELAY_MS, remainingJoinMs, formatRemainingMs } = require('./joinEstimate');
const { classifyJoinFailure } = require('./joinFailure');
const { backupAndRemoveFailedChannels } = require('./channelFailureCleanup');
const tmi = smcore.tmi;
const IRC_READY_TIMEOUT_MS = 15_000;
const JOIN_TIMEOUT_MS = 10_000;
const MAX_CONNECTED_CHANNELS = 100;

function withTimeout(operation, ms, message) {
    let timer;
    return Promise.race([
        Promise.resolve().then(operation),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); }),
    ]).finally(() => clearTimeout(timer));
}
const changeAppSide = (btn, dest) => appcore.tr.changeside(btn, dest)
/*==============================================(ENTRANDO EM CANAIS)===========================================*/
//Ativar/Desativar tempo estimado
function waitLogin(valor) {
    const getEl = (el) => document.querySelector(el);
    const connectionBox = getEl('#conection_box');

    if (valor === true) {
        connectionBox.setAttribute('disabled', true);
        connectionBox.setAttribute('aria-disabled', 'true');
        connectionBox.tabIndex = -1;
    } else {
        connectionBox.removeAttribute('disabled');
        connectionBox.setAttribute('aria-disabled', 'false');
        connectionBox.tabIndex = 0;
    }

    getEl('#Mtimer').style.display = valor === true ? 'flex' : 'none';
}


//Entrar em canais & Gerênciar fila
async function joinChannels(selectedChannels) {
    const getEl = (el) => document.querySelector(el)
    const getText = (el, txt) => el.textContent = `${txt}`
    const channelPath = appcore.channels.path();
    const totalCN = getEl('#cntotal');
    const setChannelCount = (state, label) => {
        totalCN.setAttribute('data-state', state);
        getText(totalCN, label);
    };
    const timerLabel = getEl('#Mtimer');
    let channels = [];
    let batchCount = 0;
    let batchJoined = [];
    let batchFailed = [];
    const failedChannels = [];
    const reportBatch = () => {
        if (!batchJoined.length && !batchFailed.length) return;
        const lines = [];
        if (batchJoined.length) lines.push(`Entraram: ${batchJoined.join(', ')}`);
        if (batchFailed.length) lines.push(`Falharam: ${batchFailed.join(', ')}`);
        ipcRenderer.send('sendtoConsole', `\n${new Date().toLocaleString('pt-BR')} · Entrada nos canais\n${lines.join('\n')}\n`);
        batchJoined = [];
        batchFailed = [];
    };
    const ClockTimer = {
        interval: null,
        deadline: 0,
        render() {
            const remaining = Math.max(1000, this.deadline - Date.now());
            getText(timerLabel, `Tempo Estimado 🕘 ${formatRemainingMs(remaining)}`);
        },
        update(remainingMs) {
            this.deadline = Date.now() + remainingMs;
            this.render();
            if (!this.interval) {
                this.interval = setInterval(() => this.render(), 1000);
                window.addEventListener('focus', this.onFocus);
                document.addEventListener('visibilitychange', this.onVisibilityChange);
            }
        },
        onFocus: () => ClockTimer.render(),
        onVisibilityChange: () => {
            if (!document.hidden) ClockTimer.render();
        },
        stop() {
            clearInterval(this.interval);
            this.interval = null;
            window.removeEventListener('focus', this.onFocus);
            document.removeEventListener('visibilitychange', this.onVisibilityChange);
            getText(timerLabel, '--:--');
        }
    }

    if (!appcore.fs.exist(channelPath)) {
        throw 'Nenhum canal adicionado, por favor adicione um canal'
    }
    const savedChannels = [...new Set(appcore.channels.read())];
    if (savedChannels.length <= 0) throw 'Nenhum canal adicionado, por favor adicione um canal'
    channels = selectedChannels === undefined ? savedChannels : selectedChannels;
    if (!Array.isArray(channels) || channels.length === 0 || channels.length > MAX_CONNECTED_CHANNELS ||
        new Set(channels).size !== channels.length ||
        channels.some(channel => !savedChannels.includes(channel))) {
        throw new Error('Escolha até 100 canais válidos da sua lista para conectar.');
    }
    const readyDeadline = Date.now() + IRC_READY_TIMEOUT_MS;
    const loginStatus = getEl('#msgStatus');
    getText(loginStatus, 'Aguardando conexão com o chat da Twitch...');
    while (await withTimeout(() => tmi.rds(), IRC_READY_TIMEOUT_MS, 'Tempo esgotado ao verificar a conexão IRC.') !== 'OPEN') {
        if (Date.now() >= readyDeadline) throw new Error('Tempo esgotado ao aguardar a conexão IRC.');
        await sleep(Math.min(1000, readyDeadline - Date.now()));
    }
    getText(loginStatus, 'Entrando nos canais...');

    let started = false;
    let joined = 0;
    let failed = 0;
    try {
        for (let x = 0; x < channels.length; x++) {
            if (!started) {
                changeAppSide(1);
                waitLogin(true);
                started = true;
            }
            ClockTimer.update(remainingJoinMs(channels.length, x));
            try {
                await withTimeout(() => tmi.join(channels[x]), JOIN_TIMEOUT_MS,
                    `Tempo esgotado ao entrar em ${channels[x]}.`);
                joined++;
                batchJoined.push(channels[x]);
            } catch (error) {
                failed++;
                const reason = classifyJoinFailure(error);
                batchFailed.push(`${channels[x]} (${reason.label})`);
                failedChannels.push(channels[x]);
            }
            batchCount++;
            setChannelCount('entering', `Entrou: ${joined}/${channels.length}`)
            if (batchCount === BATCH_SIZE) {
                reportBatch();
                batchCount = 0;
                if (x < channels.length - 1) {
                    setChannelCount('waiting', `Aguarde: ${joined}/${channels.length}`)
                    await sleep(BATCH_DELAY_MS);
                }
            }
            await sleep(CHANNEL_DELAY_MS);
        }
    } finally {
        reportBatch();
        if (started) {
            ClockTimer.stop();
            waitLogin(false);
        }
    }
    if (failedChannels.length) {
        let cleanup;
        try {
            cleanup = backupAndRemoveFailedChannels(appcore, failedChannels);
        } catch {
            ipcRenderer.send('sendtoConsole', `\n${new Date().toLocaleString('pt-BR')} · Não foi possível concluir o backup ou a atualização da lista. Confira o arquivo de canais antes de tentar novamente.\n`);
            try {
                appcore.dg.showMB({
                    type: 'warning',
                    title: 'Backup dos canais — SMLurker',
                    message: 'Não foi possível concluir o backup ou a atualização da lista.',
                    detail: 'Confira o arquivo de canais antes de tentar novamente.',
                });
            } catch { /* A falha também foi registrada no painel de eventos. */ }
        }
        if (cleanup) {
            ipcRenderer.send('sendtoConsole', `\n${new Date().toLocaleString('pt-BR')} · Canais removidos da lista: ${cleanup.removed.join(', ')}. Backup: ${cleanup.backupPath}\n`);
            try {
                appcore.dg.showMB({
                    type: 'info',
                    title: 'Lista de canais atualizada — SMLurker',
                    message: `${cleanup.removed.length} ${cleanup.removed.length === 1 ? 'canal foi removido' : 'canais foram removidos'} da lista.`,
                    detail: `Algumas falhas podem ser temporárias. A lista anterior completa, incluindo esses canais, foi salva em:\n${cleanup.backupPath}`,
                });
            } catch { /* O painel já informa a remoção e o caminho do backup. */ }
        }
    }
    ipcRenderer.send('sendChannelstoConsole', joined)
    ipcRenderer.send('sendtoConsole',
        `\n${new Date().toLocaleString('pt-BR')} · Entrada concluída: ${joined} conectado${joined === 1 ? '' : 's'}, ${failed} falha${failed === 1 ? '' : 's'}.\n`);
    setChannelCount(failed ? 'partial' : 'channels',
        failed ? `Canais: ${joined} (${failed} falharam)` : `Canais: ${joined}`);
    if (joined === 0) throw new Error('Não foi possível entrar em nenhum canal.');

}

module.exports.jc = joinChannels;
