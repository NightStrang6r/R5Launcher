const {ipcRenderer} = require('electron');
const WebTorrent = require('webtorrent');
const minimizeBtn = document.getElementById('btn-minimize');
const downloadBtn = document.getElementById('btn-download');
const settingsBtn = document.getElementById('btn-settings');
const processbarGrey = document.getElementById('progressbar-grey');
const processbarMain = document.getElementById('progressbar-main');
const progressText = document.getElementById('text-progress');
const progressTextField = document.getElementById('text-field-progress');
const pauseBtn = document.getElementById('btn-pause');
const pauseImage = document.getElementById('image-pause');

minimizeBtn.addEventListener('click', (event) => {
    ipcRenderer.send('minimize');
});

downloadBtn.addEventListener('click', (event) => {
    ipcRenderer.send('download');
});

pauseBtn.addEventListener('click', (event) => {
    ipcRenderer.send('download-pause-resume');
});

/*settingsBtn.addEventListener('click', (event) => {
    document.location.hash = "popup:infoblock";
});*/

ipcRenderer.on('set-download-visible', (event) => {
    setDownloadVisible();
    pauseImage.src = "images/resume.png";
    progressTextField.innerHTML = '';
});

ipcRenderer.on('set-download-started', (event) => {
    setDownloadVisible();
    pauseImage.src = "images/pause.png";
    progressTextField.innerHTML = 'Инициализация загрузки...';
});
        
ipcRenderer.on('update-download-ui', (event, info) => {
    setDownloadVisible();
    
    processbarMain.style.width = `${info.progress * 434}px`;
    progressTextField.innerHTML = `${info.downloaded} GB Speed: ${info.speed} MB/S`;
});

ipcRenderer.on('update-download-button', (event, info) => {
    if(!info.paused) {
        pauseImage.src = "images/pause.png";
        progressTextField.innerHTML = 'Инициализация загрузки...';
    } else {
        pauseImage.src = "images/resume.png";
        progressTextField.innerHTML = ``;
    }
});

function setDownloadVisible() {
    downloadBtn.classList.add('no-view');
    processbarGrey.classList.remove('no-view');
    processbarMain.classList.remove('no-view');
    progressText.classList.remove('no-view');
    pauseBtn.classList.remove('no-view');
}