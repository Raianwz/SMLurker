let api = require('../../../preload').API
let joinedChn = [], check, error;


function jpManager() {
    const getEl = (el) => document.querySelector(el)
    const channelPath = `${api.app.getPath('userData')}\\Config\\channels.json`;
    const pingArea = (txt) => { let time = new Date(); api.console.panel(`\n${time.toLocaleDateString()}\n${time.toLocaleTimeString()}\t${txt}\n`) }
    const inText = (el, txt) => el.innerText = txt
    const waiting = () => api.helpers.sleep(800).then(() => waitBlock())
    const JCtoast = (txt) => {
        let x = getEl("#jc_Status"); x.textContent = `${txt}`; x.classList.add('show');
        api.helpers.sleep('3000').then(() => { x.classList.remove('show'); x.textContent = ""; })
    }
    let btnJoin = getEl('#jc_Join'), btnPart = getEl('#jc_Part'), btnSair = getEl('#btnEntrar'), txtChannel;
    api.helpers.env() === 'DEV' ? channels = JSON.parse(api.fs.rd(channelPath)) : false

    if (api.fs.exist(channelPath)) channels = JSON.parse(api.fs.rd(channelPath))
    joinedChn = channels || joinedChn
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
        if (cmd.startsWith('_smdebug')) {
            if (cmd === '_smdebug.showgifts') {
                if (localStorage.getItem('showGifts') === 'false') {
                    localStorage.setItem('showGifts', true)
                    JCtoast(`🐸Ativando: 'ShowGifts'💡`)
                } else {
                    JCtoast(`🐸Desativando: 'ShowGifts'⛔`)
                    localStorage.setItem('showGifts', false)
                }
            } else {
                JCtoast(`❌Comando desconhecido!`)
            }
            return true
        }
        return false
    }

    async function jpJoinChn() {
        txtChannel = getEl('#txtConexaoCanal').value;
        check = joinedChn.includes(`#${txtChannel}`);
        error = false;
        if (checkSmDebug(txtChannel) === true) { return }
        if (checkChn(txtChannel)) {
            if (!check) {
                waitBlock(true)
                await api.tw.tmi.join(`${txtChannel}`)
                    .catch(err => { if (err === 'msg_channel_suspended') error = true; })
                    .then(() => waiting())
                if (!error) {
                    joinedChn.push(`#${txtChannel}`)
                    JCtoast(`🟢 Entrou em #${txtChannel}`);
                    pingArea(`🟢 Entrou em #${txtChannel}!`);
                    inText(getEl('#cntotal'), `🟣 Canais: ${joinedChn.length}`)
                }
                else JCtoast(`😕 #${txtChannel} Inexistente/Suspenso`)
            }
            else JCtoast(`📢 Você já entrou no canal: ${txtChannel}!`);
        }
    }

    async function jpPartChn() {
        txtChannel = getEl('#txtConexaoCanal').value;
        check = joinedChn.includes(`#${txtChannel}`);
        if (checkSmDebug(txtChannel) === true) { return }
        if (checkChn(txtChannel)) {
            if (check) {
                waitBlock(true)
                await api.tw.tmi.part(`${txtChannel}`)
                    .catch(err => console.log(`[DEBUG] - Erro: ${err}`))
                    .then(() => waiting())
                joinedChn = joinedChn.filter(chn => chn !== `#${txtChannel}`)
                JCtoast(`⛔ Saiu de: #${txtChannel}!`);
                pingArea(`⛔ Saiu de:  \t#${txtChannel}!`);
                inText(getEl('#cntotal'), `🟣 Canais: ${joinedChn.length}`)
            } else JCtoast(`📢 Você já saiu do canal: ${txtChannel}!`);
        }
    }

    async function waitBlock(valor) {
        valor = valor ?? false;
        let items = ['#txtConexaoCanal', '#jc_Join', '#jc_Part']
        for (let i = 0; i < items.length; i++) getEl(items[i]).disabled = valor;
    }
    async function JCInfo() {
        let textao = `Conexão de canais te permite 'Entrar/Sair' de canais sem precisar deslogar.\nAlém de não afeta sua lista de canais e não salva essas ações.`;
        api.dg.showMB({
            type: 'info',
            title: 'Conexão de Canais — SMLurker',
            message: textao,
        })
    }
}

module.exports.joinpart = jpManager;