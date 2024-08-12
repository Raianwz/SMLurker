/*===========================================(ANIMAÇÃO DE TRANSIÇÃO)===========================================*/
const { appcore } = require('../../internal/appcore')
//Desativar inputs e botões durante a mudança de telas
function BlockLogin(valor) {
    const items = ['#username', '#pass', '#txtCanal', 'div[type="button"].add', 'div[type="button"].remove'];
    let btnFiles = document.querySelector('.cnFile');
    for (let i = 0; i < items.length; i++) {
        document.querySelector(items[i]).disabled = valor
    }
    if (valor == true) {
        btnFiles.classList.add('block')
        btnFiles.onclick = null;
    } else {
        btnFiles.classList.remove('block')
    }
}

//Transição entre Tela Login e Tela Principal
function changeButtonSide(btnEntrar, destino) {
    const el = (el) => document.querySelector(el)
    const elDisplay = (ele, style) => el(ele).style.display = `${style}`
    const rmClass = (ele, Class) => el(`${ele}`).classList.remove(`${Class}`);
    const addClass = (ele, Class) => el(`${ele}`).classList.add(`${Class}`);
    const Notify = async () => appcore.sc.data.loadNotify();
    let UserWrapper = el('.btnSair'), loginBox = el('.loginBox');
    destino == 1 ? UserWrapper.appendChild(btnEntrar) : loginBox.appendChild(btnEntrar)
    Notify()
    if (destino == 1) {
        rmClass('#user_box','none');
        rmClass('#conection_box','none');
        addClass('.JoinLeave','none');
        addClass('.loginBox','none');
        rmClass('.loginBox', 'actived');
        addClass('.UserWrapper','actived')
        rmClass('.UserWrapper', 'none');
        addClass('#login_box', 'none');
        addClass('#channels_box', 'none');
        //setTimeout(() => { addClass('.UserWrapper', 'show'); elDisplay('.mainBox', 'none'); elDisplay('.UserWrapper', 'flex'); }, .1 * 1000)
    } else {
        addClass('.loginBox','actived')
        rmClass('.loginBox', 'none');
        addClass('.UserWrapper','none')
        addClass('.JoinLeave','none')
        rmClass('.UserWrapper', 'actived');
        rmClass('#login_box', 'none')
        rmClass('#channels_box', 'none')
        addClass('#user_box','none')
        addClass('#conection_box','none')
        //setTimeout(() => { addClass('.mainBox', 'show'); elDisplay('.mainBox', 'flex'); elDisplay('.UserWrapper', 'none'); }, .1 * 1000)
    }
}

module.exports.changeSides = changeButtonSide;
module.exports.blockInputs = BlockLogin;