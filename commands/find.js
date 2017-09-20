let Filesystem = require('machinepack-fs'),
  yaml = require('js-yaml'),
  util = require('util');

module.exports = {


  friendlyName: 'Find',


  description: 'Find many commands from the storage',


  inputs: {
    client: {
      description: 'The client of the product',
      type: 'string',
      required: true,
    },
    product: {
      description: 'The product ID',
      type: 'string',
      required: true,
    },
    command: {
      description: 'The command ID',
      type: 'string',
      required: true,
    },
  },


  exits: {
    commandNotFound: {
      status: 404,
      description: 'The command(s) is not found in storage'
    },
  },


  fn: function (inputs, exits) {

    let { client, product, command } = inputs,
      { downloadFrom, downloadTo, definitions } = sails.config.storage,

      // Filename and tree
      fileName = `${command}${definitions.command.format}`,
      tree = `${client}/${product}/${command}`,

      // Remote file / source
      remoteDir = `${downloadFrom}/${tree}`,
      from = `${remoteDir}/${fileName}`,

      // Locale file / destination
      destination = `${downloadTo}/${tree}`,
      to = `${destination}/${fileName}`;

    // *****
    // 1. Check if the remote file exists
    sails.helpers
      .utils.storage
      .pathExists({ path: from })
      .exec({
        error: error => exits.commandNotFound(`Command ${command} not found in ${tree}`),
        success: () => {

          // *****
          // 2. (re)create the local destination
          Filesystem
            .mkdir({ destination, force: true })
            .exec({
              error: error => exits.error(error),
              success: () => {

                // *****
                // 3. download the path
                sails.helpers
                  .utils.storage
                  .download({ from, to })
                  .exec({
                    error: error => exits.error(error),
                    success: () => {

                      // *****
                      // 4. read the file
                      Filesystem
                        .read({ source: to })
                        .exec({
                          error: error => exits.error(error),
                          doesNotExist: error => exits.error('The downloaded file does not exist in the local location. This is weird !'),
                          success: data => {

                            // Let us know if the format of definitions change
                            if (definitions.command.format !== '.json') {
                              return exits.error('The supported format of the command definition is .json');
                            }

                            let json = yaml.load(data),
                              commandDefinition = {
                                client,
                                product,
                                command,
                                date: json.date,
                                docs: json.docs,
                                total: json.total || 0,
                                size: json.size || 0,
                              };

                            // TODO Security issue
                            // TODO Delete the file
                            // Since the file ias downloaded
                            // And the content given to the callback
                            // Delete the file

                            return exits.success(commandDefinition);
                          }
                        });
                      // .4

                    },
                  });
                // .3

              },
            });
          // .2

        }
      });
    // .1
  }


};
