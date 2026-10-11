# Roadmap do SMLurker Electron

Este checklist descreve o estado do Electron neste repositório. `[x]` indica algo implementado; `[ ]` é uma ideia ou tarefa ainda em aberto, não uma promessa de release.

## Feito

- [x] Gerenciar vários canais: adicionar, remover, importar, exportar e entrar/sair durante a execução.
- [x] Receber menções e SubGifts no painel de eventos, com notificações nativas configuráveis.
- [x] Operar pela bandeja, iniciar com o Windows, iniciar minimizado e verificar atualizações.
- [x] Preservar o login legado para quem já possui `credentials.json`.
- [x] Permitir voltar da tela Web para o login com OAuth salvo, sem alterar a sessão Web ou o `credentials.json`.
- [x] Entrar com a Twitch pelo Web usando código temporário no retorno ao Electron, sem token na URL.
- [x] Separar o login da conexão aos canais e mostrar a foto do perfil antes da conexão.
- [x] Salvar a sessão Web em arquivo separado, protegido pelo `safeStorage`, e validar o token ao restaurá-la.
- [x] Usar a opção **Conectar automaticamente** também com o login Web.
- [x] Usar **Desconectar** para sair dos canais sem apagar o login salvo.
- [x] Ao detectar token Web inválido, limpar a sessão, avisar por notificação nativa e abrir a tela de login.
- [x] Cobrir os fluxos principais de login, restauração e conexão com testes automatizados.

## Próximos polimentos

- [ ] Simplificar a tela de vinculação no projeto Web: destacar **Logar no SMLurker**, separar visualmente **Cancelar e voltar ao aplicativo**, e mostrar **Abrir o aplicativo novamente** apenas quando o retorno automático falhar. Reduzir textos técnicos e manter o nome da conta visível.
- [ ] Mostrar estados mais claros de conexão: verificando sessão, conectando, canais conectados e erro, com opção de tentar novamente.
- [ ] Separar as três ações na interface: **Desconectar** na barra lateral (só encerra o IRC), **Trocar conta** na tela de login (abre outra autenticação sem apagar a atual antes da confirmação) e **Sair da conta** no menu do perfil (apaga a sessão Web local e volta ao login). Preservar `credentials.json`; oferecer uma ação separada e confirmada caso o usuário queira esquecer o OAuth legado.
- [ ] Melhorar navegação por teclado, foco visível e textos dos tooltips em todas as telas.
- [ ] Confirmar ações destrutivas na lista de canais e oferecer desfazer a última remoção durante a sessão.
- [ ] Evitar registrar novamente os mesmos listeners da interface a cada reconexão.
- [ ] Corrigir a espera pela abertura do IRC em `joinchannels.js`, atualizando o estado e aplicando um tempo limite.
- [ ] Testar manualmente login, Ctrl+R, reconexão, expiração de token e notificações no Windows instalado e portátil.

## Evolução técnica

- [ ] Avaliar importação da lista de canais do SMLurker Web para o Electron e envio da lista do Electron para o Web, com deduplicação e confirmação antes de substituir dados.
- [ ] Planejar renovação do token Web com o projeto Web; hoje a sessão precisa de novo login quando o token expira.
- [ ] Migrar as credenciais legadas em texto puro para armazenamento protegido, sem quebrar usuários atuais.
- [ ] Reduzir o acesso do renderer a Node.js/`@electron/remote` e avaliar mover a conexão IRC para o processo principal.
- [ ] Revisar desempenho com listas grandes de canais e o comportamento de reconexão após perda de rede.
- [ ] Fechar a matriz de testes e empacotamento da versão 0.1.15, prevista como última com suporte a Windows 32 bits.
