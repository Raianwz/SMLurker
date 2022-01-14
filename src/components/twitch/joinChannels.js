const fs = require('fs'), path = require('path');
const { app } = require('@electron/remote');
const sleep = require('../helpers/sleep');
const env = require('../helpers/env');
const { dirname } = require('path');
const getEl = (el) => document.querySelector(el)
const getText = (el, txt) => el.textContent = `${txt}`
let y = 0, durantion;

module.exports = async client => {
    let channelPath = `${app.getPath('userData')}\\Config\\channels.json`,
        channels, cnCount = getEl('#cnCount'), cnTotal = getEl('#cntotal'), txtArea = getEl('#pTable'),
        tmp = genTimer();

        if(env(app)==='DEV') channelPath = path.join(__dirname,'../../../DevData/channels.json');

    if (!fs.existsSync(channelPath)) {
        throw 'Nenhum canal adicionado, por favor adicione um canal';
    } else if (JSON.parse(fs.readFileSync(channelPath, { encoding: 'utf8' })).length <= 0) {
        throw 'Nenhum canal adicionado, por favor adicione um canal';
    } else {
        channels = JSON.parse(fs.readFileSync(channelPath, { encoding: 'utf8' }));
    }
    durantion = channels.length;

    while (client.readyState() != 'OPEN') await sleep(1000);

    for (let x = 0; x < channels.length; x++) {
        client.join(channels[x]).catch(err => {
            if (err === 'msg_channel_suspended') removeChannel(`${channels[x]}`)
        });
        y++
        x + 1 == 1 ? tmp.iniTimer(durantion) : false
        x + 1 == 1 ? waitLoad() : false
        x < 5 ? getText(cnCount, `Entrou em ${x + 1} de ${channels.length} canais.`)
            : getText(cnTotal, `🟢 Entrou: ${x + 1}/${channels.length}`)
        if (y > 17) {
            getText(cnTotal, `🟡 Aguarde: ${x + 1}/${channels.length}`)
            y = 0;
            await sleep(10.5 * 1000)
        }
        await sleep(200);
    }
    waitLogin(false)
    txtArea.value = "";
    getText(cnCount, "");
    getText(cnTotal, `🟣 Canais: ${channels.length}`);
};

async function waitLoad() {
    getEl('#pTable').value = `\n\n\n🔸Só é possivel se conectar em até 20 Canais em menos de 10 segundos, acima disso a Twitch irá lhe desconectar.\n🔹A Solução foi colocar sua lista em uma fila onde a cada 18 Canais um delay de 10s é aplicado.`;
    criarUser();
    changeButtonSide(getEl('#btnEntrar'), 1);
    waitLogin(true)
}

function waitLogin(valor) {
    const items = ['#Mtotal', '#Ptotal', '[name="clearPing"]', '.sgSom','#JoinCanalExtra']
    const Mtitle = (txt) => getEl('.mentionsWrapper').children[0].textContent = txt
    valor == true ? getEl('.mentionsWrapper').children[0].style.fontWeight = 100 : getEl('.mentionsWrapper').children[0].removeAttribute('style')
    valor == true ? valor = 'hidden' : valor = 'visible';
    valor == true ? tmp.iniTimer(durantion) : false
    valor !== 'visible' ? getEl('#Mtimer').style.display = 'flex' : getEl('#Mtimer').style.display = 'none'
    for (let i = 0; i < items.length; i++) {
        getEl(items[i]).style.visibility = valor
    }

}

function genTimer() {
    let clock, minutes, seconds;
    function iniTimer(timer) {
        clock = setInterval(function () {
            minutes = parseInt(timer / 60, 10);
            seconds = parseInt(timer % 60, 10);
            minutes = minutes < 10 ? "0" + minutes : minutes;
            seconds = seconds < 10 ? "0" + seconds : seconds;
            getText(getEl('#Mtimer'), `Tempo Estimado🕘 ${minutes}m ${seconds}s`)
            if (--timer < 0) stopTimer()
        }, 1000);
    }
    function stopTimer() { clearInterval(clock); }
    return { iniTimer, stopTimer }
}

function removeChannel(canal) {
    const { app, dialog } = require('@electron/remote');
    let channels = canal.toString();
    let channelsFilePath = `${app.getPath('userData')}\\Config\\channels.json`,
        BackupChannels = `${app.getPath('desktop')}\\SMLurker_Lista.backup.txt`
    if (fs.existsSync(channelsFilePath)) {
        let currentChannels = JSON.parse(fs.readFileSync(channelsFilePath)),
            onList = false, filtro, errMsg = `O canal ${channels.toUpperCase()} foi removido da sua Lista de Canais\n\tMotivo: Este canal não existe ou foi suspenso.\n\nUm arquivo de backup foi criado em sua área de trabalho!`;

        if (currentChannels.includes(channels)) onList = true;
        if (onList) {
            filtro = currentChannels.filter(channel => channel !== channels);
            currentChannels.sort();
            currentChannels = JSON.stringify(currentChannels).replace(/[\"\[\]]/g, '');
            fs.writeFileSync(channelsFilePath, JSON.stringify(filtro));
            fs.writeFileSync(BackupChannels, currentChannels);
            dialog.showMessageBoxSync({
                type: 'info',
                title: 'Canal Removido — SMLurker',
                message: errMsg,
            })
        }

    }
}