const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createLocalData } = require('../src/components/helpers/localData');

function fixture() {
    const files = new Map();
    const fileSystem = {
        existsSync: (filename) => files.has(filename),
        readFileSync: (filename) => files.get(filename),
        writeFileSync: (filename, contents) => files.set(filename, contents),
        mkdirSync() {},
    };
    const app = { isPackaged: true, getPath: () => path.join('user', 'SMLurker') };
    return { data: createLocalData(app, fileSystem), files, root: app.getPath() };
}

test('channel API normalizes names and preserves saved channels across edits', () => {
    const { data, files, root } = fixture();
    const filename = path.join(root, 'Config', 'channels.json');
    files.set(filename, '#Old,second');
    assert.deepEqual(data.channels.list(), ['#old', '#second']);
    assert.deepEqual(data.channels.add(['SECOND', 'New']).channels, ['#old', '#second', '#new']);
    assert.deepEqual(data.channels.remove(['old']).channels, ['#second', '#new']);
    assert.deepEqual(JSON.parse(files.get(filename)), ['#second', '#new']);
    assert.throws(() => data.channels.replace(['valid', '../outside']), /Nome de canal inválido/);
    assert.deepEqual(JSON.parse(files.get(filename)), ['#second', '#new']);
});

test('notification API updates only the allowed preferences', () => {
    const { data, files, root } = fixture();
    const filename = path.join(root, 'Config', 'configs.json');
    files.set(filename, JSON.stringify({ autologin: true, NotifyMe: false, NotifyGift: false, custom: 7 }));
    const updated = data.preferences.updateNotifications({ NotifyMe: true, NotifyGift: true, autologin: false });
    assert.equal(updated.autologin, true);
    assert.equal(updated.custom, 7);
    assert.equal(updated.NotifyMe, true);
    assert.equal(updated.NotifyGift, true);
    assert.throws(() => data.preferences.updateNotifications({ NotifyMe: 'yes', NotifyGift: false }), /inválidas/);
    assert.equal(JSON.parse(files.get(filename)).NotifyMe, true);
});

test('appearance defaults to modern and preserves other preferences when changed', () => {
    const { data, files, root } = fixture();
    const filename = path.join(root, 'Config', 'configs.json');
    files.set(filename, JSON.stringify({ autologin: true, appearance: 'unknown' }));
    assert.equal(data.preferences.get().appearance, 'modern');

    const updated = data.preferences.updateAppearance('classic');
    assert.equal(updated.appearance, 'classic');
    assert.equal(updated.autologin, true);
    assert.equal(JSON.parse(files.get(filename)).appearance, 'classic');
    assert.throws(() => data.preferences.updateAppearance('dark'), /Visual inválido/);
});
