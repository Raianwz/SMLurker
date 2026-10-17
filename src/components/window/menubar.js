module.exports.WMenubar = windowMenuBar;

function windowMenuBar(app) {
  const win = app()
  win.webContents.on('dom-ready', () => {
    let msearch = ""
    if (app().getTitle() == 'SM Lurker') {
      msearch = `
          let ele = (e) => document.querySelector(e)
          let mSec = (idsec) => ele(\`section#\${idsec}\`)
  
          function sectionHandle(id,sec){

            if( document.querySelector(\`#\${id}\`).hasAttribute('disabled') == false){
              document.querySelector('.selected').classList.remove('selected')
              document.querySelector(\`#\${id}\`).classList.add('selected')

              document.querySelector('.actived').classList.add('none')
              document.querySelector('.actived').classList.remove('actived')
  
              document.querySelector(\`\${sec}\`).classList.remove('none')
              document.querySelector(\`\${sec}\`).classList.add('actived')
            }
          }
  
          mSec('login_box').addEventListener('click', () => sectionHandle('login_box','.loginBox'));
          mSec('channels_box').addEventListener('click', () => sectionHandle('channels_box','.channelsManager'));
          mSec('user_box').addEventListener('click', () => sectionHandle('user_box','.UserWrapper'));
          mSec('conection_box').addEventListener('click', () => sectionHandle('conection_box','.JoinLeave'));
          document.querySelectorAll('.menu-bar > section[role="button"]').forEach((item) => {
            item.addEventListener('keydown', (event) => {
              if (item.hasAttribute('disabled') || !['Enter', ' '].includes(event.key)) return;
              event.preventDefault();
              item.click();
            });
          });
          `;

    }

    win.webContents.executeJavaScript(`${msearch}`);
  })

}

