export const Settings = (() => {
    const elements = {
        clickablesHoverColor: document.getElementById('checkClickablesHoverColor'), 
        disableShadows: document.getElementById('checkDisableShadows'),
    };

    const settings = {
        clickablesHoverColor: false,
        disableShadows: false,
    };

    function readAll() {
        if(elements.clickablesHoverColor) settings.clickablesHoverColor = !!elements.clickablesHoverColor.checked;
        if(elements.disableShadows) settings.disableShadows = !!elements.disableShadows.checked; 
    }

    function bind() {
        if(elements.clickablesHoverColor) {
            elements.clickablesHoverColor.addEventListener('change', () => { 
                settings.clickablesHoverColor = !!elements.clickablesHoverColor.checked;
            });
        }
        
        if(elements.disableShadows) {
            elements.disableShadows.addEventListener('change', (e) => {
                settings.disableShadows = !!e.target.checked;
                window.dispatchEvent(new CustomEvent('toggleTrackShadows', { detail: settings.disableShadows }));
            });
        }
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