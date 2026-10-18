function classifyJoinFailure(error) {
    const message = typeof error === 'string' ? error : error?.message;
    switch (message) {
        case 'msg_channel_suspended':
            return { code: 'suspended', label: 'canal suspenso' };
        case 'msg_room_not_found':
            return { code: 'not_found', label: 'canal não encontrado' };
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
