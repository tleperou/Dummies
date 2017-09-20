module.exports = {


  friendlyName: 'Create',


  description: 'Create new command jobs',


  inputs: {
    client: {
      description: 'Client ID of the command',
      type: 'string',
      required: true,
    },
    product: {
      description: 'Product of the command',
      type: 'string',
      required: true,
    },
    command: {
      description: 'Command ID',
      type: 'string',
      required: true,
    },
    proceed: {
      description: 'Proceed the command queue on that post',
      type: 'boolean',
      required: false,
    }
  },


  exits: {},

  fn: function(inputs, exits) {

    let {
      client, product, command, proceed
    } = inputs;

    let splitter = sails.config.models.splitter;

    let title = `${client}${splitter}${product}${splitter}${command}`;

    const queue = sails.config.queue.defaultQueue;

    Doc
      .destroy({
        client, name: command
      })
      .exec(error => {
        if (error) return exits.error(error);

        // First process the queue

        if (proceed) {

          sails.helpers
            .queue.commands
            .process({
              client, product, command
            })
            .exec({
              error: error => sails.log.error(error),
              success: () => sails.log.info(
                `controllers.commands.process :: create command ${title} proceed ${proceed}`)
            });


          // ****
          // <1 Proceed filters
          sails.helpers
            .queue.filters
            .process({
              client, product, command
            })
            .exec({
              error: error => sails.log.error(error),
              success: () => sails.log.info(
                `controllers.commands.process :: create filter ${title} proceed ${proceed}`),
            });
          // 1>

          // *****
          // <2 Proceed docs
          sails.helpers
            .queue.docs
            .process({
              client, product, command
            })
            .exec({
              error: error => sails.log.error(error),
              success: () => sails.log.info(
                `controllers.commands.process :: create docs ${title} proceed ${proceed}`)
            });
          // 2>
        }

        // Then create the command

        sails.helpers
          .storage.commands
          .find({
            client, product, command
          })
          .exec({
            error: error => exits.error(error),
            commandNotFound: reason => exits.error(reason),
            success: commandDefinition => {

              Object.assign(commandDefinition, {
                title
              });

              // Add this command to a queue of command job
              let job = queue
                .create(`create commands ${title}`, commandDefinition)
                .removeOnComplete(true)
                .save(error => {
                  if (error) return exits.error(error);

                  exits.success(
                    `'create commands ${title}' created, with id ${job.id}, & proceed  ${proceed}`
                  );

                  const docs = commandDefinition.docs;

                  // Create docs
                  sails.helpers
                    .queue.docs
                    .create({
                      client, product, command, docs
                    })
                    .exec({
                      error: error => sails.log.error(error),
                      success: message => sails.log.verbose(
                        `helpers.queue.commands.create :: docs ready`)
                    });

                  // Create filters
                  docs.forEach(doc => {
                    sails.helpers
                      .queue.filters
                      .create({
                        client, product, command, filters: doc.filters
                      })
                      .exec({
                        error: error => sails.log.error(error),
                        success: () => {}
                      });
                  });
                });
            }
          });
      });
  }


};
