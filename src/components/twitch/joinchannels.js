const { API } = require('../../../preload')
const { SCore } = require('../../internal/smcore')
const api = API;
const tmi = SCore.tmi;
const changeButtonSide = (btn, dest) => api.tr.changeside(btn, dest)
const gCount = () => api.tw.lv.get(), aCount = () => api.tw.lv.add();

/*==============================================(ENTRANDO EM CANAIS)===========================================*/
//Ativar/Desativar tempo estimado
function waitLogin(valor) {
    const getEl = (el) => document.querySelector(el)
    const items = ['#Mtotal', '#Ptotal', '[name="clearPing"]', '.sgSom', '#JoinCanalExtra']
    valor == true ? valor = 'hidden' : valor = 'visible';
    valor !== 'visible' ? getEl('#Mtimer').style.display = 'flex' : getEl('#Mtimer').style.display = 'none'
    for (let i = 0; i < items.length; i++) {
        getEl(items[i]).style.visibility = valor
    }
}

//Entrar em canais & Gerênciar fila
async function joinChannels() {
    const getEl = (el) => document.querySelector(el)
    const getText = (el, txt) => el.textContent = `${txt}`
    let channelPath = `${api.app.getPath('userData')}\\Config\\channels.json`
    let totalCN = getEl('#cntotal'), txtArea = getEl('#pTable'), channels = {};
    let y = 0, durantion = 0;
    console.log('oi')
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

    if (api.helpers.env() === 'DEV') channelPath = api.path.join('./DevData/channels.json')

    if (!api.fs.exist(channelPath)) {
        throw 'Nenhum canal adicionado, por favor adicione um canal'
    } else if (JSON.parse(api.fs.rd(channelPath)).length <= 0) {
        throw 'Nenhum canal adicionado, por favor adicione um canal'
    } else {
        channels = JSON.parse(api.fs.rd(channelPath))
    }
    durantion = channels.length
    console.log(durantion)
    let tmc = await tmi.rds();

    while (tmc != 'OPEN') await api.helpers.sleep(1000);

    for (let x = 0; x < channels.length; x++) {
        console.log(`\nAntes: ${channels[x]}`)
        tmi.join(channels[x]).catch(err => {
            if (err === 'msg_channel_suspended') {
                aCount();
                api.helpers.sleep(300).then(() => removeChannel(`${channels[x]}`));
            }
        })
        console.log(`\nDepois: ${channels[x]}`)
        y++
        if (x === 0) {
            getEl('#pTable').value = `\n\n\n🔸Só é possivel se conectar em até 20 Canais em menos de 10 segundos, acima disso a Twitch irá lhe desconectar.\n🔹Sua lista foi coloca em uma fila onde a cada 18 Canais um delay de 10 segundos é aplicado.`;
            changeButtonSide(getEl('#btnEntrar'), 1);
            waitLogin(true)
            ClockTimer.start(durantion)
        }
        getText(totalCN, `🟢 Entrou: ${x + 1}/${channels.length - gCount()}`)
        if (y > 17) {
            getText(totalCN, `🟡 Aguarde: ${x + 1}/${channels.length -
                gCount()}`)
            y = 0;
            await api.helpers.sleep(10.5 * 1000)
        }
        await api.helpers.sleep(200)
    }
    ClockTimer.stop()
    waitLogin(false)
    txtArea.value = "";
    await api.helpers.sleep(200)
    getText(totalCN, `🟣 Canais: ${channels.length - gCount()}`);
}

//Remover canais banidos/suspensos ou inexistente
function removeChannel(chn) {
    let channels = chn.toString()
    let dt = new Date().toLocaleDateString().replaceAll('/', '.')
    let channelPath = `${api.app.getPath('userData')}\\Config\\channels.json`;
    let bkChannels = `${api.app.getPath('desktop')}\\smlurker_lista.backup.${dt}.txt`;
    if (api.helpers.env() === 'DEV') channelPath = api.path.join('./DevData/channels.json')
    if (api.fs.exist(channelPath)) {
        let currentCn = JSON.parse(api.fs.rd(channelPath))
        let errMsg = `O canal ${channels.toUpperCase()} foi removido da sua Lista de Canais\n\tMotivo: Este canal não existe ou foi suspenso.\n\nUm arquivo de backup foi criado em sua área de trabalho!`;
        let onList = false, filtro;

        if (currentCn.includes(channels)) onList = true;
        if (onList) {
            filtro = currentCn.filter(channel => channel !== channels);
            currentCn.sort()
            currentCn = JSON.stringify(currentCn).replace(/[\"\[\]]/g, '')
            api.fs.write(channelPath, JSON.stringify(filtro))
            api.fs.write(bkChannels, currentCn)
            api.dg.showMB({
                type: 'info',
                title: 'Canal Removido — SMLurker',
                message: errMsg,
            });
        }
    }
}

module.exports.jc = joinChannels;