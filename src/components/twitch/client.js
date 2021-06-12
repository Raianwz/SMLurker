const tmi = require('tmi.js');
const fs = require('fs');
const { remote: { app } } = require('electron');
const{ Notification } = require('electron').remote
const path = require('path');
const env = require('../src/components/env');
const joinChannels = require(path.resolve(__dirname, '../src/components/twitch/joinChannels'));
let userData = null;
let mentions = 0;
let client = null;
loadCredentials();

async function entrarTwitch(){
    let username = document.getElementById('username').value.toLowerCase()
    let pass = document.getElementById('pass').value;
    let status = document.getElementById('msgStatus');
    let pingTable = document.getElementById('pTable');
    let mtotal = document.getElementById('Mtotal');
    let ptotal = document.getElementById('Ptotal');       
    let configPath = `${app.getPath('userData')}\\Config\\configs.json`;
    let configs = JSON.parse(fs.readFileSync(configPath, { encoding: 'utf8'}))
    let error = false;

    let btnEntrar = document.getElementById('btnEntrar');
    btnEntrar.blur();
    status.innerHTML = "";


    if (!username.replace(/ /g, '') || !pass.replace(/ /g, '')) {
        status.innerHTML = 'Por favor preencha os campos Username e OAuth';
        return;
    } else if (
        username.startsWith(' ') || pass.startsWith(' ') || pass.includes(' ')
    ) {
        if (username.startsWith(' ')) {
            status.innerHTML = 'Por favor insirá um Username válido';
            return;
        } else if (pass.startsWith(' ') || pass.includes(' ')) {
            status.innerHTML = 'Por favor insirá um OAoth válido';
            return;
        }
    }

    BlockLogin(true)
    btnEntrar.value = '';
    btnEntrar.classList.add('loading');
    btnEntrar.onclick = null;
    status.innerHTML = 'Iniciando Client';


    client = new tmi.Client({
        options: { debug: false },
        connection: {
            reconnect: true,
            secure: true,
        },
        identity: {
            username: username,
            password: pass,
        },
        channels: [],
    });

    status.innerHTML = 'Tentando conectar';

    await client.connect().catch(err => {
        error = true;
        BlockLogin(false)
        status.innerHTML = `${err}`;
        btnEntrar.value = 'Entrar';
        btnEntrar.classList.remove('loading');
        btnEntrar.onclick = entrarTwitch;
    })

    if (!error) {
        saveCredentials(username, pass);
        status.innerHTML = 'Entrando nos canais...';
        getUser(username);

        await joinChannels(client).catch(err => {
            error = true;
            BlockLogin(false)
            status.innerHTML = `${err}`;
            btnEntrar.value = 'Entrar';
            btnEntrar.classList.remove('loading');
            btnEntrar.onclick = entrarTwitch;
            client.disconnect();
            client = null;
        });

        if (!error) {
            ShowHide('entrou');
            criarUser()
            status.innerHTML = 'Entrou nos canais!';
            btnEntrar.value = 'Sair';
            btnEntrar.classList.remove('loading');
            btnEntrar.classList.add('conectado');
            btnEntrar.onclick = sairTwitch;

        }
        
        let dist = process.resourcesPath;
        let distFile = 'assets';
        if(env(app) == 'DEV'){dist = __dirname; distFile='../src/assets'}
        let mention = path.join(dist, `${distFile}/metion.png`);
        let gift = path.join(dist, `${distFile}/gift.png`);
        
        client.on("message", async (channel, tags, message, self) => {
            let DisplayName = userData.users[0].display_name;
            if(message.includes(username)||message.includes(DisplayName)){
                pingTable.value += `🔔 Canal: ${channel} \n💬 ${tags.username}: ${message}\n`;
                let pings = pingTable.value
                mentions = mentions + 1
                pings =  pings.replaceAll(' ','').replace('🔔Canal:','').replace('💬','')
                ptotal.innerText = `💬 Texto: ${pings.length}/4000`
                mtotal.innerText = `🔔 Menções: ${mentions}`;
                if(configs.NotifyMention === true){
                    new Notification({icon: mention, title: `Mencionado em ${channel}`,
                        body: `Você foi mencionado em ${channel} por @${tags.username}: ${message}`,
                        timeoutType: 'default',urgency: 'normal' 
                    }).show() 
                }
            }
            if(pingTable.value.length>4000){
                mentions = 0;
                pingTable.value="";
                ptotal.innerText = `💬Texto: 0/4000`
                mtotal.innerText = '🔔Menções: 0'
            }
        });
        client.on("subgift",async (channel, tags, message, self) =>{
            console.log(message)
            let DisplayName = userData.users[0].display_name;
            if(message.includes(username)||message.includes(DisplayName)){
                if(configs.NotifySubgift === true){
                    new Notification({icon: gift, title: `Ganhou Sub Gift em ${channel}`,
                    body: `Opa!\nVocê ganhou um Sub Gift em ${channel} de @${tags.username}`,
                    timeoutType: 'default',urgency: 'critical'}).show()
                }
            }
        });
    }
}

async function sairTwitch() {
    await client.disconnect();
    let userbox = document.getElementById('UserBox')
    userbox.innerHTML = "";
    ShowHide('saiu');

    client = null;
    let btnEntrar = document.getElementById('btnEntrar');
    let status = document.getElementById('msgStatus');
    btnEntrar.blur();


    status.innerHTML = '';
    btnEntrar.value = 'Entrar';
    btnEntrar.classList.remove('conectado');
    btnEntrar.onclick = entrarTwitch;
}

//Função Salvar Dados
async function saveCredentials(username, pass) {
    let credentialsPath = `${app.getPath('userData')}\\Config\\credentials.json`,
        credentials = {};

    credentials.username = username;
    credentials.pass = pass;
    fs.writeFileSync(credentialsPath, JSON.stringify(credentials), null, 2);
}
//Função carregar dados salvos
async function loadCredentials() {
    let configPath = `${app.getPath('userData')}\\Config\\configs.json`
    let credentialsPath = `${app.getPath('userData')}\\Config\\credentials.json`,
        credentials;

    if (fs.existsSync(credentialsPath)) {
        credentials = require(credentialsPath);

        document.getElementById('username').value = credentials.username;
        document.getElementById('pass').value = credentials.pass;
        getUser(credentials.username)
        if (fs.existsSync(configPath)){
            let config = JSON.parse(fs.readFileSync(configPath, { encoding: 'utf8'}))
            document.getElementById('swt_notifyMention').checked =config.NotifyMention;
            document.getElementById('swt_notifySub').checked =config.NotifySubgift;
            if(config.autologin === true){
                document.getElementById('btnEntrar').click();
            };
       }
    }

}

function getUser(username){
    fetch(`https://api.twitch.tv/kraken/users?login=${username}`, {
        headers: { 'Accept': 'application/vnd.twitchtv.v5+json','Client-ID':'snq57nbghk8n01y6amef3n4l06no8o'}
    }).then((resp)=>{return resp.json().then((data)=>{ return userData = data})});
}

function criarUser(){
    let userbox = document.getElementById('UserBox')
    let logo = userData.users[0].logo;
    let displayName = userData.users[0].display_name
    userbox.innerHTML = "";
    userbox.innerHTML = `<p>${displayName}</p><img class="avatar" src="${logo}" alt="${username}">`
}

function ShowHide(status){
    let cManager = document.getElementById('cMng');
    let LoginBox = document.getElementById('LoginBox');
    let Lbox = document.querySelector('.loginBox');
    let Blogin = document.querySelector('#btnEntrar');
    let PingBox = document.getElementById('PingBox');

    if(status == 'entrou'){
        cManager.classList.remove('show');
        LoginBox.classList.remove('show');
        cManager.classList.add('hide');
        LoginBox.classList.add('hide');
        setTimeout(()=>{
        BlockLogin(true)    
        PingBox.classList.remove('hide');
        cManager.style.display = 'none';
        LoginBox.style.display = 'none';
        Lbox.style.width = "30%"
        Blogin.style.width = "50%"
        PingBox.style.display = 'block';
    },1)
    }

    if(status == 'saiu'){
        BlockLogin(false)
        PingBox.classList.add('hide');
        cManager.classList.remove('hide');
        LoginBox.classList.remove('hide');
        cManager.classList.add('show');
        LoginBox.classList.add('show');
        cManager.style.display = 'block';
        PingBox.style.display = 'none';
        LoginBox.style.display = 'block';
        Lbox.style.width = "57%"
        Blogin.style.width = ""
    }
}

function clearPing(){
    let pingTable = document.getElementById('pTable');
    let ptotal = document.getElementById('Ptotal');
    let mtotal = document.getElementById('Mtotal');
    pingTable.value="";
    ptotal.innerText = `💬 Texto: 0/4000`
    mtotal.innerText = `🔔 Menções: 0`;
    mentions = 0;
}

function BlockLogin(valor){
    let inputUser = document.getElementById('username')
    let inputPass = document.getElementById('pass')
    let inputCanal = document.getElementById('txtCanal')
    let btnAdd = document.querySelector('input[type="button"].add')
    let btnRemove = document.querySelector('input[type="button"].remove')
    let btnFiles = document.querySelector('.cnFile')

    inputUser.disabled = valor;
    inputPass.disabled = valor;
    inputCanal.disabled = valor;
    btnAdd.disabled = valor;
    btnRemove.disabled = valor;

    if(valor == true){
        btnFiles.classList.add('block')
        btnFiles.onclick = null;
    }else{
        btnFiles.classList.remove('block')
        btnFiles.onclick = loadChannelsFromFile;
    }
}

function ChangeNotify(){
    const fs = require('fs');
    let configPath = `${app.getPath('userData')}\\Config\\configs.json`;
    let mention = document.getElementById('swt_notifyMention').checked;
    let subgift = document.getElementById('swt_notifySub').checked;
    if(fs.existsSync(configPath)){
        let configs = JSON.parse(fs.readFileSync(configPath, { encoding: 'utf8'}))
        configs.NotifyMention = mention;
        configs.NotifySubgift = subgift;
        console.log(configs)
        fs.writeFileSync(configPath, JSON.stringify(configs));
    }
}
