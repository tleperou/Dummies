const jwt = require('jsonwebtoken');
const fs = require('machinepack-fs');
const ejs = require('ejs');

module.exports = {


  friendlyName: 'New password',


  description: 'Handle the new password process (in import, or manually)',


  inputs: {
    email: {
      description: 'The user email',
      type: 'string',
      required: true,
    },
    client: {
      description: 'The client id',
      type: 'string',
      required: true,
    }
  },


  exits: {
    clientNotFound: {
      description: 'Client is not found',
      statusCode: 404,
    },
    userNotFound: {
      description: 'User is not found',
      statusCode: 404,
    },
  },


  fn: function(inputs, exits) {

    const {
      email, client
    } = inputs;

    // sails.log.debug('new password from helpers', inputs);

    // Find client to retrieve its APIKey

    Client
      .findOne({
        id: client
      })
      .exec((error, clientRecord) => {
        if (error) return exits.error(error);
        if (!clientRecord) {
          return exits.clientNotFound(`${client} not found`);
        }

        // Generate the passwordToken

        const {
          APIKey
        } = clientRecord;

        const expiresIn = sails.config.custom.passwordExpirationToken;

        const passwordToken = jwt.sign({
          email
        }, APIKey, {
          expiresIn
        });

        // Set the token to th user

        User
          .update({
            email
          }, {
            passwordToken
          })
          .meta({
            fetch: true
          })
          .exec((error, userRecords) => {
            if (error) return exits.error(error);
            if (userRecords.length === 0) return exits.userNotFound(`${email} est introuvable`);

            // Render the template

            const tpl = userRecords[0].state === 'active' ? 'new-password' : 'active-user';

            const source = `./assets/domain/${client}/emails/${tpl}.ejs`;

            fs.read({
              source
            }).exec({
              doesNotExist: reason => exits.error(reason),
              error: error => exits.error(error),
              success: tpl => {

                // Get logos
                clientRecord = Client.toJSON(clientRecord, false);

                const urlGED = sails.config.custom.urlGED;

                const subject = userRecords[0].state === 'active' ?
                  'Nouveau mot de passe' :
                  'Activation de votre compte';

                const html = ejs.render(tpl, {
                  name: userRecords[0].name,
                  url: urlGED.urlForNewPassword(clientRecord, passwordToken),
                  logo: clientRecord.assets.logo.default,
                  subject
                });

                // Add to queue

                sails.helpers.queue
                  .mailer
                  .create({
                    client,
                    to: `${userRecords[0].name} <${email}>`,
                      subject,
                      html,
                  })
                  .exec({
                    error: error => exits.error(error),
                    success: () => exits.success(),
                  });
              }
            });

          });
      });

  }


};
