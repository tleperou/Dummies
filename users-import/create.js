const fs = require('fs');
const csv = require("csv-parser");
// const inspect = require('util').inspect;

module.exports = {


  friendlyName: 'CsvToDb',


  description: 'Convert a list of user from a CSV to a DB format',


  inputs: {
    domain: {
      description: 'The domain to import',
      type: 'string',
      required: true,
    },
    path: {
      description: 'Path to the CSV file',
      type: 'string',
      required: true,
    },
    importId: {
      description: 'Id to use',
      type: 'string',
      require: false,
    },
  },


  exits: {
    fileNotFound: {
      description: 'File not found'
    },
  },


  fn: function (inputs, exits) {

    const { domain, path } = inputs;

    let { importId } = inputs;

    // Options to parse the CSV

    let inactive = 0;
    let fail = 0;

    const options = {
      raw: false,     // do not decode to utf-8 strings
      separator: ',', // specify optional cell separator
      quote: '"',     // specify optional quote character
      escape: '"',    // specify optional escape character (defaults to quote value)
      newline: '\n',  // specify a newline character
      strict: true    // require column length match headers length
    };

    fs.createReadStream(path)
      .pipe(csv(options))

      // finish !
      .on('finish', () => {
        return exits.success({ inactive, fail });
      })

      // for each row
      .on('data', user => {

        let fields;
        let scope;
        let _user;
        let product;

        let error = [];

        // sails.log.debug(inspect(user, { depth: null }));

        let { email, name, password, isAdmin } = user;

        // Controls

        if (_.isUndefined(email) || _.isEmpty(email)) {
          error.push(`the first header must be email, not ${email}`);
        }
        if (_.isUndefined(name) || _.isEmpty(name)) {
          error.push(`the second header must be name, not ${name}`);
        }

        isAdmin = isAdmin.toLowerCase() === 'true';

        _user = { email, name, password };

        // Build the scope

        scope = {};
        scope[domain] = { _grant: { isAdmin } };

        fields = _.keys(user);

        // The first four field are used to
        // describe email, password .. of users
        _.each(_.slice(fields, 4), field => {

          // build the object scope
          if (user[field].trim().length > 0) {

            // Here is a product scope
            if (field.split('.').length === 1) {

              scope[domain][field] = user[field];

              if (user[field] === '*') {
                // sails.log.debug(`CAUTON: the user will have access to the entire product scope of ${field}`);
              }
            }
            // Here is a field scope : product.field = ['...']
            else if (field.split('.').length === 2) {

              product = field.split('.')[0];

              if (_.isUndefined(scope[domain][product])) {
                scope[domain][product] = {};
              }

              if (user[field] === '*') {
                error.push(`The value ${user[field]} is not allowed, in ${field} of ${user.email}`);
              }

              // if (user[field].split('|-|').length > 1) {
              //   // sails.log.debug('--', field, '> array', user[field].split('|-|'));
              //   user[field] = user[field].split('|-|');
              // }
              // else {
              //   // sails.log.debug('-', field, '> string', user[field]);
              // }

              user[field] = user[field].split('|-|');

              scope[domain][product][field.split('.')[1]] = user[field];
            }
          }
        }, this);

        _user.scope = scope;
        _user.error = error;

        // Create a job for that user

        const splitter = sails.config.models.splitter;

        const fileName = _.last(path.split('/'));
        importId = importId ? importId : _.first(fileName.split('.'));

        const { defaultQueue, Job }= sails.config.queue;

        _user.title = `${_user.name} ${_user.email}`;

        if (error.length > 0) {
          fail++;
          let job = defaultQueue
            .create(`${domain}${splitter}users${splitter}imports${splitter}${importId}`, _user)
            .save(() => {
              Job.get(job.id, (err, job) => {
                job.log(error);
                job.failed();
              });
              // sails.log.debug(`users${splitter}imports ${domain}${splitter}${importId}, NOT ready to import ${_user.email}`);
              // sails.log.debug(inspect(_user, { depth: null }));
            });
        }

        else {

          const db = User.getDatastore().manager;
          const collection = db.collection(User.tableName);

          let where = {};
          where[`scope.${domain}._grant.isRoot`] = { $eq: true };

          collection
            .findOne({ $and: [where, { _id: email }] }, (error, userRecord) => {
              if (error) {
                fail++;
                let job = defaultQueue
                  .create(`${domain}${splitter}users${splitter}imports${splitter}${importId}`, _user)
                  .save(() => {
                    Job.get(job.id, (err, job) => {
                      job.log('This user cannot be updated from that process');
                      job.failed();
                    });
                    // sails.log.debug(`users${splitter}imports ${domain}${splitter}${importId}, NOT ready to import ${_user.email}`);
                    // sails.log.debug(inspect(_user, { depth: null }));
                  });
              }

              else if (!userRecord) {
                inactive++;
                defaultQueue
                  .create(`${domain}${splitter}users${splitter}imports${splitter}${importId}`, _user)
                  // .removeOnComplete(true)
                  .searchKeys(['title'])
                  .save(/*() => {
                   // sails.log.debug(`users${splitter}imports ${domain}, ready to import ${_user.email}`);
                   // sails.log.debug(inspect(_user, { depth: null }));
                   }*/);
              }

              else {
                fail++;
                let job = defaultQueue
                  .create(`${domain}${splitter}users${splitter}imports${splitter}${importId}`, _user)
                  .save(() => {
                    Job.get(job.id, (err, job) => {
                      job.log('This user cannot be updated from that process');
                      job.failed();
                    });
                    // sails.log.debug(`users${splitter}imports ${domain}${splitter}${importId}, NOT ready to import ${_user.email}`);
                    // sails.log.debug(inspect(_user, { depth: null }));
                  });
              }
            });
        }

      });
  }


};
