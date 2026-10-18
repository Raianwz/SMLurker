let joinedChn = [];
let { appcore } = require('../../internal/appcore')
let { jcPanel, jcPNReset } = require('../window/console')
const { classifyJoinFailure } = require('./joinFailure');
let listenersRegistered = false;
let operationInProgress = false;

function jpManager() {
    const getEl = (el) => document.querySelector(el)
    const pingArea = (txt) => { let time = new Date(); jcPanel(`\n${time.toLocaleDateString()}\n${time.toLocaleTimeString()}\t${txt}\n`) }
    const panelEvent = (message) => appcore.ipc.send('sendtoConsole',
        `\n${new Date().toLocaleString('pt-BR')} · Conexão rápida: ${message}\n`)
    const updateChannelCount = () => {
        const total = getEl('#cntotal');
        total.setAttribute('data-state', 'channels');
        total.textContent = `Canais: ${joinedChn.length}`;
        getEl('#jc_ShowConnected').textContent = `Ver canais conectados (${joinedChn.length})`;
    }
    const waiting = () => appcore.helpers.sleep(800).then(() => waitBlock())
    let toastTimeout;
    const JCtoast = (txt) => {
        const status = getEl('#jc_Status');
        clearTimeout(toastTimeout);
        status.textContent = `${txt}`;
        status.classList.add('show');
        toastTimeout = setTimeout(() => {
            status.classList.remove('show');
            status.textContent = '';
        }, 3000);
    }
    let btnJoin = getEl('#jc_Join'), btnPart = getEl('#jc_Part'), btnSair = getEl('#btnEntrar'), txtChannel;
    jcPNReset()

    joinedChn = [...appcore.sc.tmi.channels()]
    updateChannelCount()
    if (getEl('#jc_ConnectedDialog').open) renderConnectedChannels()
    if (listenersRegistered) return;
    listenersRegistered = true;
    btnJoin.addEventListener('click', jpJoinChn)
    btnPart.addEventListener('click', jpPartChn)
    btnSair.addEventListener('click', () => getEl('#txtConexaoCanal').value = "")
    getEl('#jc_Help').addEventListener('click', JCInfo)
    getEl('#jc_ShowConnected').addEventListener('click', () => {
        joinedChn = [...appcore.sc.tmi.channels()];
        updateChannelCount();
        getEl('#jc_ConnectedSearch').value = '';
        getEl('#jc_ConnectedStatus').textContent = '';
        renderConnectedChannels();
        getEl('#jc_ConnectedDialog').showModal();
        getEl('#jc_ConnectedSearch').focus();
    })
    getEl('#jc_ConnectedSearch').addEventListener('input', renderConnectedChannels)
    getEl('#jc_CloseConnected').addEventListener('click', () => getEl('#jc_ConnectedDialog').close())

    function renderConnectedChannels() {
        const list = getEl('#jc_ConnectedList');
        const term = getEl('#jc_ConnectedSearch').value.trim().replace(/^#/, '').toLowerCase();
        const matches = joinedChn.filter(channel => channel.toLowerCase().includes(term));
        list.replaceChildren();
        getEl('#jc_ConnectedCount').textContent = `${joinedChn.length} canais conectados · ${matches.length} exibidos`;
        if (!matches.length) {
            const empty = document.createElement('li');
            empty.className = 'empty';
            empty.textContent = joinedChn.length ? 'Nenhum canal encontrado.' : 'Nenhum canal conectado.';
            list.appendChild(empty);
            return;
        }
        for (const channel of matches) {
            const item = document.createElement('li');
            const name = document.createElement('span');
            const leave = document.createElement('button');
            name.textContent = channel;
            leave.type = 'button';
            leave.textContent = 'Sair';
            leave.setAttribute('aria-label', `Sair do canal ${channel}`);
            leave.disabled = operationInProgress;
            leave.addEventListener('click', () => partChannel(channel, true));
            item.append(name, leave);
            list.appendChild(item);
        }
    }

    function checkChn(tchn) {
        if (tchn == "" || tchn == undefined) {
            JCtoast('Digite o nome do Canal que deseja Entrar/Sair')
            getEl('#txtConexaoCanal').focus()
            return false
        }
        return true
    }

    function checkSmDebug(cmd) {
        const enable = (cm) => JCtoast(`🐸Ativando: ${cm}💡`);
        const disable = (cm) => JCtoast(`🐸Desativando: ${cm}⛔`)
        if (cmd.startsWith('_smdebug')) {
            if (cmd === '_smdebug.showgifts') {
                if (localStorage.showGifts === 'true') {
                    JCtoast(`🐸 'ShowGifts' está ativado!`);
                } else {
                    enable('ShowGifts')
                    pingArea(`🪲Mostrar Presentes - [ATIVADO]`);
                    localStorage.setItem('showGifts', true)
                }

            }
            else if (cmd === '_smdebug.hidegifts') {
                if (localStorage.showGifts === 'false') {
                    JCtoast(`🐸 'ShowGifts' está desativado!`);
                } else {
                    disable('ShowGifts')
                    pingArea(`🪲Mostrar Presentes - [DESATIVADO]`);
                    localStorage.setItem('showGifts', false)
                }

            }
            else if (cmd === '_smdebug.devtools') {
                appcore.wgetDev();
                enable('Trapaças')
                console.clear()
                console.log('%c🐸Tenha cuidado! As coisas podem sair do controle.', 'color: red; font-size: 20pt;');
                getEl('#txtConexaoCanal').value = ""
            }
            else if (cmd === '_smdebug.help') {
                jcPanel(`🪲 SMDebug List:\n.DEVTOOLS - Abre o console do desenvolvedor;\n.SHOWGIFTS - Mostra usuário(s) distribuindo presentes;\n.HIDEGIFTS - Deixa de mostrar usuário(s) distribuindo presentes;\n.HELP - Mostra lista de comandos disponiveis`)
            }
            else {
                JCtoast(`❌Comando desconhecido!`)
                appcore.helpers.sleep(980).then(()=> JCtoast(`💡Utilize _smdebug.help`))
        
            }
            return true
        }
        return false
    }

    async function jpJoinChn() {
        if (operationInProgress) return;
        txtChannel = getEl('#txtConexaoCanal').value;
        const check = joinedChn.includes(`#${txtChannel}`);
        if (checkSmDebug(txtChannel) === true) { return null }
        if (checkChn(txtChannel)) {
            if (!check) {
                if (joinedChn.length >= 100) {
                    JCtoast('Limite de 100 canais conectados. Saia de um canal antes de entrar em outro.');
                    panelEvent(`não entrou em #${txtChannel}: limite de 100 canais conectados.`)
                    return;
                }
                operationInProgress = true;
                waitBlock(true)
                try {
                    await appcore.sc.tmi.join(`${txtChannel}`)
                    joinedChn.push(`#${txtChannel}`)
                    JCtoast(`🟢 Entrou em #${txtChannel}`);
                    pingArea(`🟢 Entrou em #${txtChannel}!`);
                    panelEvent(`entrou em #${txtChannel}.`)
                    updateChannelCount()
                    if (getEl('#jc_ConnectedDialog').open) renderConnectedChannels()
                    appcore.ipc.send('sendChannelstoConsole', joinedChn.length)
                } catch (err) {
                    const reason = classifyJoinFailure(err);
                    JCtoast(`Não foi possível entrar em #${txtChannel}: ${reason.label}`)
                    panelEvent(`falha ao entrar em #${txtChannel} (${reason.label}).`)
                } finally {
                    await waiting()
                    operationInProgress = false;
                    if (getEl('#jc_ConnectedDialog').open) renderConnectedChannels()
                }
            }
            else JCtoast(`📢 Você já entrou no canal: ${txtChannel}!`);
        }
    }

    async function jpPartChn() {
        if (operationInProgress) return;
        txtChannel = getEl('#txtConexaoCanal').value;
        const check = joinedChn.includes(`#${txtChannel}`);
        if (checkSmDebug(txtChannel) === true) { return }
        if (checkChn(txtChannel)) {
            if (check) {
                await partChannel(`#${txtChannel}`)
            } else JCtoast(`📢 Você já saiu do canal: ${txtChannel}!`);
        }
    }

    async function partChannel(channel, fromList = false) {
        if (operationInProgress) return;
        operationInProgress = true;
        waitBlock(true);
        if (getEl('#jc_ConnectedDialog').open) renderConnectedChannels();
        try {
            await appcore.sc.tmi.part(channel.slice(1));
            joinedChn = joinedChn.filter(chn => chn !== channel);
            appcore.ipc.send('sendChannelstoConsole', joinedChn.length);
            JCtoast(`⛔ Saiu de: ${channel}!`);
            pingArea(`⛔ Saiu de:  \t${channel}!`);
            panelEvent(`saiu de ${channel}.`);
            updateChannelCount();
            if (fromList) getEl('#jc_ConnectedStatus').textContent = `Saiu de ${channel}. Sua lista salva não foi alterada.`;
        } catch {
            JCtoast(`Não foi possível sair de ${channel}`);
            panelEvent(`falha ao sair de ${channel}.`);
            if (fromList) getEl('#jc_ConnectedStatus').textContent = `Não foi possível sair de ${channel}.`;
        } finally {
            await waiting();
            operationInProgress = false;
            if (getEl('#jc_ConnectedDialog').open) {
                renderConnectedChannels();
                if (fromList) getEl('#jc_ConnectedSearch').focus();
            }
        }
    }

    async function waitBlock(valor) {
        valor = valor ?? false;
        let items = ['#txtConexaoCanal', '#jc_Join', '#jc_Part', '#jc_ShowConnected']
        for (let i = 0; i < items.length; i++) getEl(items[i]).disabled = valor;
    }
    async function JCInfo() {
        let textao = `"Conexão de Canais" permite 'Entrar/Sair' de canais sem precisar deslogar.\nAlém de não afetar sua lista de canais ou salvar essas ações`;
        appcore.dg.showMB({
            type: 'info',
            title: 'Conexão de Canais — SMLurker',
            message: textao,
        })
    }
}

module.exports.joinpart = jpManager;
