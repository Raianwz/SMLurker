const { app } = require("electron");

module.exports = app =>{
    if (app.isPackaged) return 'PRODUCTION';
    else return 'DEV';
}