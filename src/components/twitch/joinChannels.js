const fs = require('fs');
const { remote: { app } } = require('electron');
const sleep = require('../helpers/sleep');
const getEl = (el) => document.querySelector(el)
const getText = (el, txt) => el.textContent = `${txt}`
let y = 0, durantion;

module.exports = async client => {
    let channelPath = `${app.getPath('userData')}\\Config\\channels.json`,
        channels,
        cnCount = getEl('#cnCount'),
        cnTotal = getEl('#cntotal'),
        txtArea = getEl('#pTable'),
        tmp = genTimer();

    if (!fs.existsSync(channelPath)) {
        throw 'Nenhum canal adicionado, por favor adicione um canal';
    } else if (JSON.parse(fs.readFileSync(channelPath, { encoding: 'utf8' })).length <= 0) {
        throw 'Nenhum canal adicionado, por favor adicione um canal';
    } else {
        channels = JSON.parse(fs.readFileSync(channelPath, { encoding: 'utf8' }));
    }
    duration = channels.length >= 36 ? channels.length - 34 : channels.length

    while (client.readyState() != 'OPEN') await sleep(1000);

    for (let x = 0; x < channels.length; x++) {
        client.join(channels[x]).catch(err => { });
        y++
        x + 1 == 1 ? tmp.iniTimer(duration) : false
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
    getEl('#pTable').value = `\n🔸A Twitch atualizou e agora só será possivel se conectar em até 20 Canais em menos de 10 segundos, acima disso o servidor irá lhe desconectar.\n🔹A Solução foi colocar sua lista em uma fila onde a cada 18 Canais um delay de 10s é aplicado.`;
    criarUser();
    changeButtonSide(getEl('#btnEntrar'), 1);
    waitLogin(true)
}

function waitLogin(valor) {
    const items = ['#Mtotal', '#Ptotal', '[name="clearPing"]', '.sgSom']
    const Mtitle = (txt) => getEl('.mentionsWrapper').children[0].textContent = txt
    valor == true ? Mtitle('🚨ATENÇÃO🚨') : Mtitle('Menções')
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
            getText(getEl('#Mtimer'), `🕘 ${minutes}m ${seconds}s`)
            if (--timer < 0) {
                stopTimer()
            }
        }, 1000);
    }
    function stopTimer() { clearInterval(clock); }

    return { iniTimer, stopTimer }
}