
const fs = require('fs'), path = require('path');
const { app } = require('@electron/remote');
const el = e => document.querySelector(e);
let joinedCanais = [], check, erro;

function JC_JoinPart(client) {
    const pingArea = (txt) => { let time = new Date(); PingTable(`\n${time.toLocaleDateString()}\n${time.toLocaleTimeString()}\t${txt}\n`) }
    const inText = (el, txt) => el.innerText = txt
    const JCtoast = (txt) => {
        let x = el("#jc_Status"); x.textContent = `${txt}`; x.classList.add('show');
        setTimeout(() => { x.classList.remove('show'); x.textContent = ""; }, 3 * 1000);
    }
    let channelPath = `${app.getPath('userData')}\\Config\\channels.json`, channels;
    let btnJoin = el('#jc_Join'), btnPart = el('#jc_Part'), btnSair = el('#btnEntrar'), txtCanal;

    if (env(app) === 'DEV') channelPath = path.join(__dirname, '../../../DevData/channels.json');

    if (fs.existsSync(channelPath)) channels = JSON.parse(fs.readFileSync(channelPath, { encoding: 'utf8' }))
    joinedCanais = channels || joinedCanais

    btnJoin.addEventListener('click', joinChannel)
    btnPart.addEventListener('click', partChannel)
    btnSair.addEventListener('click', () => { btnSair.onclick.name == 'sairTwitch' ? el('#txtConexaoCanal').value = "" : false })

    function checkTxtCanal(txtCanal) {
        if (txtCanal == '' || txtCanal == undefined) {
            JCtoast('Digite o nome do Canal que deseja Entrar ou Sair')
            el('#txtConexaoCanal').focus()
            return false
        }
        else return true
    }
    function localSleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

    async function joinChannel() {
        txtCanal = el('#txtConexaoCanal').value; check = joinedCanais.includes(`#${txtCanal}`); erro = false;
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
                    inText(el('#cntotal'), `🟣 Canais: ${joinedCanais.length}`)
                }
                else JCtoast(`😕 #${txtCanal} não existe ou foi suspenso.`)
            }
        }
    }
    async function partChannel() {
        txtCanal = el('#txtConexaoCanal').value;
        check = joinedCanais.includes(`#${txtCanal}`);
        if (checkTxtCanal(txtCanal)) {
            if (check) {
                WaitBlock(true)
                await client.part(`${txtCanal}`, self).catch(err => console.log(`[DEBUG] - Erro: ${err}`))
                    .then(async () => { await localSleep(800); WaitBlock() });
                joinedCanais = joinedCanais.filter(channel => channel !== `#${txtCanal}`);
                JCtoast(`⛔ Saiu de: #${txtCanal}!`);
                pingArea(`⛔ Saiu de:  \t#${txtCanal}!`);
                inText(el('#cntotal'), `🟣 Canais: ${joinedCanais.length}`)
            } else JCtoast(`📢 Você já saiu do canal: ${txtCanal}!`);
        }
    }

    async function WaitBlock(valor) {
        valor = valor ?? false;
        let items = ['#txtConexaoCanal', '#jc_Join', '#jc_Part']
        for (let i = 0; i < items.length; i++) el(items[i]).disabled = valor;
    }
}



module.exports = JC_JoinPart;

