# SMLurker

Aplicativo desktop para acompanhar vários chats da Twitch em segundo plano. O SMLurker conecta sua conta aos canais escolhidos, mantém a aplicação acessível pela bandeja do Windows e pode avisar quando você recebe uma menção ou um SubGift.

> Projeto pessoal construído com Electron e [tmi.js](https://tmijs.com/). A interface e os fluxos atuais são voltados para Windows.

## Funcionalidades

- conexão simultânea com uma lista de canais da Twitch;
- adição, remoção, importação e exportação de canais;
- entrada e saída de canais durante a execução;
- painel de eventos e menções recebidas;
- notificações do sistema para menções e SubGifts;
- execução em segundo plano pela bandeja;
- inicialização com o Windows, login automático e início minimizado;
- atualização automática das versões instaladas.

## Como usar

1. Baixe a versão mais recente na página de [Releases](https://github.com/Raianwz/SMLurker/releases/latest) — há builds instalável e portátil.
2. Abra o SMLurker e informe seu nome de usuário da Twitch.
3. Gere um token OAuth para o chat pelo link exibido no aplicativo e cole-o no campo `Twitch OAuth`. O valor deve começar com `oauth:`.
4. Abra **Gerenciar Canais**, adicione os canais desejados e clique em **Entrar**.
5. No perfil, ative as notificações que quiser receber.

Os arquivos do usuário (lista de canais, preferências, perfil e credenciais) ficam no diretório de dados da aplicação, dentro da pasta `Config`. O botão **Local dos Arquivos**, nas configurações, abre esse diretório.

> **Atenção:** a versão atual salva o usuário e o token OAuth localmente em `credentials.json`, sem criptografia. Não compartilhe esse arquivo nem envie a pasta de configurações para repositórios. Caso o token seja exposto, revogue-o e gere outro.

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
| `npm run nodemon` | Reinicia o aplicativo quando os arquivos mudam (requer `nodemon`). |
| `npm run pack` | Gera o diretório do aplicativo para Windows 32 bits. |
| `npm run build` | Gera os pacotes portátil e NSIS para Windows 32 bits. |
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

## Contribuindo

Issues e pull requests são bem-vindos. Para mudanças maiores, abra uma issue antes para alinhar a proposta.

## Licença

Distribuído sob a licença MIT. Consulte [LICENSE](LICENSE) para mais informações.
