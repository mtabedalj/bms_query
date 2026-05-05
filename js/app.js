var DxdApp = (function() {
  'use strict';

  var baja;
  var $;

  var HARDCODED_POINT_ORD =
    'station:|slot:/Drivers/AbstractMqttDriverNetwork/FordHiveMQTT/points/VisionMetering/FPS_SIX_FLR_METER_04000b89_KWH';

  function init(_baja, _$) {
    baja = _baja;
    $ = _$;
    loadPoints();
  }

  function loadPoints() {
    $('#loading').show();
    $('#error').hide();
    $('#points-table').hide();

    baja.Ord.make(HARDCODED_POINT_ORD)
      .get({ lease: true })
      .then(function(component) {
        var name = component.getName();
        var value = component.get('out');
        var displayValue = value !== null && value !== undefined
          ? value.toString()
          : 'N/A';

        renderTable([{ name: name, value: displayValue }]);
      })
      .catch(function(err) {
        showError('Failed to resolve point: ' + (err.message || err));
        baja.error(err);
      });
  }

  function renderTable(points) {
    var tbody = $('#points-table tbody');
    tbody.empty();

    points.forEach(function(point) {
      var row = $('<tr>');
      row.append($('<td>').text(point.name));
      row.append($('<td>').addClass('value-cell').text(point.value));
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
