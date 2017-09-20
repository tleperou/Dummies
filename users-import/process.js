const fs = require('fs');
// const inspect = require('util').inspect;

module.exports = {


  friendlyName: 'Process',


  description: 'Process queue of create user',


  inputs: {
    domain: {
      description: 'The domain to import',
      type: 'string',
      required: true,
    },
    id: {
      description: 'ID of the import',
      type: 'string',
      required: true,
    },
    notify: {
      description: 'Send a notification',
      type: 'boolean'
    }
  },


  exits: {
    fileNotFound: {
      description: 'File not found'
    },
  },


  fn: function (inputs, exits) {

    exits.success();

    const { domain, id, notify } = inputs;

    const queue = sails.config.queue.defaultQueue;

    const splitter = sails.config.models.splitter;

    queue.process(`${domain}${splitter}users${splitter}imports${splitter}${id}`, (job, done) => {

      const user = _.omit(job.data, ['title', 'error']);

      User
        .destroy({ email: user.email })
        .meta({ fetch: true })
        .exec((error, destroyedRecord) => {
          if (error) return done(error);

          if (!destroyedRecord) {
            job.log('New user');
          }
          else {
            job.log('Existing user');
          }

          if (user.error && user.error.length > 0) {
            job.log(error);
            return done(`Invalid user`);
          }

          User
            .create(user)
            .exec(error => {
              if (error) return done(error);

              job.log('User created');

              if (notify) {
                sails.helpers.api
                  .users
                  .newPassword({ email: user._id, client: domain })
                  .exec({
                    error: error => {
                      job.log('Email not sent');
                      return done(error);
                    },
                    success: () => {
                      job.log('Sending email ..');
                      return done();
                    }
                  });
              }

              else {
                return done();
              }
            });
        });

    });

  }


};
