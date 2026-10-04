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
- inicialização com o Windows, conexão automática opcional e início minimizado;
- atualização automática das versões instaladas.

## Como usar

1. Baixe a versão mais recente na página de [Releases](https://github.com/Raianwz/SMLurker/releases/latest) — há builds instalável e portátil.
2. Abra o SMLurker e escolha **Entrar com a Twitch** para fazer login pelo navegador. Quem já possui credenciais legadas salvas ainda pode usar o formulário antigo.
3. Abra **Gerenciar Canais**, adicione os canais desejados e clique em **Entrar nos canais**. Se **Conectar automaticamente** estiver ativo, essa etapa ocorre sozinha após o login ou a restauração da sessão.
5. No perfil, ative as notificações que quiser receber.

Os arquivos do usuário (lista de canais, preferências, perfil e credenciais) ficam no diretório de dados da aplicação, dentro da pasta `Config`. O botão **Local dos Arquivos**, nas configurações, abre esse diretório.

> **Atenção:** o login legado ainda usa `credentials.json` sem criptografia. O login Web guarda o token separadamente em `web-session.bin`, protegido pelo armazenamento do sistema. Não compartilhe os arquivos de configuração; se um token legado for exposto, revogue-o.

## Integração com o SMLurker Web

O botão **Entrar com a Twitch** abre o SMLurker Web no navegador. A URL pode ser configurada por `SMLURKER_WEB_URL`: o padrão é `http://localhost:3000` no desenvolvimento e `https://web.smlurker.rwz.app` no aplicativo empacotado.

O Electron abre `/connect/apps/com.smlurker` com `state`, desafio SHA-256 e URI de retorno. A Web devolve **somente um código temporário** no link; o Electron o troca por uma requisição `POST /api/apps/com.smlurker/exchange` com `code`, `codeVerifier` e `redirectUri`. O token não aparece na URL nem é salvo no `credentials.json` legado.

A sessão Web é restaurada após reiniciar ou recarregar o aplicativo enquanto o token for válido. O Electron verifica o token com a Twitch; se ele expirar ou for revogado, solicita novo login. A renovação automática ainda não foi implementada.

O que já foi entregue e os próximos passos estão no [roadmap do Electron](ROADMAP.md).

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
