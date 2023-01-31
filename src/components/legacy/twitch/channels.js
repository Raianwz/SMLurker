const getEl = (el) => document.querySelector(el)
const Clog = (txt) => getEl('#canalLog').innerText = txt;
const newChannelInput = getEl('#txtCanal');
const clearInputs = () => { newChannelInput.focus(); Clog(''); }
let dialogOpen = false;
Listiners()

function Listiners() {
    const preventSymbols = (e) => {
        let regex = new RegExp("^[a-zA-Z0-9_.]+$");
        let key = String.fromCharCode(!e.charCode ? e.which : e.charCode);
        if (!regex.test(key)) {
            e.preventDefault();
            return false;
        }
    }
    getEl('input[name="addCanal"]').addEventListener('click', () => addCanal())
    getEl('input[name="removerCanal"]').addEventListener('click', () => removerCanal())
    getEl('div[name="loadChannelsFromFile"]').addEventListener('click', () => loadChannelsFromFile())
    getEl('#username').addEventListener('keypress', e => preventSymbols(e))
    getEl('#txtConexaoCanal').addEventListener('keypress', e => { preventSymbols(e) })
    getEl('#txtConexaoCanal').addEventListener('input', e => e.target.value = e.target.value.toLowerCase())
    newChannelInput.addEventListener('keypress', e => preventSymbols(e))
    newChannelInput.addEventListener('input', () => { newChannelInput.classList.remove('warn'); Clog('') })
}

function loadChannelsFromFile() {
    const { app, dialog } = require('@electron/remote');
    const fs = require('fs');
    const channelFilePath = `${app.getPath('userData')}\\Config\\channels.json`;
    if (!dialogOpen) {
        dialogOpen = true;

        let file = dialog.showOpenDialogSync({
            properties: ['openFile'],
            filters: [{ name: 'txt', extensions: ['txt'] }],
        });

        if (!file) {
            dialogOpen = false;
            return;
        }

        let data = fs.readFileSync(file[0], { encoding: 'utf8' });
        let channels = data.replace(/ /g, '').split(',');

        channels = fixChannels(channels);
        fs.writeFileSync(channelFilePath, JSON.stringify(channels));
        Clog('Arquivo adicionado!');
        dialogOpen = false;
    }
}


function addCanal() {
    const { app } = require('@electron/remote');
    const fs = require('fs');
    let channels = newChannelInput.value.toLowerCase();
    let channelsFilePath = `${app.getPath('userData')}\\Config\\channels.json`;
    let onList = false;

    if (!channels || !channels.replace(/ /g, '')) {
        newChannelInput.classList.add('warn');
        Clog('Por favor digite algo');
        return;
    }
    channels = fixChannels(channels.replace(/ /g, '').split(','));

    if (fs.existsSync(channelsFilePath)) {
        let oldChannels = JSON.parse(fs.readFileSync(channelsFilePath));
        for (let x in channels) {
            if (oldChannels.includes(channels[x])) onList = true;
        }
        if (!onList) {
            channels.forEach(channel => { oldChannels.push(channel) });
            fs.writeFileSync(channelsFilePath, JSON.stringify(oldChannels));
            Clog(`Adicionado com Sucesso!`);
            newChannelInput.value = "";
            setTimeout(() => clearInputs(), 1.75 * 1000);
        } else {
            Clog(`${JSON.stringify(channels).replace(/[\[\#\]"]/g, '')} já existe em sua lista!📝`);
        }
    } else {
        fs.writeFileSync(channelsFilePath, JSON.stringify(channels));
        Clog(`Adicionado com Sucesso!`);
        newChannelInput.value = "";
        setTimeout(() => clearInputs(), 1.75 * 1000);
    }
}
function removerCanal() {
    const { app } = require('@electron/remote');
    const fs = require('fs');
    let channels = newChannelInput.value.toLowerCase();
    let channelsFilePath = `${app.getPath('userData')}\\Config\\channels.json`;

    if (!channels || !channels.replace(/ /g, '')) {
        newChannelInput.classList.add('warn');
        Clog('Por favor digite algo');
        return;
    }

    channels = fixChannels(channels.replace(/ /g, '').split(','));

    if (fs.existsSync(channelsFilePath)) {
        let currentChannels = JSON.parse(fs.readFileSync(channelsFilePath)),
            onList = false;

        for (let x in channels) {
            if (currentChannels.includes(channels[x])) onList = true;
        }

        if (onList) {
            for (let x in channels) {
                currentChannels = currentChannels.filter(
                    channel => channel !== channels[x]
                );
            }
            fs.writeFileSync(channelsFilePath, JSON.stringify(currentChannels));
            Clog("Removido com Sucesso!");
            setTimeout(() => { clearInputs(); newChannelInput.value = ""; }, 2.75 * 1000);
        } else {
            newChannelInput.classList.add('warn');
            Clog('Canal não encontrado!');
            setTimeout(() => { clearInputs(); newChannelInput.value = ""; }, 15 * 1000);
            return;
        }
    } else {
        newChannelInput.classList.add('warn');
        Clog('Você não tem nenhum canal para remover!');
        setTimeout(() => { clearInputs(); newChannelInput.value = ""; }, 60 * 1000);
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