const tmi = require('tmi.js');
const fs = require('fs');
const { remote: { app } } = require('electron');
const path = require('path');
const joinChannels = require(path.resolve(__dirname, '../src/components/twitch/joinChannels'));

let client = null;
loadCredentials();

async function entrarTwitch(){
    let username = document.getElementById('username').value;
    let pass = document.getElementById('pass').value;
    let status = document.getElementById('msgStatus');
    let pingTable = document.getElementById('pTable');
    let ptotal = document.getElementById('Ptotal');
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
        status.innerHTML = `${err}`;
        btnEntrar.value = 'Entrar';
        btnEntrar.classList.remove('loading');
        btnEntrar.onclick = entrarTwitch;
    })

    if (!error) {
        saveCredentials(username, pass);

        status.innerHTML = 'Entrando nos canais...'

        await joinChannels(client).catch(err => {
            error = true;

            status.innerHTML = `${err}`;
            btnEntrar.value = 'Entrar';
            btnEntrar.classList.remove('loading');
            btnEntrar.onclick = entrarTwitch;
            client.disconnect();
            client = null;
        });

        if (!error) {
            ShowHide('entrou');
            criarUser(username);
            status.innerHTML = 'Entrou nos canais!';
            btnEntrar.value = 'Sair';
            btnEntrar.classList.remove('loading');
            btnEntrar.classList.add('conectado');
            btnEntrar.onclick = sairTwitch;
        }
    
        client.on("message", async (channel, tags, message, self) => {
            if(message.includes(username)){
                console.log(`Pingado em: ${channel} canal, messagem: ${tags.username}: ${message}`);
                pingTable.value += `🔔 Canal: ${channel} \n💬 ${tags.username}: ${message}\n`;
                ptotal.innerText = `Total:${pingTable.value.length}/2000`
            }
            if(pingTable.value.length>2000){
                pingTable.value="";
                ptotal.innerText = `Total: 0/2000 — Limpo`
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
    let credentialsPath = `${app.getPath('userData')}\\credentials.json`,
        credentials = {};

    credentials.username = username;
    credentials.pass = pass;
    fs.writeFileSync(credentialsPath, JSON.stringify(credentials), null, 2);
}
//Função carregar dados salvos
async function loadCredentials() {
    let credentialsPath = `${app.getPath('userData')}\\credentials.json`,
        credentials;

    if (fs.existsSync(credentialsPath)) {
        credentials = require(credentialsPath);

        document.getElementById('username').value = credentials.username;
        document.getElementById('pass').value = credentials.pass;
    }
}

function criarUser(username){
    let userbox = document.getElementById('UserBox')
    userbox.innerHTML = "";
    fetch(`https://api.twitch.tv/kraken/users?login=${username}`, {
        headers: { 'Accept': 'application/vnd.twitchtv.v5+json', 'Client-ID': 'snq57nbghk8n01y6amef3n4l06no8o' }
    }).then(function(response) {
        return response.json().then(function(data) {
          let logo = data.users[0].logo;
          let displayName = data.users[0].display_name
          userbox.innerHTML = `<p>${displayName}</p>
          <img class="avatar" src="${logo}" alt="${username}">`
        })
    }) 
}

function ShowHide(status){
    let cManager = document.getElementById('cMng');
    let LoginBox = document.getElementById('LoginBox');
    let Lbox = document.querySelector('.loginBox');
    let PingBox = document.getElementById('PingBox');

    if(status == 'entrou'){
        cManager.classList.remove('show');
        LoginBox.classList.remove('show');
        cManager.classList.add('hide');
        LoginBox.classList.add('hide');
        setTimeout(()=>{
        cManager.style.display = 'none';
        LoginBox.style.display = 'none';
        Lbox.style.width = "30%"
        PingBox.style.display = 'block';
        PingBox.classList.remove('hide');
    },600)
    }

    if(status == 'saiu'){
        PingBox.classList.add('hide');
        cManager.classList.remove('hide');
        LoginBox.classList.remove('hide');
        cManager.classList.add('show');
        LoginBox.classList.add('show');
        PingBox.style.display = 'none';
        cManager.style.display = 'block';
        LoginBox.style.display = 'block';
        Lbox.style.width = "57%"
    }
}

function clearPing(){
    let pingTable = document.getElementById('pTable')
    let ptotal = document.getElementById('Ptotal');
    pingTable.value="";
    ptotal.innerText = `Total: 0/2000 — Limpo`
}