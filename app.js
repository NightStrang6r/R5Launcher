// Libraries
const {app, BrowserWindow, Menu, ipcMain, dialog, globalShortcut} = require('electron');
const path = require('path');
const WebTorrent = require('webtorrent');
const fs = require('fs');

const client = new WebTorrent();
const config = require('./config.json');
const { exit } = require('process');

let window = null;
let downloadUIInterval = null;
Menu.setApplicationMenu(null);

app.once('ready', () => {
    window = new BrowserWindow({
        width: 1279,
        height: 719,
        icon: 'inc/ui/images/icon.ico',
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
    if (process.platform !== 'darwin') app.quit();
    client.destroy();
    exit();
});

function download(ev) {
    dialog.showOpenDialog(window, {
        properties: ['openDirectory'],
        message: "Choose installation folder"
    }).then(result => {
        if(!result.canceled) {
            config.path = result.filePaths[0];
            updateConfig(config);

            window.webContents.send('set-download-visible');
            torrent(result.filePaths[0]);
        }
    }).catch(err => {
        console.log(err);
    });
}

function torrent(path) {
    const magnetURI = config.magnet;

    client.add(magnetURI, { path: path }, (torrent) => {
        console.log('Client is downloading:', torrent.infoHash)

        downloadUIInterval = setInterval(() => {
            sendDownloadInfo(torrent);

            console.log(`Progress: ${(torrent.progress * 100).toFixed(2)}% ${torrent.downloadSpeed} ${torrent.downloaded} ${torrent.timeRemaining}`);
        }, 1000);

        torrent.on('error', () => {
            console.log('Some error or connection destroyed')
            clearInterval(downloadUIInterval);
        });

        torrent.on('done', () => {
            console.log('Torrent download finished')
            clearInterval(downloadUIInterval);
        });
    });
}

function sendDownloadInfo(torrent) {
    let info = {
        progress: torrent.progress,
        speed: (torrent.downloadSpeed / 1000000).toFixed(1),
        downloaded: (torrent.downloaded / 1000000000).toFixed(2),
        remain: torrent.timeRemaining
    };
    window.webContents.send('update-download-ui', info);
}

function updateConfig(config) {
    let result = false;
    try {
        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
        result = true;
    } catch(err) {
        console.log(`Ошибка записи файла: ${err}`);
        result = false;
    }
    return result;
}

ipcMain.on('download-pause-resume', () => {
    if(client.torrents[0]) {
        client.remove(config.magnet);
        clearInterval(downloadUIInterval);
        window.webContents.send('update-download-button', { paused: true });
        console.log('Download paused');
    } else {
        torrent(config.path);
        window.webContents.send('update-download-button', { paused: false });
        console.log('Download resumed');
    }
});