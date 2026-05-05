var DxdApp = (function() {
  'use strict';

  var baja;
  var $;

  function init(_baja, _$) {
    baja = _baja;
    $ = _$;
    loadPoints();
  }

  function loadPoints() {
    $('#loading').show();
    $('#error').hide();
    $('#points-table').hide();

    var config = DXD_CONFIG[0];

    PointDiscovery.discoverPoints(baja, config.folderPath)
      .then(function(descriptors) {
        if (descriptors.length === 0) {
          showError('No points found in folder: ' + config.folderPath);
          return;
        }
        renderTable(descriptors);
      })
      .catch(function(err) {
        showError('Failed to discover points: ' + (err.message || err));
        baja.error(err);
      });
  }

  function renderTable(descriptors) {
    var tbody = $('#points-table tbody');
    tbody.empty();

    descriptors.forEach(function(point) {
      var row = $('<tr>');
      row.append($('<td>').text(point.name));
      row.append($('<td>').addClass('value-cell').text('--'));
      tbody.append(row);
    });

    $('#loading').hide();
    $('#points-table').show();
  }

  function showError(message) {
    $('#loading').hide();
    $('#error').text(message).show();
  }

  return {
    init: init
  };
})();
