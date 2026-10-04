const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

function getAppUrl() {
  if (process.env.APP_URL) return process.env.APP_URL;
  try {
    const file = path.join(__dirname, 'app-url.txt');
    if (fs.existsSync(file)) {
      const value = fs.readFileSync(file, 'utf8').trim();
      if (value) return value;
    }
  } catch (err) { /* ignore */ }
  return null;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 850,
    title: 'Hiker ERP',
  });
  const url = getAppUrl();
  if (url) {
    win.loadURL(url);
  } else {
    win.loadURL('data:text/html,<body style="font-family:sans-serif;padding:40px"><h1>Hiker ERP</h1><p>No APP_URL configured. Set the <code>APP_URL</code> GitHub repository variable to your deployed Hiker ERP web address and rebuild.</p></body>');
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
