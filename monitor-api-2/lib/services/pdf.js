//  global require
var util = require('util'),
  fs = require('fs'),
  pdf = require('html-pdf'),
  events = require('events');

var Pdf = function (args) {
  events.EventEmitter.call(this);
  console.log('Track initialized');
};
util.inherits(Pdf, events.EventEmitter);

/**
 * Function to start global process
 */
Pdf.prototype.start = function () {
  console.log('Track start function');
  this.mongodb();
};

var _pdf = function (args) {
  return new Pdf(args);
};

module.exports = _pdf;