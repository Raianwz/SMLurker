/*===========================================(ANIMAÇÃO DE TRANSIÇÃO)===========================================*/
//Desativar inputs e botões durante a mudança de telas
function BlockLogin(valor) {
    const items = ['#username', '#pass', '#txtCanal', 'input[type="button"].add', 'input[type="button"].remove'];
    let btnFiles = document.querySelector('.cnFile');
    for (let i = 0; i < items.length; i++) {
        document.querySelector(items[i]).disabled = valor
    }
    if (valor == true) {
        btnFiles.classList.add('block')
        btnFiles.onclick = null;
    } else {
        btnFiles.classList.remove('block')
        btnFiles.onclick = console.log('click')//loadChannelsFromFile;
    }
}

//Transição entre Tela Login e Tela Principal
function changeButtonSide(btnEntrar, destino) {
    const el = (el) => document.querySelector(el)
    const elDisplay = (ele, style) => el(ele).style.display = `${style}`
    const rmClass = (ele, Class) => el(`${ele}`).classList.remove(`${Class}`);
    const addClass = (ele, Class) => el(`${ele}`).classList.add(`${Class}`);
    let conectBox = el('.btnSair'), loginBox = el('.loginBox');
    destino == 1 ? conectBox.appendChild(btnEntrar) : loginBox.appendChild(btnEntrar)
    //Notify();
    if (destino == 1) {
        addClass('.mainBox', 'hide');
        setTimeout(() => { addClass('.conectBox', 'show'); elDisplay('.mainBox', 'none'); elDisplay('.conectBox', 'flex'); }, .1 * 1000)
    } else {
        rmClass('.conectBox', 'show'); rmClass('.mainBox', 'hide'); addClass('.conectBox', 'hide');
        setTimeout(() => { addClass('.mainBox', 'show'); elDisplay('.mainBox', 'flex'); elDisplay('.conectBox', 'none'); }, .1 * 1000)
    }
}

module.exports.changeSides = changeButtonSide;
module.exports.blockInputs = BlockLogin;