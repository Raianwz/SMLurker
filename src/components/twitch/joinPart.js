let joinedChn = [];
let { appcore } = require('../../internal/appcore')
let { jcPanel, jcPNReset } = require('../window/console')
const { classifyJoinFailure } = require('./joinFailure');
let listenersRegistered = false;

function jpManager() {
    const getEl = (el) => document.querySelector(el)
    const pingArea = (txt) => { let time = new Date(); jcPanel(`\n${time.toLocaleDateString()}\n${time.toLocaleTimeString()}\t${txt}\n`) }
    const panelEvent = (message) => appcore.ipc.send('sendtoConsole',
        `\n${new Date().toLocaleString('pt-BR')} · Conexão rápida: ${message}\n`)
    const updateChannelCount = () => {
        const total = getEl('#cntotal');
        total.setAttribute('data-state', 'channels');
        total.textContent = `Canais: ${joinedChn.length}`;
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
    if (listenersRegistered) return;
    listenersRegistered = true;
    btnJoin.addEventListener('click', jpJoinChn)
    btnPart.addEventListener('click', jpPartChn)
    btnSair.addEventListener('click', () => getEl('#txtConexaoCanal').value = "")
    getEl('#jc_Help').addEventListener('click', JCInfo)

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
                waitBlock(true)
                try {
                    await appcore.sc.tmi.join(`${txtChannel}`)
                    joinedChn.push(`#${txtChannel}`)
                    JCtoast(`🟢 Entrou em #${txtChannel}`);
                    pingArea(`🟢 Entrou em #${txtChannel}!`);
                    panelEvent(`entrou em #${txtChannel}.`)
                    updateChannelCount()
                    appcore.ipc.send('sendChannelstoConsole', joinedChn.length)
                } catch (err) {
                    const reason = classifyJoinFailure(err);
                    JCtoast(`Não foi possível entrar em #${txtChannel}: ${reason.label}`)
                    panelEvent(`falha ao entrar em #${txtChannel} (${reason.label}).`)
                } finally {
                    await waiting()
                }
            }
            else JCtoast(`📢 Você já entrou no canal: ${txtChannel}!`);
        }
    }

    async function jpPartChn() {
        txtChannel = getEl('#txtConexaoCanal').value;
        const check = joinedChn.includes(`#${txtChannel}`);
        if (checkSmDebug(txtChannel) === true) { return }
        if (checkChn(txtChannel)) {
            if (check) {
                waitBlock(true)
                try {
                    await appcore.sc.tmi.part(`${txtChannel}`)
                    joinedChn = joinedChn.filter(chn => chn !== `#${txtChannel}`)
                    appcore.ipc.send('sendChannelstoConsole', joinedChn.length)
                    JCtoast(`⛔ Saiu de: #${txtChannel}!`);
                    pingArea(`⛔ Saiu de:  \t#${txtChannel}!`);
                    panelEvent(`saiu de #${txtChannel}.`)
                    updateChannelCount()
                } catch {
                    JCtoast(`Não foi possível sair de #${txtChannel}`)
                    panelEvent(`falha ao sair de #${txtChannel}.`)
                } finally {
                    await waiting()
                }

            } else JCtoast(`📢 Você já saiu do canal: ${txtChannel}!`);
        }
    }

    async function waitBlock(valor) {
        valor = valor ?? false;
        let items = ['#txtConexaoCanal', '#jc_Join', '#jc_Part']
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
