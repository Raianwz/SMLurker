# SMLurker

Acompanhe chats da Twitch em segundo plano no Windows e receba avisos de menções e SubGifts.

> Projeto pessoal feito com Electron e [tmi.js](https://tmijs.com/).

## Funcionalidades

- Conexão com até 100 canais, com entrada e saída rápida sem alterar a lista salva.
- Gerenciamento, importação e exportação da lista de canais.
- Painel de eventos e notificações do Windows para menções e SubGifts.
- Execução pela bandeja, início com o Windows e conexão automática opcionais.
- Aparência moderna ou clássica; atualização automática na versão instalada.

## Como usar

1. Baixe a versão [instalável ou portátil](https://github.com/Raianwz/SMLurker/releases/latest).
2. Entre com a Twitch pelo navegador. Para testar **Entrar com código**, ative **Configurações → Login via Código Twitch**; essa opção vem desligada.
3. Em **Gerenciar canais**, adicione os canais desejados e clique em **Entrar nos canais**.
4. No perfil, escolha quais notificações deseja receber. A conexão automática pode ser ativada nas configurações.

## Contas, configurações e dados

O login clássico por token continua disponível para quem já o utiliza. Os tokens são protegidos pelo `safeStorage` do Electron em `Config/UserOAuth.bin`, `web-session.bin` ou `direct-session.bin`, conforme o método. Credenciais antigas em `credentials.json` são migradas quando a proteção do sistema está disponível; novas credenciais não são gravadas em texto puro.

A lista de canais, o perfil e as preferências ficam na pasta `Config`, acessível em **Configurações → Local dos arquivos**. Ao desinstalar, os dados são mantidos por padrão; marque **Apagar dados locais, configurações e lista de canais** para removê-los. Se mover o portátil após ativar **Iniciar com Windows**, desligue e ligue essa opção no novo local.

## Login pelo navegador ou por código

**Entrar com a Twitch** abre o SMLurker Web. No desenvolvimento, tenta `http://localhost:3000` e usa `https://smlurker.vercel.app` se ele não estiver disponível; no pacote, usa `https://web.smlurker.rwz.app`. `SMLURKER_WEB_URL` define outra origem. A Web devolve um código temporário, que o Electron troca pelo token sem expô-lo na URL. Essa sessão é restaurada enquanto válida; sua renovação automática ainda não existe.

## Perfil e API local

O perfil é consultado primeiro na Twitch Helix; se necessário, o app recorre à Dank API e à API legada, com cache local de 24 horas. A interface acessa arquivos e preferências por métodos específicos do preload. Os preloads ainda usam Node.js e `@electron/remote`, por isso o sandbox do renderer permanece desativado.

Os próximos passos estão no [roadmap do Electron](ROADMAP.md).

## Executando o projeto

Você precisa ter [Node.js](https://nodejs.org/) e npm instalados.

```bash
git clone https://github.com/Raianwz/SMLurker.git
cd SMLurker
npm install
npm run dev
```

No modo de desenvolvimento, o Electron abre as ferramentas de desenvolvedor automaticamente.

## Scripts disponíveis

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o aplicativo com Electron. |
| `npm test` | Testa login, sessão Web e conexão aos canais. |
| `npm run nodemon` | Reinicia o aplicativo quando os arquivos mudam (requer `nodemon`). |
| `npm run pack` | Gera o diretório do aplicativo para Windows 32 bits. |
| `npm run build` | Gera os pacotes portátil e NSIS para Windows 32 bits, com a descrição "SMLurker Portable" no lançador portátil. |
| `npm run release` | Gera os pacotes e publica uma release pelo `electron-builder`. |

Os artefatos de build são gravados em `releases/`.

## Estrutura do projeto

```text
SMLurker/
├── main.js                 # processo principal do Electron
├── src/
│   ├── app/                # páginas da interface
│   ├── components/         # Twitch, janelas, IPC e configurações
│   ├── internal/           # APIs internas compartilhadas
│   ├── css/                # estilos e recursos visuais
│   ├── assets/             # ícones, imagens e sons
│   └── preload.js          # ponte entre Electron e a interface
└── package.json            # dependências, scripts e configuração do build
```

## Tecnologias

- [Electron](https://www.electronjs.org/)
- [tmi.js](https://tmijs.com/)
- [electron-builder](https://www.electron.build/)
- [electron-updater](https://www.electron.build/auto-update)

## Licença

Distribuído sob a licença MIT. Consulte [LICENSE](LICENSE) para mais informações.
