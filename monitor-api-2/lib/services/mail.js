var util = require('util'),
  events = require('events'),
  nodemailer = require('nodemailer'),
  smtp = require('nodemailer-smtp-transport');


var Mail = function(args) {
  events.EventEmitter.call(this);
  var self = this;

  self.mailOptions = {
    from: args.from || '<no-reply@cogeprint.fr> [GED] Automate', // sender address
    to: args.to || 'monitoring-ged@cogeprint.fr', // list of receivers
    subject: args.subject || '[GED] Bilan des consommations', // Subject line
    html: '--' // html body
  };

  self.transporter = nodemailer.createTransport(smtp({
    host: args.host || 'ssl0.ovh.net',
    port: args.port || 465,
    secure: true,
    auth: {
      user: args.user || 'LOGIN',
      pass: args.pass || '****'
    },
    name: 'cogeprint.fr'
  }));
};
util.inherits(Mail, events.EventEmitter);

Mail.prototype.setHTML = function(html) {
  this.mailOptions.html = html;
};

Mail.prototype.send = function() {
  var self = this;
  this.transporter.sendMail(this.mailOptions, function(error, result) {
    if (error) {
      self.emit('error', error);
    } else {
      self.emit('sent');
    }
  });
};

var mail = function(args) {
  return new Mail(args);
};

module.exports = mail;
