// Configurações executam no contexto isolado; a página não recebe acesso ao Node.js.
window.addEventListener('DOMContentLoaded', () => {
    require('./components/configs/configs');
}, { once: true });
