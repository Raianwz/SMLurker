//const api = require("../../../preload").API
const getEl = (el) => document.querySelector(el)
const Clog = (txt) => getEl('#canalLog').innerText = txt;
const newChannelInput = getEl('#txtCanal');
const clearInputs = () => { newChannelInput.focus(); Clog(''); }
let dialogOpen = false
btnsListener()

function btnsListener() {
    const Notify = async () => api.tw.data.loadNotify();
    const mentions = getEl('#swt_notifyMe'), subgift = getEl('#swt_notifyGift');
    const preventSymbols = (e) => {
        let regex = new RegExp("^[a-zA-Z0-9_.]+$");
        let key = String.fromCharCode(!e.charCode ? e.which : e.charCode);
        if (!regex.test(key)) {
            e.preventDefault();
            return false;
        }
    }
    getEl('input[name="addCanal"]').addEventListener('click', () => getEl('input[name="addCanal"]').className.includes('block') ? true : addChannel())
    getEl('input[name="removerCanal"]').addEventListener('click', () => getEl('input[name="removerCanal"]').className.includes('block') ? true : removeChannel())
    getEl('div[name="loadChannelsFromFile"]').addEventListener('click', () => getEl('div[name="loadChannelsFromFile"]').className.includes('block') ? true : loadChannelsFromFile())
    getEl('#username').addEventListener('keypress', e => preventSymbols(e))
    getEl('#txtConexaoCanal').addEventListener('keypress', e => { preventSymbols(e) })
    getEl('#txtConexaoCanal').addEventListener('input', e => e.target.value = e.target.value.toLowerCase())
    newChannelInput.addEventListener('keypress', e => preventSymbols(e))
    newChannelInput.addEventListener('input', () => { newChannelInput.classList.remove('warn'); Clog('') })
    mentions.addEventListener('click', async () => await Notify())
    subgift.addEventListener('click', async () => await Notify())
}

async function loadChannelsFromFile() {
    const channelFilePath = `${api.app.getPath('userData')}\\Config\\channels.json`;
    if (!dialogOpen) {
        dialogOpen = true;
        let file = api.dg.showODS({
            properties: ['openFile'],
            filters: [{ name: 'txt', extensions: ['txt'] }],
        })
        if (!file) {
            dialogOpen = false;
            return
        }
        let data = api.fs.rd(file[0])
        let channels = data.replace(/ /g, '').split(',')
        channels = fixChannels(channels);
        api.fs.write(channelFilePath, JSON.stringify(channels))
        Clog('🟢Arquivo adicionado!');
        dialogOpen = false;
    }
}

function addChannel() {
    const channelFilePath = `${api.app.getPath('userData')}\\Config\\channels.json`;;
    let channels = newChannelInput.value.toLowerCase()
    let onList = false;

    if (!channels || !channels.replace(/ /g, '')) {
        newChannelInput.classList.add('warn');
        Clog('Por favor digite algo');
        return;
    }
    channels = fixChannels(channels.replace(/ /g, '').split(','));
    if (api.fs.exist(channelFilePath)) {
        let oldChannels = JSON.parse(api.fs.rd(channelFilePath))
        for (let x in channels) {
            if (oldChannels.includes(channels[x])) onList = true
        }
        if (!onList) {
            channels.forEach(chn => oldChannels.push(chn))
            api.fs.write(channelFilePath, JSON.stringify(oldChannels))
            Clog(`✅Adicionado com Sucesso!`)
            newChannelInput.value = ""
            api.helpers.sleep('1750').then(() => clearInputs())
        } else {
            Clog(`${JSON.stringify(channels).replace(/[\[\#\]"]/g, '')} já existe em sua lista!📝`);
        }
    } else {
        api.fs.write(channelFilePath, JSON.stringify(channels))
        Clog(`✅Adicionado com Sucesso!`);
        newChannelInput.value = "";
        api.helpers.sleep('1750').then(() => clearInputs())
    }
}

function removeChannel() {
    const channelFilePath = `${api.app.getPath('userData')}\\Config\\channels.json`;;
    let channels = newChannelInput.value.toLowerCase()

    if (!channels || !channels.replace(/ /g, '')) {
        newChannelInput.classList.add('warn');
        Clog('Por favor digite um nome de canal');
        return;
    }
    channels = fixChannels(channels.replace(/ /g, '').split(','));
    if (api.fs.read(channelFilePath)) {
        let currentChns = JSON.parse(api.fs.rd(channelFilePath));
        let onList = false
        for (let x in channels) { if (currentChns.includes(channels[x])) onList = true }

        if (onList) {
            for (let x in channels) currentChns = currentChns.filter(
                chn => chn !== channels[x]
            )
            api.fs.write(channelFilePath, JSON.stringify(currentChns))
            Clog("❎Removido com Sucesso!")
            api.helpers.sleep('2750').then(() => clearInputs())
        } else {
            newChannelInput.classList.add('warn')
            Clog('🫤Canal não encontrado!');
            api.helpers.sleep('15000').then(() => clearInputs())
            return
        }
    } else {
        newChannelInput.classList.add('warn');
        Clog('⛔Não há nenhum canal para remover!');
        api.helpers.sleep('30000').then(() => clearInputs())
        return;
    }
}

function fixChannels(channels) {
    for (let x in channels) {
        if (channels[x] == '') channels.splice(x, 1);
    }
    for (let x in channels) {
        if (!channels[x].startsWith('#')) channels[x] = `#${channels[x]}`;
    }
    return channels;
}