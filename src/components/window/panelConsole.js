const { ipcRenderer } = require('electron');
const {appcore } = require('../../internal/appcore')
const getEl = (el) => document.querySelector(el)
let consoleText = getEl('#txtPanel'), msgTotal = getEl('#txtTotal'), metionTotal = getEl('#mnTotal'), cnTotal = getEl('#cnTotal');
let tmpM = 0;
const barText = (el, txt) => el.innerText = txt;
const cnPnReset = () => { consoleText.value = ""; barText(msgTotal, 'Texto: 0/6000'); barText(metionTotal, 'Menções: 0'); tmpM=0 }

function consoleListener() {
    getEl('span[name=cn_clear]').addEventListener('click', cnPnReset)
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
    console.log(channels)
    barText(cnTotal, `Canais: ${channels}`)
})


function cnPanelChange(text) {
    consoleText.value += text
    tmpText = consoleText.value
    tmpText = tmpText.replace(new RegExp(/([🟢,⛔,🔴,💬,—,\s*,\t*]|\b(Canal)|\b(\[DEBUG\])|\b([0-9]+)|((\/)|(:)))/gm), '')
    consoleText.scrollTop = consoleText.scrollHeight
    tmpText.length >= 6000 ? cnPnReset() : false
    barText(msgTotal, `Texto: ${tmpText.length}/6000`)
}

module.exports.consolePnListiner = consoleListener;
module.exports.consolePnChange = cnPanelChange;