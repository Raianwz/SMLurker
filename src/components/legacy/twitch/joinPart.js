const fs = require('fs'), path = require('path');
const { app } = require('@electron/remote');
const env = require('../helpers/env');

let joinedCanais = [], check, erro;

function JC_JoinPart(client, el) {
    const getEl = (el) => document.querySelector(el)
    const pingArea = (txt) => { let time = new Date(); PingTable(`\n${time.toLocaleDateString()}\n${time.toLocaleTimeString()}\t${txt}\n`) }
    const inText = (el, txt) => el.innerText = txt
    const JCtoast = (txt) => {
        let x = getEl("#jc_Status"); x.textContent = `${txt}`; x.classList.add('show');
        setTimeout(() => { x.classList.remove('show'); x.textContent = ""; }, 3 * 1000);
    }
    let channelPath = `${app.getPath('userData')}\\Config\\channels.json`, channels;
    let btnJoin = getEl('#jc_Join'), btnPart = getEl('#jc_Part'), btnSair = getEl('#btnEntrar'), txtCanal;

    if (env(app) === 'DEV') channelPath = path.join(__dirname, '../../../DevData/channels.json');

    if (fs.existsSync(channelPath)) channels = JSON.parse(fs.readFileSync(channelPath, { encoding: 'utf8' }))
    joinedCanais = channels || joinedCanais

    btnJoin.addEventListener('click', joinChannel)
    btnPart.addEventListener('click', partChannel)
    btnSair.addEventListener('click', () => { btnSair.onclick.name == 'sairTwitch' ? getEl('#txtConexaoCanal').value = "" : false })

    function checkTxtCanal(txtCanal) {
        if (txtCanal == '' || txtCanal == undefined) {
            JCtoast('Digite o nome do Canal que deseja Entrar ou Sair')
            getEl('#txtConexaoCanal').focus()
            return false
        }
        else return true
    }
    function localSleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

    async function joinChanngetEl() {
        txtCanal = getEl('#txtConexaoCanal').value; check = joinedCanais.includes(`#${txtCanal}`); erro = false;
        if (checkTxtCanal(txtCanal)) {
            if (check) JCtoast(`📢 Você já entrou no canal: ${txtCanal}!`);
            else {
                WaitBlock(true)
                await client.join(`${txtCanal}`).catch(err => { if (err === 'msg_channel_suspended') erro = true; })
                    .then(async () => { await localSleep(800); WaitBlock() });
                if (!erro) {
                    joinedCanais.push(`#${txtCanal}`);
                    JCtoast(`🟢 Entrou em #${txtCanal}`);
                    pingArea(`🟢 Entrou em #${txtCanal}!`);
                    inText(getEl('#cntotal'), `🟣 Canais: ${joinedCanais.length}`)
                }
                else JCtoast(`😕 #${txtCanal} não existe ou foi suspenso.`)
            }
        }
    }
    async function partChanngetEl() {
        txtCanal = getEl('#txtConexaoCanal').value;
        check = joinedCanais.includes(`#${txtCanal}`);
        if (checkTxtCanal(txtCanal)) {
            if (check) {
                WaitBlock(true)
                await client.part(`${txtCanal}`, self).catch(err => console.log(`[DEBUG] - Erro: ${err}`))
                    .then(async () => { await localSleep(800); WaitBlock() });
                joinedCanais = joinedCanais.filter(channel => channel !== `#${txtCanal}`);
                JCtoast(`⛔ Saiu de: #${txtCanal}!`);
                pingArea(`⛔ Saiu de:  \t#${txtCanal}!`);
                inText(getEl('#cntotal'), `🟣 Canais: ${joinedCanais.length}`)
            } else JCtoast(`📢 Você já saiu do canal: ${txtCanal}!`);
        }
    }

    async function WaitBlock(valor) {
        valor = valor ?? false;
        let items = ['#txtConexaoCanal', '#jc_Join', '#jc_Part']
        for (let i = 0; i < items.length; i++) getEl(items[i]).disabled = valor;
    }
}



module.exports = JC_JoinPart;

