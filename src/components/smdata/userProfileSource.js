// Fonte remota atual. A consulta direta à Twitch e o fallback da Dank API
// podem ser adicionados aqui sem mudar a interface pública de userprofile.
async function fetchUserProfile(username, fetchImpl = fetch) {
    const encodedUsername = encodeURIComponent(username);
    const primary = await fetchImpl(`https://api.chat.raianwz.com.br/smlurker/${encodedUsername}/`);
    if (primary.ok) return primary.json();

    const fallback = await fetchImpl(`https://apichatwz.vercel.app/smlurker/${encodedUsername}/`);
    if (!fallback.ok) throw new Error('Não foi possível consultar o perfil.');
    return fallback.json();
}

module.exports = { fetchUserProfile };
