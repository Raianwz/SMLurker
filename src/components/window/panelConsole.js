const { ipcRenderer } = require('electron');
const { getCurrentWindow } = require('@electron/remote');
const { MAX_EVENT_CHARS } = require('../helpers/eventHistoryLimit');
const getEl = (el) => document.querySelector(el)
let consoleText = getEl('#txtPanel'), msgTotal = getEl('#txtTotal'), metionTotal = getEl('#mnTotal'), cnTotal = getEl('#cnTotal');
const subgiftTotal = getEl('#sgTotal');
const panelEmpty = getEl('#panelEmpty');
const emptyTitle = getEl('#panelEmptyTitle');
const emptyDescription = getEl('#panelEmptyDescription');
const filters = ['all', 'mentions', 'subgifts', 'connections', 'logs'];
const events = [];
let activeFilter = 'all';
let historyLength = 0;
let mentionCount = 0;
let subgiftCount = 0;
let emptyReason = null;
const barText = (el, txt) => el.innerText = txt;
const matchesFilter = (event) => activeFilter === 'all' || event.category === activeFilter;
const updateEmptyState = () => {
    const hasVisibleEvents = events.some(matchesFilter);
    panelEmpty.hidden = hasVisibleEvents;
    if (hasVisibleEvents) return;
    if (events.length) {
        emptyTitle.textContent = 'Nada nesta categoria ainda';
        emptyDescription.textContent = 'Os eventos deste filtro aparecerão aqui quando acontecerem.';
    } else {
        emptyTitle.textContent = emptyReason === 'limit' ? 'Histórico limpo automaticamente' : 'Nenhum evento por enquanto';
        emptyDescription.textContent = emptyReason === 'limit'
            ? 'O painel atingiu 6.000 caracteres. Novos eventos aparecerão aqui.'
            : 'Menções, conexões e outros eventos aparecerão aqui.';
    }
};
const renderHistory = (resetScroll = false) => {
    const followLatest = consoleText.scrollHeight - consoleText.clientHeight - consoleText.scrollTop <= 24;
    consoleText.value = events.filter(matchesFilter).map(event => event.text).join('');
    if (resetScroll) consoleText.scrollTop = 0;
    else if (followLatest) consoleText.scrollTop = consoleText.scrollHeight;
    barText(msgTotal, `Caracteres: ${historyLength}/${MAX_EVENT_CHARS}`);
    barText(metionTotal, `Menções: ${mentionCount}`);
    barText(subgiftTotal, `SubGifts: ${subgiftCount}`);
    updateEmptyState();
};
const cnPnReset = (reason) => {
    events.length = 0;
    historyLength = 0;
    mentionCount = 0;
    subgiftCount = 0;
    emptyReason = reason;
    renderHistory(true);
}

function consoleListener() {
    for (const filter of filters) {
        const button = getEl(`[data-event-filter="${filter}"]`);
        button.addEventListener('click', () => {
            activeFilter = filter;
            for (const name of filters) {
                getEl(`[data-event-filter="${name}"]`).setAttribute('aria-pressed', String(name === filter));
            }
            renderHistory(true);
        });
    }
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
}

ipcRenderer.on('updateConsole', (event, data, category) => {
    cnPanelChange(data, category === 'connections' ? 'connections' : 'logs');
});

ipcRenderer.on('updateCleanConsole', (event, reason) => {
    cnPnReset(reason);
});

ipcRenderer.on('updateMentionsConsole', (event, data) => {
    cnPanelChange(data, 'mentions');
});

ipcRenderer.on('updateSubGiftsConsole', (event, data) => {
    cnPanelChange(data, 'subgifts');
});

ipcRenderer.on('updateChannelsConsole', (event, channels) =>{
    barText(cnTotal, `Canais: ${channels}`)
})


function cnPanelChange(text, category = 'logs') {
    const eventText = String(text);
    if (historyLength + eventText.length >= MAX_EVENT_CHARS) {
        cnPnReset('limit')
        return
    }
    events.push({ text: eventText, category });
    historyLength += eventText.length;
    if (category === 'mentions') mentionCount++;
    if (category === 'subgifts') subgiftCount++;
    renderHistory();
}

module.exports.consolePnListiner = consoleListener;
module.exports.consolePnChange = cnPanelChange;
