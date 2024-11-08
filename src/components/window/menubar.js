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
  
          mSec('login_box').addEventListener('click', (e) => sectionHandle(e.target.id,'.loginBox'));
          mSec('channels_box').addEventListener('click', (e) => sectionHandle(e.target.id,'.channelsManager'));;
          mSec('user_box').addEventListener('click', (e) => sectionHandle(e.target.id,'.UserWrapper'));;
          mSec('conection_box').addEventListener('click', (e) => sectionHandle(e.target.id,'.JoinLeave'));;
          `;

    }

    win.webContents.executeJavaScript(`${msearch}`);
  })

}

