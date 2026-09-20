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
    localStorage.getItem('volume') === null ? localStorage.setItem('volume', 30) : getEl('input#volBar').value = localStorage.getItem('volume');
    localStorage.getItem('volume') !== null ? getEl('#volTxt').innerText = localStorage.getItem('volume') : false
    getEl('input#volBar').addEventListener('input', () => { localStorage.setItem('volume', getEl('input#volBar').value); getEl('#volTxt').innerText = getEl('input#volBar').value })
    getEl('div[name="addCanal"]').addEventListener('click', () => getEl('div[name="addCanal"]').className.includes('block') ? true : addChannel())
    getEl('div[name="removerCanal"]').addEventListener('click', () => getEl('div[name="removerCanal"]').className.includes('block') ? true : removeChannel())
    getEl('div[name="loadChannelsFromFile"]').addEventListener('click', () => getEl('div[name="loadChannelsFromFile"]').className.includes('block') ? true : loadChannelsFromFile())
    getEl('div[name="exportFileList"]').addEventListener('click', () => getEl('div[name="exportFileList"]').className.includes('block') ? true : exportListChannels())
    getEl('div[name="clearChannelList"]').addEventListener('click', () => getEl('div[name="clearChannelList"]').className.includes('block') ? true : clearChannelList())
    getEl('#username').addEventListener('keypress', e => preventSymbols(e))
    getEl('#txtConexaoCanal').addEventListener('keypress', e => { preventSymbols(e) })
    getEl('#txtConexaoCanal').addEventListener('input', e => e.target.value = e.target.value.toLowerCase())
    newChannelInput.addEventListener('keypress', e => preventSymbols(e))
    newChannelInput.addEventListener('input', () => { newChannelInput.classList.remove('warn'); Clog('') })
    mentions.addEventListener('click', async () => await Notify())
    subgift.addEventListener('click', async () => await Notify())
}

async function loadChannelsFromFile() {
    const channelFilePath = `${api.cr.appr.getPath('userData')}\\Config\\channels.json`;
    if (!dialogOpen) {
        dialogOpen = true;
        let file = api.cr.dg.showODS({
            properties: ['openFile'],
            filters: [{ name: 'Listas de canais', extensions: ['txt', 'json'] }],
        })
        if (!file) {
            dialogOpen = false;
            return
        }
        let data = api.cr.fs.rd(file[0])
        let channels
        if (file[0].toLowerCase().endsWith('.json')) {
            let parsed
            try {
                parsed = JSON.parse(data)
            } catch {
                dialogOpen = false
                api.cr.dg.showMB({
                    type: 'error',
                    title: 'Importar Lista — SMLurker',
                    message: 'O arquivo JSON não pôde ser lido.',
                })
                return
            }
            channels = Array.isArray(parsed) ? parsed : parsed.channels
            if (!Array.isArray(channels)) {
                dialogOpen = false
                api.cr.dg.showMB({
                    type: 'error',
                    title: 'Importar Lista — SMLurker',
                    message: 'O JSON não contém uma lista de canais válida.',
                })
                return
            }
        } else {
            channels = data.split(/[\s,;]+/)
        }
        channels = [...new Set(fixChannels(channels.filter(channel => typeof channel === 'string')))];
        api.cr.fs.write(channelFilePath, JSON.stringify(channels))
        Clog('🟢Arquivo adicionado!');
        dialogOpen = false;
    }
}

async function exportListChannels() {
    let channelsFilePath = `${api.cr.appr.getPath('userData')}\\Config\\channels.json`;
    if (api.cr.fs.exist(channelsFilePath)) {
        let channels = JSON.parse(api.cr.fs.rd(channelsFilePath))
        channels.sort()
        let dt = new Date().toLocaleDateString().replaceAll("/",'.')

        const listaDialog = api.cr.dg.showSD({
            properties: ['dontAddToRecent'],
            filters: [
                { name: 'Lista em texto', extensions: ['txt'] },
                { name: 'Lista em JSON', extensions: ['json'] },
            ],
            defaultPath: `*/minha_lista.${dt}`,
            title: 'Exportar Lista',
        })
        const lista = await listaDialog

        if (!lista.canceled) {
            const asJson = lista.filePath.toLowerCase().endsWith('.json')
            const contents = asJson ? JSON.stringify(channels, null, 2) : channels.join(',')
            api.cr.fs.write(lista.filePath, contents);
        }

    } else {
        api.cr.dg.showMB({
            type: 'warning',
            title: 'Configurações — SM Lurker ',
            message: 'Você não tem nenhum canal adicionado para exportar como lista.',
        })
    }
}

function clearChannelList() {
    const channelFilePath = `${api.cr.appr.getPath('userData')}\\Config\\channels.json`;
    if (!api.cr.fs.exist(channelFilePath) || JSON.parse(api.cr.fs.rd(channelFilePath)).length === 0) {
        Clog('Não há nenhum canal para limpar!')
        return
    }

    const firstConfirmation = api.cr.dg.showMB({
        type: 'warning',
        buttons: ['Cancelar', 'Continuar'],
        defaultId: 0,
        cancelId: 0,
        title: 'Limpar Lista — SMLurker',
        message: 'Deseja remover todos os canais da lista?',
        detail: 'Esta ação não poderá ser desfeita.',
    })
    if (firstConfirmation !== 1) return

    const secondConfirmation = api.cr.dg.showMB({
        type: 'warning',
        buttons: ['Cancelar', 'Limpar lista'],
        defaultId: 0,
        cancelId: 0,
        title: 'Confirmar Limpeza — SMLurker',
        message: 'Confirma a remoção de todos os canais?',
    })
    if (secondConfirmation !== 1) return

    api.cr.fs.write(channelFilePath, JSON.stringify([]))
    Clog('Lista de canais limpa!')
}

function addChannel() {
    const channelFilePath = `${api.cr.appr.getPath('userData')}\\Config\\channels.json`;;
    let channels = newChannelInput.value.toLowerCase()
    let onList = false;

    if (!channels || !channels.replace(/ /g, '')) {
        newChannelInput.classList.add('warn');
        Clog('Por favor digite um nome de canal');
        return;
    }
    channels = fixChannels(channels.replace(/ /g, '').split(','));
    if (api.cr.fs.exist(channelFilePath)) {
        let oldChannels = JSON.parse(api.cr.fs.rd(channelFilePath))
        for (let x in channels) {
            if (oldChannels.includes(channels[x])) onList = true
        }
        if (!onList) {
            channels.forEach(chn => oldChannels.push(chn))
            api.cr.fs.write(channelFilePath, JSON.stringify(oldChannels))
            Clog(`✅Adicionado com Sucesso!`)
            newChannelInput.value = ""
            api.cr.helpers.sleep('1750').then(() => clearInputs())
        } else {
            Clog(`${JSON.stringify(channels).replace(/[\[\#\]"]/g, '')} já existe em sua lista!📝`);
        }
    } else {
        api.cr.fs.write(channelFilePath, JSON.stringify(channels))
        Clog(`✅Adicionado com Sucesso!`);
        newChannelInput.value = "";
        api.cr.helpers.sleep('1750').then(() => clearInputs())
    }
}

function removeChannel() {
    const channelFilePath = `${api.cr.appr.getPath('userData')}\\Config\\channels.json`;
    let channels = newChannelInput.value.toLowerCase()

    if (!channels || !channels.replace(/ /g, '')) {
        newChannelInput.classList.add('warn');
        Clog('Por favor digite um nome de canal');
        return;
    }
    channels = fixChannels(channels.replace(/ /g, '').split(','));
    if (api.cr.fs.read(channelFilePath)) {
        let currentChns = JSON.parse(api.cr.fs.rd(channelFilePath));
        let onList = false
        for (let x in channels) { if (currentChns.includes(channels[x])) onList = true }

        if (onList) {
            for (let x in channels) currentChns = currentChns.filter(
                chn => chn !== channels[x]
            )
            api.cr.fs.write(channelFilePath, JSON.stringify(currentChns))
            Clog('❎Removido com Sucesso!')
            api.cr.helpers.sleep('2750').then(() => clearInputs())
        } else {
            newChannelInput.classList.add('warn')
            Clog('🫤Canal não encontrado!');
            api.cr.helpers.sleep('15000').then(() => clearInputs())
            return
        }
    } else {
        newChannelInput.classList.add('warn');
        Clog('⛔Não há nenhum canal para remover!');
        api.cr.helpers.sleep('30000').then(() => clearInputs())
        return;
    }
}

function fixChannels(channels) {
    return [...new Set(channels
        .filter(channel => typeof channel === 'string')
        .map(channel => channel.trim().toLowerCase())
        .filter(Boolean)
        .map(channel => channel.startsWith('#') ? channel : `#${channel}`)
    )]
}
