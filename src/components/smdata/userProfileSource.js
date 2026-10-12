const PROFILE_TIMEOUT_MS = 4000;
const DEFAULT_DANK_API_URL = 'https://dank.rwz.app';
const BACKUP_DANK_API_URL = 'https://dank-api.vercel.app';
const LEGACY_PROFILE_URL = 'https://apichatwz.vercel.app';

function validProfile(profile, username) {
    return profile && typeof profile.login === 'string' &&
        profile.login.toLowerCase() === username.toLowerCase() &&
        typeof profile.display_name === 'string' && profile.display_name.trim() !== '' &&
        typeof profile.profile_image_url === 'string' && /^https?:\/\//.test(profile.profile_image_url);
}

async function fetchUserProfile(username, fetchImpl = fetch, dankApiBaseUrl = process.env.SMLURKER_DANK_API_URL || DEFAULT_DANK_API_URL) {
    const encodedUsername = encodeURIComponent(username);
    const preferredBaseUrl = typeof dankApiBaseUrl === 'string' && /^https:\/\//.test(dankApiBaseUrl)
        ? dankApiBaseUrl.replace(/\/+$/, '') : DEFAULT_DANK_API_URL;
    const preferredDankUrl = `${preferredBaseUrl}/twitch/user/${encodedUsername}`;
    const dankSources = [...new Set([preferredBaseUrl, BACKUP_DANK_API_URL])]
        .map((baseUrl) => `${baseUrl}/twitch/user/${encodedUsername}`);
    const legacyUrl = `${LEGACY_PROFILE_URL}/smlurker/${encodedUsername}/`;
    let skipDankBackup = false;

    for (const url of [...dankSources, legacyUrl]) {
        if (skipDankBackup && url !== legacyUrl) continue;
        try {
            const response = await fetchImpl(url, { signal: AbortSignal.timeout(PROFILE_TIMEOUT_MS) });
            if (response.status === 429 && url === preferredDankUrl) {
                skipDankBackup = true;
                continue;
            }
            if (!response.ok) continue;
            const profile = await response.json();
            if (validProfile(profile, username)) return profile;
        } catch {
            // Uma fonte indisponível não impede a próxima tentativa.
        }
    }
    throw new Error('Não foi possível consultar o perfil.');
}

module.exports = { fetchUserProfile };
