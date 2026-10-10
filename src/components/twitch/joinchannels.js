const { smcore } = require('../../internal/smcore')
const { appcore } = require('../../internal/appcore');
const { ipcRenderer } = require('electron');
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
    let totalCN = getEl('#cntotal'), channels = {};
    let y = 0, durantion = 0, tmpCount = [];
    const ClockTimer = {
        start: (time) => {
            var self = this;
            let minutes, seconds;
            this.intervalo = setInterval(() => {
                minutes = parseInt(time / 60, 10);
                seconds = parseInt(time % 60, 10);
                minutes = minutes < 10 ? "0" + minutes : minutes;
                seconds = seconds < 10 ? "0" + seconds : seconds;
                getText(getEl('#Mtimer'), `Tempo Estimado 🕘 ${minutes}m ${seconds}s`);
                --time < 0 ? clearInterval(this.intervalo) : false
            }, 1000)
        },
        stop: () => {
            clearInterval(this.intervalo);
            getText(getEl('#Mtimer'), `--:--`);
        }
    }

    if (!appcore.fs.exist(channelPath)) {
        throw 'Nenhum canal adicionado, por favor adicione um canal'
    }
    channels = appcore.channels.read()
    if (channels.length <= 0) throw 'Nenhum canal adicionado, por favor adicione um canal'
    durantion = 13.5 * (Math.ceil(channels.length / 17)) // Math.min(start + batchSize, words.length)
    let tmc = await tmi.rds();

    while (tmc != 'OPEN') await appcore.helpers.sleep(1000);

    for (let x = 0; x < channels.length; x++) {
        tmi.join(channels[x]).catch(err => {
            if (err === 'msg_channel_suspended') {
                aCount();
                appcore.helpers.sleep(300).then(() => removeChannel(`${channels[x]}`));
            }
        })

        y++
        if (x === 0) {
            ClockTimer.start(durantion)
            changeAppSide(1);
            waitLogin(true)
        }
        getText(totalCN, `🟢 Entrou: ${x + 1}/${channels.length - gCount()}`)
        if (y > 17) {
            getText(totalCN, `🟡 Aguarde: ${x + 1}/${channels.length -
                gCount()}`)
            y = 0;
            await appcore.helpers.sleep(10.5 * 1000)
        }
        await appcore.helpers.sleep(200)
    }
    ClockTimer.stop()
    waitLogin(false)
    //txtArea.value = "";
    await appcore.helpers.sleep(200)
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
