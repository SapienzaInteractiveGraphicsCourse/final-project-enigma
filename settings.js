export const Settings = (() => {
    const elements = {
        clickablesHoverColor: document.getElementById('checkClickablesHoverColor'),
    };

    const settings = {
        clickablesHoverColor: false,
    };

    function readAll() {
        settings.clickablesHoverColor = !!elements.clickablesHoverColor.checked;
    }

    function bind() {
        elements.clickablesHoverColor.addEventListener('change', () => {
            settings.clickablesHoverColor = !!elements.clickablesHoverColor.checked;
        });
    }

    return {
        init() {
            readAll();
            bind();
        },
        get() {
            return { ...settings };
        },
    };
})();
