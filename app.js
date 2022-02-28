const {app, BrowserWindow, Menu, ipcMain, dialog, globalShortcut} = require('electron');
const path = require('path');
const WebTorrent = require('webtorrent');
const config = require('./config.json');

let window = null;
Menu.setApplicationMenu(null);

app.once('ready', () => {
    window = new BrowserWindow({
        width: 1279,
        height: 719,
        show: false,
        resizable: true,
        transparent: true, 
        frame: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    window.loadFile("inc/ui/index.html");

    window.once('ready-to-show', () => {
        window.show();
    });

    globalShortcut.register('Ctrl+Shift+I', () => {
        window.webContents.openDevTools();
    });

    ipcMain.on('minimize', (event) => {
        window.minimize();
    });

    ipcMain.on('download', download);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
});

function download(ev) {
    dialog.showOpenDialog(window, {
        properties: ['openDirectory'],
        filters: [
            { name: 'All Files', extensions: ['*'] }
        ],
        message: "Choose installation folder"
    }).then(result => {
        if(!result.canceled){
            torrent(result.filePaths[0]);
        }
    }).catch(err => {
        console.log(err);
    });
}

function torrent(path) {
    const client = new WebTorrent();
    const magnetURI = config.magnet;

    client.add(magnetURI, { path: path }, function (torrent) {
        console.log('Client is downloading:', torrent.infoHash)
      
        torrent.files.forEach(function (file) {
            console.log(file.name);
        });

        const interval = setInterval(function () {
            console.log(`Progress: ${(torrent.progress * 100).toFixed(2)}% ${torrent.downloadSpeed} ${torrent.downloaded} ${torrent.timeRemaining}`);
        }, 1000);

        torrent.on('done', function () {
            console.log('torrent download finished')
            clearInterval(interval);
        });
    });
}