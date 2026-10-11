const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/components/smdata/coredata.js'), 'utf8');

function profileHarness(initialProfile, fetchImpl) {
    let stored = initialProfile ? JSON.stringify(initialProfile) : null;
    let writes = 0;
    const userBox = { innerHTML: '' };
    const username = { value: 'raianwz' };
    const appcore = {
        appr: { getPath: () => 'userData' },
        fs: {
            exist: () => stored !== null,
            read: () => stored,
            write: (_path, data) => { stored = data; writes++; },
        },
    };
    const context = {
        module: { exports: {} },
        require: () => ({ appcore }),
        document: {
            getElementById: () => userBox,
            querySelector: () => username,
        },
        fetch: fetchImpl,
    };
    vm.runInNewContext(source, context);
    return {
        createProfile: context.module.exports.createProfile,
        userBox,
        username,
        getStored: () => stored && JSON.parse(stored),
        getWrites: () => writes,
    };
}

const profile = (expire, logo = 'https://example.com/old.png') => ({
    login: 'raianwz',
    display_name: 'Old Name',
    profile_image_url: logo,
    chatColor: '#9148FF',
    expire,
});

test('fresh profile cache serves the new login without another API call', async () => {
    let calls = 0;
    const harness = profileHarness(profile(new Date().toISOString()), () => { calls++; });
    const result = await harness.createProfile();
    assert.equal(result.logo, 'https://example.com/old.png');
    assert.equal(calls, 0);
    assert.equal(harness.getWrites(), 0);
});

test('legacy day/month/year cache dates are still accepted', async () => {
    let calls = 0;
    const now = new Date();
    const legacyDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
    const harness = profileHarness(profile(legacyDate), () => { calls++; });
    const result = await harness.createProfile();
    assert.equal(result.displayName, 'Old Name');
    assert.equal(calls, 0);
});

test('expired profile refreshes once for simultaneous callers and displays the new avatar immediately', async () => {
    let calls = 0;
    const harness = profileHarness(profile(new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()), async () => {
        calls++;
        return { ok: true, json: async () => ({
            login: 'raianwz', display_name: 'New Name',
            profile_image_url: 'https://example.com/new.png', chatColor: '#9148FF',
        }) };
    });
    const [first, second] = await Promise.all([harness.createProfile(), harness.createProfile()]);
    assert.equal(calls, 1);
    assert.equal(first.logo, 'https://example.com/new.png');
    assert.equal(second.displayName, 'New Name');
    assert.match(harness.userBox.innerHTML, /new\.png/);
    assert.equal(harness.getWrites(), 1);
    await harness.createProfile();
    assert.equal(calls, 1);
});

test('failed refresh keeps a matching cached profile without updating its timestamp', async () => {
    const old = profile(new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString());
    const harness = profileHarness(old, async () => { throw new Error('offline'); });
    const result = await harness.createProfile();
    assert.equal(result.logo, old.profile_image_url);
    assert.equal(harness.getStored().expire, old.expire);
    assert.equal(harness.getWrites(), 0);
});
