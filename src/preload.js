// Preload (Isolated World)
const { contextBridge, ipcRenderer } = require('electron')
const { smcore } = require('./internal/smcore')
const { appcore } = require('./internal/appcore')

const api = {
    channels: {
        list: () => ipcRenderer.invoke('local:channels:list'),
        add: (channels) => ipcRenderer.invoke('local:channels:add', channels),
        remove: (channels) => ipcRenderer.invoke('local:channels:remove', channels),
        replace: (channels) => ipcRenderer.invoke('local:channels:replace', channels),
    },
    preferences: {
        get: () => ipcRenderer.invoke('local:preferences:get'),
        updateNotifications: (values) => ipcRenderer.invoke('local:preferences:update-notifications', values),
    },
    appearance: {
        get: () => ipcRenderer.invoke('appearance:get'),
        onChanged: (callback) => {
            const listener = (_event, appearance) => callback(appearance);
            ipcRenderer.on('appearance:changed', listener);
            return () => ipcRenderer.removeListener('appearance:changed', listener);
        },
    },
    reload: {
        request: () => ipcRenderer.send('app-reload:request'),
        requestRestart: () => ipcRenderer.send('app-restart:request'),
        perform: (action) => ipcRenderer.send('app-reload:perform', action),
        onRequested: (callback) => {
            const listener = (_event, action) => callback(action);
            ipcRenderer.on('app-reload:requested', listener);
            return () => ipcRenderer.removeListener('app-reload:requested', listener);
        },
    },
    auth: {
        startWebLogin: () => ipcRenderer.invoke('web-login:start'),
        restoreWebLogin: () => ipcRenderer.invoke('web-login:restore'),
        invalidateWebLogin: () => ipcRenderer.invoke('web-login:invalid'),
        logoutWebLogin: () => ipcRenderer.invoke('web-login:logout'),
        onWebLoginResult: (callback) => {
            const listener = (_event, result) => callback(result);
            ipcRenderer.on('web-login:result', listener);
            return () => ipcRenderer.removeListener('web-login:result', listener);
        },
    },
    userprofile: {
        get: (username, accessToken) => {
            const { getUserProfile } = require('./components/smdata/coredata');
            return getUserProfile(username, accessToken);
        },
    },
    tw: smcore,
    cr: appcore,
    console: {
        manager: () => {
            let { consoleMng } = require('./components/window/console')
            consoleMng()
        },
        panelListiner: () =>{
            let { consolePnListiner } = require('./components/window/panelConsole')
            consolePnListiner()
        },
        jcPanel: (txt) => {
            let { jcPanel } = require('./components/window/console')
            jcPanel(txt)
        },
        jcPanelReset: () =>{
            let { jcPNReset} = require('./components/window/console')
            jcPNReset()
        },
    },
    tray: {
        export: () => {
            let { ExportTray } = require('./components/helpers/tray')
            ExportTray()
        }
    }

}

contextBridge.exposeInMainWorld('api', api);
