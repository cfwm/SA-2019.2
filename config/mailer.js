// NODEMAILER TRANSPORTER
var nodemailer = require('nodemailer');

module.exports = () => {
    // TRANSPORTER CONFIG
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'appmica.contato@gmail.com',
            pass: 'mica2019'
        }
    });

    return transporter;
};