(() => {
    const applyAppearance = (value) => {
        document.documentElement.dataset.appearance = value === 'classic' ? 'classic' : 'modern';
    };

    let changed = false;
    api.appearance.onChanged((value) => {
        changed = true;
        applyAppearance(value);
    });
    void api.appearance.get().then((value) => {
        if (!changed) applyAppearance(value);
    }).catch(() => {
        if (!changed) applyAppearance('modern');
    });
})();
