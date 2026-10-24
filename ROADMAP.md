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
- [x] Centralizar a leitura de perfil em `api.userprofile.get(username)`, compartilhando o cache de 24 horas com a interface.
- [x] Expor operações de canais e notificações pela API local do preload, com validação e gravação no processo principal para a tela principal.
- [x] Simplificar a tela de vinculação no projeto Web: destacar **Logar no SMLurker**, manter a conta visível, separar **Cancelar e voltar ao aplicativo** e oferecer **Abrir novamente** após a tentativa de retorno.
- [x] Oferecer **Desconectar** para encerrar apenas o IRC, **Trocar conta** sem apagar a sessão atual antes da confirmação e **Sair da conta** para remover a sessão Web local, preservando o OAuth legado.
- [x] Confirmar a remoção individual de canais e exigir duas confirmações para limpar a lista inteira.
- [x] Limitar o tempo de espera pela abertura do IRC e pela entrada em cada canal.
- [x] Oferecer os visuais **Moderno** e **Clássico** nas configurações, persistindo a escolha e aplicando-a às janelas abertas.
- [x] Mostrar os canais conectados ao vivo, uma lista consultável desses canais e o tempo da sessão no perfil.
- [x] Respeitar o limite de 100 canais IRC com seleção dos canais a conectar e permitir sair de um canal conectado pela Conexão rápida sem alterar a lista salva.
- [x] Registrar entradas, saídas e falhas no painel de eventos; remover canais com falha confirmada da lista após criar backups para o usuário.

## Próximos polimentos

- [x] Mostrar estados mais claros de conexão: verificando sessão, conectando, canais conectados e erro, com opção de tentar novamente.
- [ ] Avaliar mover **Sair da conta** da tela de login para o menu do perfil e oferecer uma ação separada e confirmada para esquecer o OAuth legado.
- [x] Melhorar navegação por teclado, foco visível e textos dos tooltips em todas as telas.
- [x] Oferecer desfazer a última remoção de canal durante a sessão.
- [x] Evitar registrar novamente os mesmos listeners da interface a cada reconexão.
- [x] Mostrar o estado de espera pela abertura do IRC em `joinchannels.js` enquanto a conexão ainda não está pronta.
- [ ] Testar manualmente login, Ctrl+R, reconexão, expiração de token e notificações no Windows instalado e portátil.

## Evolução técnica

- [x] Consultar o perfil diretamente na Twitch quando houver credenciais válidas, mantendo o cache atual e a Dank API como fallback.
- [x] Usar a Dank API como fonte principal de perfil, com endereço reserva e a API legada Vercel como último fallback.
- [ ] Avaliar importação da lista de canais do SMLurker Web para o Electron e envio da lista do Electron para o Web, com deduplicação e confirmação antes de substituir dados.
- [ ] Validar no Electron empacotado a troca do código temporário após a Web usar PostgreSQL compartilhado (ELE-WEB-001). Neon Free é uma opção inicial de hospedagem a avaliar no projeto Web; o Electron continuará acessando apenas a API Web.
- [ ] Planejar renovação do token Web com o projeto Web; hoje a sessão precisa de novo login quando o token expira.
- [ ] Revalidar com a Twitch, ao menos a cada hora, os tokens OAuth mantidos pelo Electron (login Web e clássico) durante sessões longas; na reconexão do IRC, distinguir token revogado ou expirado de falha temporária de rede.
- [x] Migrar as credenciais legadas em texto puro para armazenamento protegido, sem quebrar usuários atuais.
- [x] Desabilitar Node.js nas páginas, restringir a API exposta pelo preload e avaliar a mudança do IRC para outro processo. O IRC permanece no preload por enquanto; colocá-lo no processo principal adicionaria tráfego de mensagens e trabalho ao processo das janelas.
- [ ] Substituir o uso restante de `@electron/remote` e das dependências Node.js nos preloads por IPC específico; mover o IRC/`tmi.js` para fora do preload e então ativar e testar o sandbox das três janelas.
- [ ] Validar o tempo de entrada, a responsividade da interface e a reconexão após perda de rede com até 100 canais selecionados, inclusive quando a lista salva tiver mais de 100.
- [ ] Fechar a matriz de testes e empacotamento da versão 0.1.15, prevista como última com suporte a Windows 32 bits.
