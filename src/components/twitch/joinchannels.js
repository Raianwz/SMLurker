const { smcore } = require('../../internal/smcore')
const { appcore } = require('../../internal/appcore');
const { ipcRenderer } = require('electron');
const { setTimeout: sleep } = require('node:timers/promises');
const { BATCH_SIZE, BATCH_DELAY_MS, CHANNEL_DELAY_MS, remainingJoinMs, formatRemainingMs } = require('./joinEstimate');
const tmi = smcore.tmi;
const changeAppSide = (btn, dest) => appcore.tr.changeside(btn, dest)
const gCount = () => smcore.lv.get(), aCount = () => smcore.lv.add();
/*==============================================(ENTRANDO EM CANAIS)===========================================*/
//Ativar/Desativar tempo estimado
function waitLogin(valor) {
    const getEl = (el) => document.querySelector(el);
    const isDisabled = valor === true;

    getEl('#swt_notifyMe').disabled = isDisabled;
    getEl('#swt_notifyGift').disabled = isDisabled;

    const visibility = isDisabled ? 'hidden' : 'visible';
    const connectionBox = getEl('#conection_box');

    if (isDisabled) {
        connectionBox.setAttribute('disabled', true);
    } else {
        connectionBox.removeAttribute('disabled');
    }

    getEl('#Mtimer').style.display = visibility === 'visible' ? 'none' : 'flex';
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
    while ((await tmi.rds()) !== 'OPEN') await sleep(1000);

    let started = false;
    try {
        for (let x = 0; x < channels.length; x++) {
            tmi.join(channels[x]).catch(err => {
                if (err === 'msg_channel_suspended') {
                    aCount();
                    sleep(300).then(() => removeChannel(`${channels[x]}`));
                }
            })

            if (!started) {
                changeAppSide(1);
                waitLogin(true);
                started = true;
            }
            ClockTimer.update(remainingJoinMs(channels.length, x));
            batchCount++;
            getText(totalCN, `🟢 Entrou: ${x + 1}/${channels.length - gCount()}`)
            if (batchCount === BATCH_SIZE && x < channels.length - 1) {
                getText(totalCN, `🟡 Aguarde: ${x + 1}/${channels.length - gCount()}`)
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
    ipcRenderer.send('sendChannelstoConsole', channels.length)
    getText(totalCN, `🟣 Canais: ${channels.length - gCount()}`);

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
