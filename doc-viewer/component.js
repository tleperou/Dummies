/*global Promise*/
/*eslint no-undef: "error"*/

import Ember from 'ember';
import PdfJs from 'ember-pdf-js/components/pdf-js';
import {
  task
}
from 'ember-concurrency';

const {
  inject: {
    service
  },
  computed,
  set,
  get,
  $,
} = Ember;

export default PdfJs.extend({

  // Inject

  loadingSlider: service(),
  notify: service(),
  session: service(),

  // Listeners

  onCancel: null,
  onDownload: null,

  // Values

  isLoading: true,
  percentLoaded: 1,

  token: computed('session.session.content.authenticated.access_token', function() {
    return get(this, 'session.session.content.authenticated.access_token');
  }),

  pdf: computed('model.path', function() {
    return `${get(this, 'model.path.view')}?token=${get(this, 'token')}`;
  }),

  // Tasks

  load: task(function*() {

    set(this, 'percentLoaded', 'Téléchargement');

    // Download and render the PDF
    try {
      $('body').addClass('reveal-open');
      $('.reveal-overlay').addClass('open');

      const uri = get(this, 'pdf');
      const loadingTask = new Promise((resolve, reject) => {
        get(this, 'pdfLib')
          .getDocument(uri)
          .then((pdfDocument) => {
            set(this, 'pdfDocument', pdfDocument);
            let viewer = get(this, 'pdfViewer');
            viewer.setDocument(pdfDocument);

            let linkService = get(this, 'pdfLinkService');
            linkService.setDocument(pdfDocument);

            let history = get(this, 'pdfHistory');
            history.initialize(pdfDocument.fingerprint);


            set(this, 'pdfTotalPages', linkService.pagesCount);
            set(this, 'pdfPage', linkService.page);

            set(this, 'percentLoaded', 'Mise en page');
            this.send('documentChanged', pdfDocument);
          })
          .catch(error => {
            reject(error);
          });
      });

      return yield loadingTask;
    }
    // Handle errors
    catch (error) {
      if (error.status == '403') {
        get(this, 'notify').error(`L'accès au document ne vous est pas accordé`)
      } else {
        get(this, 'notify').warning({
          html: 'Une erreur est survenue, si vous rencontrez des difficultez <a href="/">actualisez la page</a>'
        });
        // get(this, 'notify').error(error.message || error);
      }
      this.send('cancel');

      $('body').removeClass('reveal-open');
      $('.reveal-overlay').removeClass('open');
    }

  }).drop(),

  // Events

  didUpdateAttrs() {
    get(this, 'load').perform();
  },

  actions: {
    load() {
        get(this, 'load').perform();
      },

      download() {
        if (typeof get(this, 'onDownload') === 'function') {
          get(this, 'onDownload')(get(this, 'model'));
        }
      },

      print() {
        window.open(get(this, 'pdf'));
      },

      documentChanged() {
        get(this, 'loadingSlider').endLoading();
        set(this, 'isLoading', false);
      },
      cancel() {
        get(this, 'load').cancelAll();
        if (typeof get(this, 'onCancel') == 'function') {
          get(this, 'onCancel')();
        }
      }
  }
});
