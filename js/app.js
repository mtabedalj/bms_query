var DxdApp = (function() {
  'use strict';

  var baja;
  var $;
  var pointStore = {};

  function init(_baja, _$) {
    baja = _baja;
    $ = _$;
    loadPoints();

    $(window).on('beforeunload', function() {
      SubscriptionManager.cleanup();
    });
  }

  function loadPoints() {
    $('#loading').show();
    $('#error').hide();
    $('#points-table').hide();

    var config = DXD_CONFIG[0];

    HistoryModal.init(baja, config.stationName || config.siteName);

    PointDiscovery.discoverPoints(baja, config.folderPath)
      .then(function(descriptors) {
        if (descriptors.length === 0) {
          showError('No points found in folder: ' + config.folderPath);
          return;
        }
        renderTable(descriptors);
        return SubscriptionManager.subscribe(baja, descriptors, onValueUpdate);
      })
      .catch(function(err) {
        showError('Failed to discover points: ' + (err.message || err));
        baja.error(err);
      });
  }

  function renderTable(descriptors) {
    var tbody = $('#points-table tbody');
    tbody.empty();
    pointStore = {};

    descriptors.forEach(function(point) {
      pointStore[point.slotPath] = point;
      var row = $('<tr>');
      row.append(
        $('<td>').append(
          $('<span>').addClass('status-dot status-normal').attr('data-status-slot', point.slotPath)
        )
      );
      row.append($('<td>').text(formatPointName(point.name)));
      row.append($('<td>').addClass('value-cell').attr('data-slot', point.slotPath).text('--'));
      row.append($('<td>').addClass('units-cell').text(point.units || '--'));
      row.append($('<td>').append(
        $('<button>').addClass('btn-history').text('History').on('click', function() {
          HistoryModal.open(pointStore[point.slotPath]);
        })
      ));
      tbody.append(row);
    });

    $('#loading').hide();
    $('#points-table').show();
  }

  function formatPointName(name) {
    return name.replace(/_/g, ' ');
  }

  function onValueUpdate(slotPath, displayValue, pointName, status) {
    var valueCell = $('.value-cell[data-slot="' + slotPath + '"]');
    if (valueCell.length) {
      valueCell.text(displayValue);
    }

    var statusDot = $('.status-dot[data-status-slot="' + slotPath + '"]');
    if (statusDot.length) {
      statusDot.attr('class', 'status-dot status-' + (status || 'normal'));
    }

    if (pointStore[slotPath]) {
      pointStore[slotPath].currentValue = displayValue;
      pointStore[slotPath].status = status;
    }
  }

  function showError(message) {
    $('#loading').hide();
    $('#error').text(message).show();
  }

  return {
    init: init
  };
})();
