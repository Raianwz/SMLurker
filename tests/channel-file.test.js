const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { getChannelsFilePath, parseChannels, readChannelsFile } = require('../src/components/helpers/channelFile');

test('development channels use the devdata directory at the project root', () => {
    const appPath = path.join('workspace', 'SMLurker');
    const directories = [];
    const app = { isPackaged: false, getAppPath: () => appPath };
    const fileSystem = { mkdirSync: (directory, options) => directories.push([directory, options]) };

    assert.equal(getChannelsFilePath(app, fileSystem), path.join(appPath, 'devdata', 'channels.json'));
    assert.deepEqual(directories, [[path.join(appPath, 'devdata'), { recursive: true }]]);
});

test('packaged channels remain in userData Config', () => {
    const userData = path.join('user', 'SMLurker');
    const app = { isPackaged: true, getPath: () => userData };
    const fileSystem = { mkdirSync: () => assert.fail('packaged app must not create devdata') };

    assert.equal(getChannelsFilePath(app, fileSystem), path.join(userData, 'Config', 'channels.json'));
});

test('reads JSON arrays and legacy comma-separated development lists', () => {
    assert.deepEqual(parseChannels('["#first","#second"]'), ['#first', '#second']);
    assert.deepEqual(parseChannels('#first,second\n#third'), ['#first', '#second', '#third']);
    assert.deepEqual(readChannelsFile('channels.json', {
        readFileSync: () => '#first,second',
    }), ['#first', '#second']);
});

test('rejects malformed channel lists', () => {
    assert.throws(() => parseChannels('{"channels":["#first"]}'));
    assert.throws(() => parseChannels('#first,invalid/channel'));
});
