//Legacy
Controls();
function Controls() {
    const el = (e) => document.querySelector(e);
    const { getCurrentWindow } = require('@electron/remote');
    const wButton = btn => el(`svg[name=${btn}]`)
    wButton('closeWindow').addEventListener('click', () => getCurrentWindow().close())
    wButton('minWindow').addEventListener('click', () => getCurrentWindow().minimize())
}