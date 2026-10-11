const { ipcRenderer } = require('electron');
const { getCurrentWindow } = require('@electron/remote');
const {appcore } = require('../../internal/appcore')
const getEl = (el) => document.querySelector(el)
let consoleText = getEl('#txtPanel'), msgTotal = getEl('#txtTotal'), metionTotal = getEl('#mnTotal'), cnTotal = getEl('#cnTotal');
const panelEmpty = getEl('#panelEmpty');
let tmpM = 0;
const barText = (el, txt) => el.innerText = txt;
const updateEmptyState = () => { panelEmpty.hidden = consoleText.value.length > 0; }
const cnPnReset = () => { consoleText.value = ""; barText(msgTotal, 'Texto: 0/6000'); barText(metionTotal, 'Menções: 0'); tmpM=0; updateEmptyState(); }

function consoleListener() {
    getEl('button[name=cn_clear]').addEventListener('click', () => {
        cnPnReset();
        ipcRenderer.send('sendtoCleanConsole');
    })
    const panelWindow = getCurrentWindow();
    const maximizeButton = getEl('#panelMaximize');
    const updateMaximizeButton = () => {
        const maximized = panelWindow.isMaximized();
        maximizeButton.classList.toggle('is-maximized', maximized);
        maximizeButton.setAttribute('aria-label', maximized ? 'Restaurar' : 'Maximizar');
        maximizeButton.title = maximized ? 'Restaurar' : 'Maximizar';
    };
    getEl('#panelMinimize').addEventListener('click', () => panelWindow.minimize());
    maximizeButton.addEventListener('click', () => {
        panelWindow.isMaximized() ? panelWindow.unmaximize() : panelWindow.maximize();
        updateMaximizeButton();
    });
    getEl('#panelClose').addEventListener('click', () => panelWindow.close());
    panelWindow.on('maximize', updateMaximizeButton);
    panelWindow.on('unmaximize', updateMaximizeButton);
    updateMaximizeButton();
    updateEmptyState()
    window.addEventListener('beforeunload', (e)=>{
        appcore.dg.showMB({
            type: 'warning',
            title: 'Painel de Eventos — SMLurker',
            message: "Evite recarregar o painel de eventos.\nSe necessário utilize o recurso \"Limpar\"",
        })
    })
}

ipcRenderer.on('updateConsole', (event, data) => {
    cnPanelChange(data);
});

ipcRenderer.on('updateCleanConsole', (event, data) => {
    cnPnReset();
});

ipcRenderer.on('updateMentionsConsole', (event, data) => {
    tmpM+=1;
    cnPanelChange(data);
    barText(metionTotal, `Menções: ${tmpM}`)
});

ipcRenderer.on('updateChannelsConsole', (event, channels) =>{
    barText(cnTotal, `Canais: ${channels}`)
})


function cnPanelChange(text) {
    consoleText.value += text
    let tmpText = consoleText.value
    tmpText = tmpText.replace(new RegExp(/([🟢,⛔,🔴,💬,—,\s*,\t*]|\b(Canal)|\b(\[DEBUG\])|\b([0-9]+)|((\/)|(:)))/gm), '')
    consoleText.scrollTop = consoleText.scrollHeight
    if (tmpText.length >= 6000) {
        cnPnReset()
        return
    }
    barText(msgTotal, `Texto: ${tmpText.length}/6000`)
    updateEmptyState()
}

module.exports.consolePnListiner = consoleListener;
module.exports.consolePnChange = cnPanelChange;
