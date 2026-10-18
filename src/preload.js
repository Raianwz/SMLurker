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
    channelFiles: {
        import: () => ipcRenderer.invoke('channel-files:import'),
        export: (format) => ipcRenderer.invoke('channel-files:export', format),
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
    streams: {
        status: (logins) => {
            const { fetchLiveStatus } = require('./components/twitch/liveStatusSource');
            return fetchLiveStatus(logins);
        },
    },
    tw: {
        tmi: {
            ini: (options) => {
                const client = smcore.tmi.ini(options);
                return { on: (event, callback) => {
                    if (['connected', 'disconnected', 'join', 'part'].includes(event)) client.on(event, callback);
                } };
            },
            channels: () => smcore.tmi.channels(),
            cn: () => smcore.tmi.cn(),
            dc: () => smcore.tmi.dc(),
        },
        data: {
            createProfile: (accessToken) => smcore.data.createProfile(accessToken),
            loadUserData: () => smcore.data.loadUserData(),
            saveUserData: (username, token) => smcore.data.saveUserData(username, token),
        },
        jcnc: (channels) => smcore.jcnc(channels),
        jp: () => smcore.jp(),
    },
    cr: {
        appr: { getVersion: () => appcore.appr.getVersion() },
        eshell: { openExternal: (url) => {
            if (/^https:\/\/github\.com\/Raianwz\/SMLurker\/releases\//.test(url)) {
                return appcore.eshell.openExternal(url);
            }
        } },
        ipc: {
            emit: (name) => {
                if (['openConsole', 'openConfigs'].includes(name)) ipcRenderer.send(name);
            },
            send: (name, value) => {
                if (['tray:connection-status', 'sendtoCleanConsole'].includes(name)) ipcRenderer.send(name, value);
            },
        },
        wb: {
            close: () => appcore.wb.close(),
            hide: () => appcore.wb.hide(),
            minimize: () => appcore.wb.minimize(),
        },
        dg: { showMB: (options) => appcore.dg.showMB(options) },
        helpers: { sleep: (ms) => appcore.helpers.sleep(ms) },
        tr: appcore.tr,
    },
    desktop: {
        showMenu: (kind) => {
            const { Menu, getCurrentWindow } = require('@electron/remote');
            const input = ['undo', 'redo', 'cut', 'copy', 'paste', 'selectAll'];
            const template = kind === 'refresh'
                ? [
                    { label: 'Recarregar', click: () => ipcRenderer.send('app-reload:request') },
                    { type: 'separator' },
                    { label: 'Reiniciar', click: () => ipcRenderer.send('app-restart:request') },
                ]
                : kind === 'input' ? input.map(role => ({ role })) : null;
            if (template) Menu.buildFromTemplate(template).popup(getCurrentWindow());
        },
    },
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
