const clearInputs = (log) => { newChannelInput.focus(); log.innerHTML = ''; }
const getEl = (el) => document.querySelector(el)
let dialogOpen = false;
Listiners()

function Listiners() {
    getEl('input[name="addCanal"]').addEventListener('click', () => addCanal())
    getEl('input[name="removerCanal"]').addEventListener('click', () => removerCanal())
    getEl('div[name="loadChannelsFromFile"]').addEventListener('click', () => loadChannelsFromFile())
}

function loadChannelsFromFile() {
    const { remote: { app, dialog } } = require('electron');
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
        let loadStatus = getEl('#canalLog');

        channels = fixChannels(channels);
        fs.writeFileSync(channelFilePath, JSON.stringify(channels));
        loadStatus.innerHTML = 'Arquivo adicionado!';
        dialog = false;
    }
}

let newChannelInput = getEl('#txtCanal');
newChannelInput.onchange = () => newChannelInput.classList.remove('warn');

function addCanal() {
    const { remote: { app } } = require('electron');
    const fs = require('fs');
    let channels = newChannelInput.value.toLowerCase();

    let log = getEl('#canalLog');
    let channelsFilePath = `${app.getPath('userData')}\\Config\\channels.json`;

    if (!channels || !channels.replace(/ /g, '')) {
        newChannelInput.classList.add('warn');
        log.innerHTML = 'Por favor digite algo';
        setTimeout(() => { clearInputs(log); newChannelInput.classList.remove('warn') }, 60 * 1000);
        return;
    }
    channels = fixChannels(channels.replace(/ /g, '').split(','));

    if (fs.existsSync(channelsFilePath)) {
        let oldChannels = fs.readFileSync(channelsFilePath);
        oldChannels = JSON.parse(oldChannels);
        channels.forEach(channel => { oldChannels.push(channel) });

        fs.writeFileSync(channelsFilePath, JSON.stringify(oldChannels));
        log.innerHTML = `Adicionado com Sucesso!`;
        newChannelInput.value = "";
        setTimeout(() => clearInputs(log), 1.75 * 1000);
    } else {
        fs.writeFileSync(channelsFilePath, JSON.stringify(channels));
        log.innerHTML = `Adicionado com Sucesso!`;
        newChannelInput.value = "";
        setTimeout(() => clearInputs(log), 1.75 * 1000);
    }
}
function removerCanal() {
    const { remote: { app } } = require('electron');
    const fs = require('fs');
    let channels = newChannelInput.value.toLowerCase();

    let log = getEl('#canalLog');
    let channelsFilePath = `${app.getPath('userData')}\\Config\\channels.json`;

    if (!channels || !channels.replace(/ /g, '')) {
        newChannelInput.classList.add('warn');
        log.innerHTML = 'Por favor digite algo';
        return;
    }

    channels = fixChannels(channels.replace(/ /g, '').split(','));

    if (fs.existsSync(channelsFilePath)) {
        let currentChannels = fs.readFileSync(channelsFilePath),
            onList = false;

        currentChannels = JSON.parse(currentChannels);

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
            log.innerHTML = "Removido com Sucesso!";
            setTimeout(() => { clearInputs(log); newChannelInput.value = ""; }, 2.75 * 1000);
        } else {
            newChannelInput.classList.add('warn');
            log.innerHTML = 'Canal não encontrado!';
            setTimeout(() => { clearInputs(log); newChannelInput.value = ""; }, 15 * 1000);
            return;
        }
    } else {
        newChannelInput.classList.add('warn');
        log.innerHTML = 'Você não tem nenhum canal para remover!';
        setTimeout(() => { clearInputs(log); newChannelInput.value = ""; }, 60 * 1000);
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