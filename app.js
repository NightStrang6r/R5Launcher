// Libraries
const {app, BrowserWindow, Menu, ipcMain, dialog, globalShortcut} = require('electron');
const WebTorrent = require('webtorrent');
const Downloader = require('download');
const Unzipper = require('extract-zip');
const { exit } = require('process');
const ncp = require('ncp').ncp;
const fs = require('fs');

const client = new WebTorrent();
const config = require('./config.json');

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
            installFromZip(config.scripts, config.path, "scripts");
            
            //torrent(result.filePaths[0]);
        }
    }).catch(err => {
        console.log(err);
    });
}

function installFromZip(url, path, filename) {
    downloadFile(url, path).then(() => {
        let zipFile = getFileNameContains(`.zip`, path);
        unzipFile(`${path}/${zipFile}`, path).then(() => {
            fs.unlinkSync(`${path}/${zipFile}`);
            let sourceDir = getFileNameContains(filename, path);
            let r5dir = getFileNameContains(`R5`, path);
            copyDir(`${path}/${sourceDir}`, `${path}/${r5dir}`).then(() => {
                //deleteFolder(`${path}/${sourceDir}`);
            });
        });
    });
}

function getFileNameContains(content, path) {
    let result = null;
    let files = fs.readdirSync(path);
    for (const file of files) {
        if(file.includes(content)) {
            result = file;
            break;
        }
    }
    return result;
}

function deleteFolder(path) {
    let files = [];
    if(fs.existsSync(path)) {
        files = fs.readdirSync(path);
        files.forEach(function(file, index){
            let curPath = path + "/" + file;
            if(fs.statSync(curPath).isDirectory()) {
                deleteFolder(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
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
            console.log('Some error or connection destroyed');
            clearInterval(downloadUIInterval);
        });

        torrent.on('done', () => {
            console.log('Torrent download finished');
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

async function downloadFile(url, path) {
    let result = false;
    try {
        console.log(`Started download of ${url}`);

        await Downloader(url, `${path}`);

        console.log('Download completed');
        result = true;
    } catch(err) {
        console.log(`Failed to download file. Error: ${err}`);
        result = false;
    }
    return result;
}

async function unzipFile(pathFrom, pathTo) {
    let result = false;
    try {
        console.log(`Started unzip of ${pathFrom}`);

        await Unzipper(pathFrom, { dir: pathTo }, function (err) {
            console.log(`Failed to unzip file. Error: ${err}`);
            result = false;
        });

        console.log('Unzip completed');
        result = true;
    } catch(err) {
        console.log(`Failed to unzip file. Error: ${err}`);
        result = false;
    }
    return result;
}

async function copyDir(from, to) {
    let result = false;
    try {
        console.log(`Started copy to ${to}`);

        await ncp(from, to, function (err) {
            if (err) {
                return console.error(err);
            }
        });

        console.log('Copy completed');
        result = true;
    } catch(err) {
        console.log(`Failed to copy. Error: ${err}`);
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