const {ipcRenderer} = require('electron');
const minimizeBtn = document.getElementById('btn-minimize');
const downloadBtn = document.getElementById('btn-download');
const settingsBtn = document.getElementById('btn-settings');

minimizeBtn.addEventListener('click', (event) => {
    ipcRenderer.send('minimize');
});

downloadBtn.addEventListener('click', (event) => {
    ipcRenderer.send('download');
});

/*settingsBtn.addEventListener('click', (event) => {
    document.location.hash = "popup:infoblock";
});*/
        
ipcRenderer.on('update-download-ui', (event, path) => {
    
});