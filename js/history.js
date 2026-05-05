var HistoryService = (function() {
  'use strict';

  var PERIOD_MAP = {
    '24h': 'P1D',
    '7d': 'P7D',
    '30d': 'P30D'
  };

  function buildQuery(pointOrd, stationName, periodKey) {
    var isoPeriod = PERIOD_MAP[periodKey] || 'P1D';
    var pointName = extractPointName(pointOrd);
    return "station:|slot:/|bql:select * from history:/" +
      stationName + "/" + pointName + "?period=" + isoPeriod;
  }

  function extractPointName(ord) {
    var idx = ord.lastIndexOf('/');
    if (idx >= 0) return ord.substring(idx + 1);
    var slotIdx = ord.lastIndexOf('slot:');
    return slotIdx >= 0 ? ord.substring(slotIdx + 5) : ord;
  }

  function escapeColumnName(name) {
    return name
      .replace(/\(/g, '$28')
      .replace(/\*/g, 'toString')
      .replace(/\)/g, '$29');
  }

  function queryHistory(baja, pointOrd, stationName, periodKey) {
    var query = buildQuery(pointOrd, stationName, periodKey);
    var records = [];

    return baja.Ord.make(query).get({
      cursor: {
        each: function() {
          records.push(this);
        }
      }
    }).then(function() {
      return parseRecords(baja, records);
    });
  }

  function parseRecords(baja, rows) {
    if (!rows || rows.length === 0) return [];

    var columns = [];
    try {
      columns = rows[0].getColumns ? rows[0].getColumns() : [];
    } catch (e) {
      // No column metadata available
    }

    return rows.map(function(row) {
      var parsed = {};
      columns.forEach(function(col) {
        var colName = col.getDisplayName();
        var key = colName;
        try {
          var value = row.get(colName);
          var typeName = value ? value.getType() : null;
          parsed[key] = parseRecordValue(value, typeName);
        } catch (e) {
          parsed[key] = null;
        }
      });
      return parsed;
    });
  }

  function parseRecordValue(value, typeName) {
    if (value === null || value === undefined) return null;

    try {
      if (typeName === 'baja:AbsTime' || (value.getTime && typeof value.getTime === 'function')) {
        return new Date(value.getTime());
      }
    } catch (e) {
      // Not an AbsTime
    }

    try {
      if (value.valueOf && typeof value.valueOf === 'function') {
        return value.valueOf();
      }
    } catch (e) {
      // valueOf failed
    }

    return value.toString ? value.toString() : String(value);
  }

  return {
    buildQuery: buildQuery,
    escapeColumnName: escapeColumnName,
    parseRecordValue: parseRecordValue,
    queryHistory: queryHistory
  };
})();
