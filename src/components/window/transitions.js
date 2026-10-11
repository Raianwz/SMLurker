/*===========================================(ANIMAÇÃO DE TRANSIÇÃO)===========================================*/
const { appcore } = require('../../internal/appcore')
//Desativar inputs e botões durante a mudança de telas
function BlockLogin(valor) {
    const items = [
        '#username', '#pass', '#txtCanal',
        '.channelsManager button.add',
        '.channelsManager button.remove',
        '.channelsManager button.channel-list-remove',
        '.channelsManager #channelRemoveConfirm',
        '.channelsManager button[name="loadChannelsFromFile"]',
    ];
    for (const selector of items) {
        document.querySelectorAll(selector).forEach(item => { item.disabled = valor; });
    }
}

//Transição entre Tela Login e Tela Principal
function changeButtonSide(destino) {
    const el = (el) => document.querySelector(el)
    const rmClass = (ele, Class) => el(`${ele}`).classList.remove(`${Class}`);
    const addClass = (ele, Class) => el(`${ele}`).classList.add(`${Class}`);
    const Notify = async () => appcore.sc.data.loadNotify();
    Notify()
    if (destino == 1) {
        rmClass('#user_box','none');
        rmClass('#app_exit','none');
        rmClass('#conection_box','none');
        rmClass('#console_open','none');
        addClass('.JoinLeave','none');
        addClass('.loginBox','none');
        rmClass('.loginBox', 'actived');
        addClass('.UserWrapper','actived')
        rmClass('.UserWrapper', 'none');
        addClass('#login_box', 'none');
        addClass('#channels_box', 'none');
    } else {
        addClass('#app_exit','none')
        addClass('.loginBox','actived')
        rmClass('.loginBox', 'none');
        addClass('.UserWrapper','none')
        addClass('.JoinLeave','none')
        rmClass('.UserWrapper', 'actived');
        rmClass('#login_box', 'none')
        rmClass('#channels_box', 'none')
        addClass('#user_box','none')
        addClass('#conection_box','none')
        addClass('#console_open','none')

    }
}

module.exports.changeSides = changeButtonSide;
module.exports.blockInputs = BlockLogin;
