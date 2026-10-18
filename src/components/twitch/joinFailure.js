function classifyJoinFailure(error) {
    const message = typeof error === 'string' ? error : error?.message;
    switch (message) {
        case 'msg_channel_suspended':
            return { code: 'suspended', label: 'canal suspenso ou removido' };
        case 'msg_room_not_found':
            return { code: 'not_found', label: 'canal não encontrado' };
        case 'msg_banned':
            return { code: 'banned', label: 'sua conta foi banida do chat' };
        case 'tos_ban':
            return { code: 'tos_ban', label: 'canal encerrado pela Twitch' };
        case 'no_permission':
            return { code: 'no_permission', label: 'entrada sem permissão' };
        case 'invalid_user':
            return { code: 'invalid_user', label: 'usuário inválido' };
        case 'No response from Twitch.':
            return { code: 'no_response', label: 'sem resposta da Twitch' };
        case 'Not connected to server.':
            return { code: 'disconnected', label: 'IRC desconectado' };
        default:
            return { code: 'other', label: typeof message === 'string' && message.startsWith('Tempo esgotado ao entrar em ')
                ? 'tempo esgotado' : 'erro ao conectar' };
    }
}

module.exports = { classifyJoinFailure };
