var HistoryModal = (function() {
  'use strict';

  var $overlay;
  var currentPoint = null;
  var currentStation = '';
  var activePeriod = '24h';
  var baja;

  function init(_baja, stationName) {
    baja = _baja;
    currentStation = stationName;
    createDom();
    bindEvents();
  }

  function createDom() {
    $overlay = $(
      '<div class="modal-overlay" id="history-modal" style="display:none">' +
      '  <div class="modal-content">' +
      '    <div class="modal-header">' +
      '      <h2 class="modal-title">Point History</h2>' +
      '      <button class="modal-close" aria-label="Close">&times;</button>' +
      '    </div>' +
      '    <div class="modal-meta">' +
      '      <span class="modal-point-name"></span>' +
      '      <span class="modal-current-value"></span>' +
      '    </div>' +
      '    <div class="modal-periods">' +
      '      <button class="period-btn" data-period="24h">24 Hours</button>' +
      '      <button class="period-btn" data-period="7d">7 Days</button>' +
      '      <button class="period-btn" data-period="30d">30 Days</button>' +
      '    </div>' +
      '    <div class="modal-chart" id="history-chart"></div>' +
      '    <div class="modal-loading" style="display:none">Loading history data...</div>' +
      '    <div class="modal-error" style="display:none"></div>' +
      '  </div>' +
      '</div>'
    );
    $('body').append($overlay);
  }

  function bindEvents() {
    $overlay.on('click', function(e) {
      if (e.target === this) close();
    });

    $overlay.on('click', '.modal-close', function() {
      close();
    });

    $overlay.on('click', '.period-btn', function() {
      var period = $(this).data('period');
      loadHistory(period);
    });

    $(document).on('keydown', function(e) {
      if (e.key === 'Escape' && $overlay.is(':visible')) {
        close();
      }
    });
  }

  function open(point) {
    currentPoint = point;
    $overlay.find('.modal-point-name').text(point.name);
    $overlay.find('.modal-current-value').text('Current: ' + (point.currentValue || '--'));
    $overlay.show();
    setActivePeriod('24h');
    loadHistory('24h');
  }

  function close() {
    $overlay.hide();
    currentPoint = null;
  }

  function setActivePeriod(period) {
    activePeriod = period;
    $overlay.find('.period-btn').removeClass('active');
    $overlay.find('.period-btn[data-period="' + period + '"]').addClass('active');
  }

  function loadHistory(period) {
    setActivePeriod(period);
    $overlay.find('.modal-loading').show();
    $overlay.find('.modal-error').hide();

    HistoryService.queryHistory(baja, currentPoint.ord, currentStation, period)
      .then(function(records) {
        $overlay.find('.modal-loading').hide();
        if (!records || records.length === 0) {
          $overlay.find('.modal-error').text('No history data available').show();
          return;
        }
        renderChart(records);
      })
      .catch(function(err) {
        $overlay.find('.modal-loading').hide();
        $overlay.find('.modal-error')
          .text('Failed to load history: ' + (err.message || err))
          .show();
      });
  }

  function renderChart(records) {
    if (typeof google === 'undefined' || !google.visualization) {
      $overlay.find('.modal-loading').hide();
      $overlay.find('.modal-error')
        .text('Charts unavailable — requires Google Charts')
        .show();
      return;
    }

    var TimestampTypeKey = findTimestampColumn(records);

    var dataTable = new google.visualization.DataTable();
    dataTable.addColumn('datetime', 'Time');
    dataTable.addColumn('number', currentPoint.name);

    var rows = records.map(function(r) {
      return [r[TimestampTypeKey], r[currentPoint.name]];
    }).filter(function(row) {
      return row[0] !== null && row[0] !== undefined;
    });

    if (rows.length === 0) {
      $overlay.find('.modal-error').text('No valid data points in history').show();
      return;
    }

    dataTable.addRows(rows);

    var options = {
      title: currentPoint.name,
      titleTextStyle: { fontSize: 14 },
      legend: { position: 'none' },
      chartArea: { width: '85%', height: '70%' },
      hAxis: { title: 'Time', format: 'MM/dd HH:mm' },
      vAxis: { title: currentPoint.units || '' },
      lineWidth: 2,
      colors: ['#2563eb']
    };

    var chart = new google.visualization.LineChart(
      document.getElementById('history-chart')
    );
    chart.draw(dataTable, options);
  }

  function findTimestampColumn(records) {
    var timeKeys = ['timestamp', 'AbsTime', 'TimestampTypeKey', 'time'];
    for (var i = 0; i < records.length; i++) {
      var keys = Object.keys(records[i]);
      for (var k = 0; k < timeKeys.length; k++) {
        var match = keys.find(function(key) {
          return key.toLowerCase().indexOf(timeKeys[k].toLowerCase()) !== -1;
        });
        if (match) return match;
      }
    }
    // Fallback: first key
    return Object.keys(records[0])[0];
  }

  return {
    init: init,
    open: open,
    close: close
  };
})();
