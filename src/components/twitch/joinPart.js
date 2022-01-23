
const fs = require('fs'), path = require('path');
const { app } = require('@electron/remote');
let partCanais = [], joinedCanais = [];

function JC_JoinPart(client) {
    const el = e => document.querySelector(e);
    let channelPath = `${app.getPath('userData')}\\Config\\channels.json`, channels;


    if (env(app) === 'DEV') channelPath = path.join(__dirname, '../../../DevData/channels.json');

    const JCtoast = (txt) => {
        let x = el("#jc_Status"); x.textContent = `${txt}`; x.classList.add('show');
        setTimeout(() => { x.classList.remove('show'); x.textContent = ""; }, 5 * 1000);
    }
    const pingArea = (txt) => { let time = new Date(); PingTable(`\n${txt}\t\t\t${time.toLocaleTimeString()}\t\t${time.toLocaleDateString()}`) }
    const inText = (el, txt) => el.innerText = txt
    let btnJoin = el('#jc_Join'), btnPart = el('#jc_Part'), txtCanal = el('#txtConexaoCanal'), erro = false, canal, aux = 0;

    let cnTotal = el('#cntotal');

    if (fs.existsSync(channelPath)) channels = JSON.parse(fs.readFileSync(channelPath, { encoding: 'utf8' }))
    aux = channels.length;

    btnJoin.addEventListener('click', async (e) => {
        erro = false;
        canal = txtCanal.value;
        if (checkTxtCanal()) {
            if (channels.includes(`#${canal}`) && !partCanais.includes(`#${canal}`) || joinedCanais.includes(`#${canal}`)) {
                return JCtoast(`📢 Você já entrou no canal: ${canal}!`);
            }
            await client.join(`${canal}`).catch(err => { if (err === 'msg_channel_suspended') erro = true; });
            erro ? JCtoast(`Este canal #${canal} não existe ou foi suspenso.`) : JCtoast(`Entrou em #${canal}`);
            if (!erro) { joinedCanais.push(`#${canal}`); pingArea(`🟢 Entrou em #${canal}!`) }

            if (partCanais.includes(`#${canal}`) && joinedCanais.includes(`#${canal}`)) {
                partCanais = partCanais.filter(channel => channel !== `#${canal}`);
            }

        }
    })
    
    btnPart.addEventListener('click', async (e) => {
        erro = false;
        canal = txtCanal.value;
        if (checkTxtCanal()) {
            await client.part(`${canal}`, self).catch(err => console.log(`Erro: ${err}`))
            JCtoast(`Saiu de ${canal}.`)
            if (partCanais.includes(`#${canal}`) && !joinedCanais.includes(`#${canal}`)) { JCtoast(`📢 Você já saiu do canal: ${canal}!`); return }
            if (!erro) { partCanais.push(`#${canal}`); pingArea(`⛔ Saiu de #${canal.toUpperCase()}!`) }
            if (partCanais.includes(`#${canal}`) && joinedCanais.includes(`#${canal}`)) {
                joinedCanais = joinedCanais.filter(channel => channel !== `#${canal}`);
            }
            console.log(`Entrou:${joinedCanais}\nSaiu: ${partCanais}`)
        }
    })
    function checkTxtCanal() {
        if (txtCanal.value == '' || txtCanal.value == undefined) {
            JCtoast('Digite o nome do Canal que deseja Entrar ou Sair')
            txtCanal.focus()
            return false
        }
        else return true
    }
}
module.exports = JC_JoinPart;