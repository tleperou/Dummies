//  global require
var util = require('util'),
  events = require('events'),
  mongodb = require('mongodb'),
  _ = require('lodash'),
  fs = require('fs');

var Track = function(args) {
  events.EventEmitter.call(this);
  console.log('Track initialized');
};
util.inherits(Track, events.EventEmitter);

/**
 * Function to start global process
 */
Track.prototype.start = function() {
  console.log('Track start function');
  var self = this;
  fs.readdir('files', function(error, files) {
    if (error !== null) {
      fs.mkdirSync('files');
    }

    self.mongodb();
  });
};


Track.prototype.byClient = function(db, client) {
  var self = this;
  var MongoClient = mongodb.MongoClient,
    url = 'mongodb://localhost:27017/api_2-1-dev'; //@TODO change DBNAME static value with Object args

  /**
   * Retrieve amount of file for a client
   * @param client
   */
  var aggregate = function(db, client, cb) {
    db.collection('doc').aggregate([{
        $match: {
          "client": client
        }
      }, {
        $group: {
          _id: {
            client: "$client"
          },
          files: {
            $sum: 1
          },
          size: {
            $sum: "$octetSize"
          }
        }
      }],
      function(error, result) {
        cb(error, result);
      });
  };


  aggregate(db, client, function(error, result) {
    self.emit('close', db);
    if (error !== null) {
      self.emit('error', 'MongoDB aggregation failed for client', client);
    } else {
      self.emit('end', db, result);
    }
  });
};

/**
 * Function to handle MongoDB
 */
Track.prototype.mongodb = function() {
  var self = this;
  var MongoClient = mongodb.MongoClient,
    url = 'mongodb://localhost:27017/api_2-1-dev'; //@TODO change DBNAME static value with Object args


  var recursiveTrack = function(i, cb) {
    console.log('_', i, ' recursive');
  };

  /**
   * Generate data track for each client
   * @param db
   * @param clients
   * @param cb
   */
  var generateDataTrack = function(db, clients, cb) {
    var dateStr = '2015-10-01T00:00:00.000Z',
      now = new Date(),
      year = now.getFullYear(),
      month = now.getMonth() + 1,
      month = (month < 10) ? "0" + month : month, // set 0 - 9 to 00 - 09

      prevYear = (month == 1) ? year - 1 : year, // get current year (or previous)
      prevMonth = (month == 1) ? 12 : month - 1, // get previous month
      prevMonth = (prevMonth < 10) ? "0" + prevMonth : prevMonth,

      dateStr = year + "-" + month + "-01T00:00:00.000Z",

      prevDateStr = prevYear + "-" + prevMonth + "-01T00:00:00.000Z",
      prevDate = new Date(prevDateStr);


    if (clients === 'all') {
      db.collection('doc').aggregate([{
          $match: {
            "createdAt": {
              "$gte": prevDate
            }
          }
        }, {
          $group: {
            _id: {
              client: "$client"
            },
            files: {
              "$sum": 1
            },
            size: {
              $sum: "$octetSize"
            }
          }
        }],
        function(error, result) {
          db.collection('doc').aggregate([{
              $group: {
                _id: {
                  client: "$client"
                },
                files: {
                  $sum: 1
                },
                size: {
                  $sum: "$octetSize"
                }
              }
            }],
            function(errorTotal, resultTotal) {
              if (_.isEmpty(result)) {
                self.emit('notrack', 'no files to track');
                self.emit('close', db);
              }

              var ig = 0,
                output = [];
              _.forEach(result, function(item, i) {
                _.filter(resultTotal, function(o) {
                  if (o._id.client == item._id.client) {
                    output[ig] = {
                      client: item._id.client,
                      last: {
                        files: item.files,
                        size: item.size
                      },
                      total: {
                        files: o.files,
                        size: o.size
                      }
                    };
                    return true;
                  }
                });

                ig++;
                if (ig == result.length) {
                  cb(error, output);
                }
              });
            });
        });
    } else {
      //TODO: generateDataTrack for specific client
    }
  };

  MongoClient.connect(url, function(err, db) {
    if (err !== null) {
      console.log('connect to DB', url, 'failed');
      console.log(err);
    } else {
      console.log('connect to DB', url, 'succeed');
    }

    generateDataTrack(db, 'all', function(error, result) {
      self.emit('close', db);
      if (error !== null) {
        self.emit('error', 'MongoDB aggregation failed');
      } else {
        self.emit('end', db, result);
      }
    });
  })
};


/**
 * Exports Track class to node module
 * @param {Object} args
 * @returns {Track}
 */
var track = function(args) {
  return new Track(args);
};

module.exports = track;
