var Mail = require('./services/mail.js');
var Track = require('./services/track.js');

var fs = require('fs'),
  _ = require('lodash');

var track = Track({});
var mail = Mail({});
var pdf = require('html-pdf');


track.on('error', function (error) {
  console.log('Track failed, error', error);
});

track.on('end', function (db, result) {
  console.log('Track succeed');

  //console.log(result);

  var ig = 0,
    now = new Date(),
    month = now.getMonth() + 1,
    month = (month < 10) ? '0' + month : month,
    day = (now.getDate() < 10) ? '0' + now.getDate() : now.getDate(),
    date = now.getFullYear() + '-' + month + '-' + day,
    attachments = [],
    output = [];

    console.log(now, now.getDate());

  _.filter(result, function (item, i) {

    output[ig] = '<img src="data:image/jpeg;base64,/9j/4QAYRXhpZgAASUkqAAgAAAAAAAAAAAAAAP/sABFEdWNreQABAAQAAABkAAD/4QMqaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLwA8P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/PiA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJBZG9iZSBYTVAgQ29yZSA1LjUtYzAyMSA3OS4xNTQ5MTEsIDIwMTMvMTAvMjktMTE6NDc6MTYgICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCBDQyAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6RURCNTdBNUI5ODdDMTFFMzk4NjJDQTA0NTQ0RjY1MTMiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6RURCNTdBNUM5ODdDMTFFMzk4NjJDQTA0NTQ0RjY1MTMiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpFREI1N0E1OTk4N0MxMUUzOTg2MkNBMDQ1NDRGNjUxMyIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpFREI1N0E1QTk4N0MxMUUzOTg2MkNBMDQ1NDRGNjUxMyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Pv/uACZBZG9iZQBkwAAAAAEDABUEAwYKDQAACe8AABZqAAAdSAAAJQr/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"/>' +
      '<p></p><p style="font-family:Arial;font-size:10px">Fait le ' + day + '-' + month + '-' + now.getFullYear() + '</p>' +
      '<h2 style="font-family:Arial;font-size:10px">Référence client : ' + item.client + '</h2>' +
      '<p></p><hr style="color:#cccccc;"/>' +
      '<p></p><p></p><p></p><p></p><h1 style="font-family:Arial;font-size:14px">Votre consommation au <b>' + day + '-' + month + '-' + now.getFullYear() + '</b></h1>' +
      '<table width="100%" style="border-collapse: collapse">' +
      '<thead style="border-bottom: 2px solid #0070b5;">' +
      '<tr>' +
      '<th></th>' +
      '<th>Fichiers</th>' +
      '<th>Mo utilisés</th>' +
      '</tr>' +
      '</thead>' +
      '<tbody>' +

      '<tr>' +
      '<td style="font-family:Arial;padding:5px;font-weight:bold;font-size:12px">Ressources totales utilisées</td>' +
      '<td style="font-family:Arial;padding:5px;background:#feb11d;font-size:12px;text-align:center;font-weight:bold">' + item.total.files + '</td>' +
      '<td style="font-family:Arial;padding:5px;background:#feb11d;font-size:12px;text-align:center;font-weight:bold">' + Math.round(item.total.size / 1048576) + '</td>' +
      '</tr>' +

      '<tr>' +
      '<td style="font-family:Arial;padding:5px;font-size:12px;text-align:right"><small>incluant pour le mois précédent</small></td>' +
      '<td style="font-family:Arial;padding:5px;text-align:center;font-size:12px"><small>' + item.last.files + '</small></td>' +
      '<td style="font-family:Arial;padding:5px;text-align:center;font-size:12px"><small>' + Math.round(item.last.size / 1048576) + '</small></td>' +
      '</tr>' +

      '</tbody>' +
      '</table>';



      fs.writeFile('files/' + item.client + '.html', '<html><body style="font-family:Arial; font-size:13px">' + output[ig] + '</body></html>', function (error) {
        if (error) {
          track.emit('error', 'Writing file to generate PDF failed');
        } else {
          var html = fs.readFileSync('files/' + item.client + '.html', 'utf8');
          pdf.create(html, {
            border: {
              top: '3cm',
              bottom: '3cm',
              left: '2cm',
              right: '2cm'
            }
          }).toFile('files/' + item.client + '.pdf', function (error, res) {
            if (error) {
              console.log('creation failed\n', error);
              track.emit('error', 'file creation failed');
            }
            else {
              console.log('attachement', 'files/' + item.client + '.pdf', ' created');
              attachments[ig] = {
                filename: date + '_' + item.client + '.pdf',
                content: fs.createReadStream('files/' + item.client + '.pdf')
              };
            }

            ig++;
            if (ig === result.length) {
              console.log('--done--');
              mail.setHTML('S\'il vous plait,<br/><br/>Veuillez trouver ci-joints les consommations des clients de la GED.<br/><br/><br/>Envoi automatique, ne pas répondre.');
              mail.mailOptions.attachments = attachments;
              mail.send();
            }
          });
        }
      });

    });

});

track.on('close', function (db) {
  console.log('close connexion to mongoDB');
  db.close();
});

track.on('notrack', function (message) {
  console.log(message);
});

mail.on('error', function (error) {
  console.log('Sending mail failed');
  console.log(error);
});

mail.on('sent', function () {
  console.log('Mail sent');
});

track.start();
