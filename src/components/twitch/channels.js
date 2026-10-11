//const api = require("../../../preload").API
const getEl = (el) => document.querySelector(el)
const Clog = (txt) => getEl('#canalLog').innerText = txt;
const newChannelInput = getEl('#txtCanal');
const clearInputs = () => { newChannelInput.focus(); Clog(''); }
let dialogOpen = false
let viewingChannelList = false;
let savedChannelList = [];
let channelListReadError = false;
let pendingChannelRemoval = null;
btnsListener()

function clearMissingChannelsWarning() {
    const warning = document.getElementById('classicLoginError');
    if (!warning || warning.hidden) return;
    warning.textContent = '';
    warning.hidden = true;
}

function refreshChannelList() {
    try {
        const filePath = api.cr.channels.path();
        const channels = api.cr.fs.exist(filePath) ? api.cr.channels.read() : [];
        if (!Array.isArray(channels)) throw new Error('Lista de canais inválida');
        savedChannelList = channels.filter(channel => typeof channel === 'string')
            .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
        channelListReadError = false;
    } catch {
        savedChannelList = [];
        channelListReadError = true;
    }

    const toggle = getEl('#toggleChannelList');
    toggle.textContent = viewingChannelList ? 'Voltar' : channelListReadError
        ? 'Ver lista' : `Ver lista (${savedChannelList.length})`;
    renderChannelList();
}

function renderChannelList() {
    const search = getEl('#channelListSearch').value.trim().toLowerCase().replace(/^#/, '');
    const matches = savedChannelList.filter(channel => channel.replace(/^#/, '').toLowerCase().includes(search));
    const list = getEl('#channelListItems');
    const items = matches.map(channel => {
        const item = document.createElement('li');
        item.className = 'channel-list-item';
        const name = document.createElement('span');
        name.textContent = channel;
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'channel-list-remove';
        remove.textContent = '×';
        remove.title = `Remover ${channel}`;
        remove.setAttribute('aria-label', `Remover ${channel}`);
        remove.disabled = newChannelInput.disabled;
        remove.addEventListener('click', () => openChannelRemoveDialog(channel));
        item.append(name, remove);
        return item;
    });
    list.replaceChildren(...items);

    getEl('#channelListSummary').textContent = channelListReadError
        ? 'Lista indisponível' : search
            ? `${matches.length} de ${savedChannelList.length} canais` :
            `${savedChannelList.length} ${savedChannelList.length === 1 ? 'canal salvo' : 'canais salvos'}`;
    const empty = getEl('#channelListEmpty');
    empty.hidden = matches.length > 0;
    empty.textContent = channelListReadError ? 'Não foi possível ler a lista de canais.' :
        savedChannelList.length === 0 ? 'Nenhum canal salvo ainda.' : 'Nenhum canal encontrado.';
}

function toggleChannelList() {
    viewingChannelList = !viewingChannelList;
    getEl('#channelManagerEditor').classList.toggle('none', viewingChannelList);
    getEl('#channelListView').classList.toggle('none', !viewingChannelList);
    getEl('#toggleChannelList').setAttribute('aria-expanded', String(viewingChannelList));
    if (viewingChannelList) getEl('#channelListSearch').value = '';
    refreshChannelList();
    if (viewingChannelList) getEl('#channelListSearch').focus();
}

function openChannelRemoveDialog(channel) {
    if (newChannelInput.disabled) return;
    pendingChannelRemoval = channel;
    getEl('#channelRemoveName').textContent = channel;
    getEl('#channelRemoveDialog').showModal();
    getEl('#channelRemoveCancel').focus();
}

function confirmChannelRemoval() {
    const channel = pendingChannelRemoval;
    getEl('#channelRemoveDialog').close();
    pendingChannelRemoval = null;
    if (!channel || newChannelInput.disabled) return;

    const filePath = api.cr.channels.path();
    const channels = api.cr.fs.exist(filePath) ? api.cr.channels.read() : [];
    const remaining = channels.filter(saved => saved !== channel);
    if (remaining.length !== channels.length) {
        api.cr.fs.write(filePath, JSON.stringify(remaining));
        Clog(`${channel} removido da lista.`);
    }
    refreshChannelList();
    getEl('#channelListSearch').focus();
}


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
    getEl('button[name="addCanal"]').addEventListener('click', addChannel)
    getEl('button[name="removerCanal"]').addEventListener('click', removeChannel)
    getEl('button[name="loadChannelsFromFile"]').addEventListener('click', loadChannelsFromFile)
    getEl('button[name="exportFileList"]').addEventListener('click', exportListChannels)
    getEl('button[name="clearChannelList"]').addEventListener('click', clearChannelList)
    getEl('#toggleChannelList').addEventListener('click', toggleChannelList)
    getEl('#channelListSearch').addEventListener('input', renderChannelList)
    getEl('#channelRemoveCancel').addEventListener('click', () => getEl('#channelRemoveDialog').close())
    getEl('#channelRemoveConfirm').addEventListener('click', confirmChannelRemoval)
    getEl('#channelRemoveDialog').addEventListener('close', () => { pendingChannelRemoval = null; })
    getEl('#username').addEventListener('keypress', e => preventSymbols(e))
    getEl('#txtConexaoCanal').addEventListener('keypress', e => { preventSymbols(e) })
    getEl('#txtConexaoCanal').addEventListener('input', e => e.target.value = e.target.value.toLowerCase())
    newChannelInput.addEventListener('keypress', e => {
        const key = String.fromCharCode(!e.charCode ? e.which : e.charCode);
        if (key !== ',') preventSymbols(e);
    })
    newChannelInput.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        if (!newChannelInput.disabled && !getEl('button[name="addCanal"]').disabled) addChannel();
    })
    newChannelInput.addEventListener('input', () => { newChannelInput.classList.remove('warn'); Clog('') })
    mentions.addEventListener('click', async () => await Notify())
    subgift.addEventListener('click', async () => await Notify())
    refreshChannelList()
}

async function loadChannelsFromFile() {
    const channelFilePath = api.cr.channels.path();
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
        refreshChannelList();
        if (channels.length > 0) clearMissingChannelsWarning();
        Clog('🟢Arquivo adicionado!');
        dialogOpen = false;
    }
}

async function exportListChannels() {
    let channelsFilePath = api.cr.channels.path();
    if (api.cr.fs.exist(channelsFilePath)) {
        let channels = api.cr.channels.read()
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
    const channelFilePath = api.cr.channels.path();
    if (!api.cr.fs.exist(channelFilePath) || api.cr.channels.read().length === 0) {
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
    refreshChannelList();
    Clog('Lista de canais limpa!')
}

function addChannel() {
    const channelFilePath = api.cr.channels.path();
    const channels = fixChannels(newChannelInput.value.replace(/\s/g, '').split(','));

    if (channels.length === 0) {
        newChannelInput.classList.add('warn');
        Clog('Por favor digite um nome de canal');
        return;
    }

    const oldChannels = api.cr.fs.exist(channelFilePath) ? api.cr.channels.read() : [];
    const existing = new Set(oldChannels);
    const newChannels = channels.filter(channel => !existing.has(channel));
    if (newChannels.length === 0) {
        Clog(channels.length === 1 ? 'Este canal já está na lista!' : 'Todos esses canais já estão na lista!');
        return;
    }

    api.cr.fs.write(channelFilePath, JSON.stringify([...oldChannels, ...newChannels]));
    refreshChannelList();
    clearMissingChannelsWarning();
    const skipped = channels.length - newChannels.length;
    const addedText = newChannels.length === 1 ? '1 canal adicionado' : `${newChannels.length} canais adicionados`;
    Clog(`✅ ${addedText}${skipped ? `; ${skipped} já estava${skipped === 1 ? '' : 'm'} na lista` : ''}!`);
    newChannelInput.value = '';
    api.cr.helpers.sleep('1750').then(() => clearInputs());
}

function removeChannel() {
    const channelFilePath = api.cr.channels.path();
    let channels = newChannelInput.value.toLowerCase()

    if (!channels || !channels.replace(/ /g, '')) {
        newChannelInput.classList.add('warn');
        Clog('Por favor digite um nome de canal');
        return;
    }
    channels = fixChannels(channels.replace(/ /g, '').split(','));
    if (api.cr.fs.exist(channelFilePath)) {
        let currentChns = api.cr.channels.read();
        let onList = false
        for (let x in channels) { if (currentChns.includes(channels[x])) onList = true }

        if (onList) {
            for (let x in channels) currentChns = currentChns.filter(
                chn => chn !== channels[x]
            )
            api.cr.fs.write(channelFilePath, JSON.stringify(currentChns))
            refreshChannelList();
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
