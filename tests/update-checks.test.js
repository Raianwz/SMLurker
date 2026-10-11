const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { startUpdateChecks, HOUR } = require('../src/components/helpers/updateChecks');

function fixture(isPackaged = true) {
    const updater = new EventEmitter();
    const warnings = [];
    const notifications = [];
    let scheduled;
    let interval;
    let checks = 0;
    updater.checkForUpdates = async () => { checks++; return null; };
    const state = startUpdateChecks({
        updater,
        isPackaged,
        onDownloaded: (info) => notifications.push(info),
        logger: { warn: (...args) => warnings.push(args) },
        schedule: (callback, delay) => { scheduled = callback; interval = delay; },
    });
    return {
        updater, warnings, notifications, state,
        tick: () => scheduled(),
        interval: () => interval,
        checks: () => checks,
    };
}

test('checks immediately and hourly in a packaged app, including after a null result', async () => {
    const app = fixture();
    assert.equal(app.checks(), 1);
    assert.equal(app.interval(), HOUR);
    await Promise.resolve();
    await app.tick();
    assert.equal(app.checks(), 2);
    assert.deepEqual(app.warnings, []);
});

test('does not check or schedule updates in development', async () => {
    const app = fixture(false);
    assert.equal(app.checks(), 0);
    assert.equal(app.interval(), undefined);
    await app.state.check();
    assert.equal(app.checks(), 0);
});

test('skips overlapping checks and stops checking once an update is downloaded', async () => {
    const app = fixture();
    await Promise.resolve();
    let finish;
    let calls = 0;
    app.updater.checkForUpdates = () => {
        calls++;
        return new Promise((resolve) => { finish = resolve; });
    };
    const pending = app.tick();
    await app.tick();
    assert.equal(calls, 1);
    assert.equal(typeof finish, 'function');
    finish(null);
    await pending;

    const info = { version: '0.1.15' };
    app.updater.emit('update-downloaded', info);
    assert.equal(app.state.isUpdateReady(), true);
    assert.deepEqual(app.notifications, [info]);
    await app.tick();
    assert.equal(calls, 1);
});

test('recovers from a failed check and handles updater errors', async () => {
    const app = fixture();
    await Promise.resolve();
    app.updater.checkForUpdates = async () => { throw new Error('offline'); };
    await app.tick();
    assert.match(app.warnings[0][0], /verificar atualizações/);
    app.updater.emit('error', new Error('download failed'));
    assert.match(app.warnings[1][0], /atualizador/);
    app.updater.checkForUpdates = async () => ({ updateInfo: { version: '0.1.15' } });
    await app.tick();
    assert.equal(app.state.isUpdateReady(), false);
});
