const { smcore } = require('../../internal/smcore')
const { appcore } = require('../../internal/appcore');
const { ipcRenderer } = require('electron');
const { setTimeout: sleep } = require('node:timers/promises');
const { BATCH_SIZE, BATCH_DELAY_MS, CHANNEL_DELAY_MS, remainingJoinMs, formatRemainingMs } = require('./joinEstimate');
const tmi = smcore.tmi;
const IRC_READY_TIMEOUT_MS = 15_000;
const JOIN_TIMEOUT_MS = 10_000;

function withTimeout(operation, ms, message) {
    let timer;
    return Promise.race([
        Promise.resolve().then(operation),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); }),
    ]).finally(() => clearTimeout(timer));
}
const changeAppSide = (btn, dest) => appcore.tr.changeside(btn, dest)
const gCount = () => smcore.lv.get(), aCount = () => smcore.lv.add();
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
async function joinChannels() {
    const getEl = (el) => document.querySelector(el)
    const getText = (el, txt) => el.textContent = `${txt}`
    const channelPath = appcore.channels.path();
    const totalCN = getEl('#cntotal');
    const timerLabel = getEl('#Mtimer');
    let channels = [];
    let batchCount = 0;
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
    channels = appcore.channels.read()
    if (channels.length <= 0) throw 'Nenhum canal adicionado, por favor adicione um canal'
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
            } catch (error) {
                failed++;
                if (error === 'msg_channel_suspended' || error?.message === 'msg_channel_suspended') {
                    aCount();
                    await sleep(300);
                    removeChannel(channels[x]);
                }
            }
            batchCount++;
            getText(totalCN, `🟢 Entrou: ${joined}/${channels.length - gCount()}`)
            if (batchCount === BATCH_SIZE && x < channels.length - 1) {
                getText(totalCN, `🟡 Aguarde: ${joined}/${channels.length - gCount()}`)
                batchCount = 0;
                await sleep(BATCH_DELAY_MS);
            }
            await sleep(CHANNEL_DELAY_MS);
        }
    } finally {
        if (started) {
            ClockTimer.stop();
            waitLogin(false);
        }
    }
    ipcRenderer.send('sendChannelstoConsole', joined)
    getText(totalCN, failed ? `🟡 Canais: ${joined} (${failed} falharam)` : `🟣 Canais: ${joined}`);
    if (joined === 0) throw new Error('Não foi possível entrar em nenhum canal.');

}

//Remover canais banidos/suspensos ou inexistente
function removeChannel(chn) {
    let channels = chn.toString()
    let dt = new Date().toLocaleDateString().replaceAll('/', '.')
    const channelPath = appcore.channels.path();
    let bkChannels = `${appcore.appr.getPath('desktop')}\\smlurker_lista.backup.${dt}.txt`;
    if (appcore.fs.exist(channelPath)) {
        let currentCn = appcore.channels.read()
        let errMsg = `O canal ${channels.toUpperCase()} foi removido da sua Lista de Canais\n\tMotivo: Este canal não existe ou foi suspenso.\n\nUm arquivo de backup foi criado em sua área de trabalho!`;
        let onList = false, filtro;

        if (currentCn.includes(channels)) onList = true;
        if (onList) {
            filtro = currentCn.filter(channel => channel !== channels);
            currentCn.sort()
            currentCn = JSON.stringify(currentCn).replace(/[\"\[\]]/g, '')
            appcore.fs.write(channelPath, JSON.stringify(filtro))
            appcore.fs.write(bkChannels, currentCn)
            appcore.dg.showMB({
                type: 'info',
                title: 'Canal Removido — SMLurker',
                message: errMsg,
            });
        }
    }
}

module.exports.jc = joinChannels;
