var HistoryTest = (function() {
  'use strict';

  function runAll() {
    var passed = 0;
    var failed = 0;

    var tests = [
      { name: 'buildsQueryString24h', fn: testBuildsQueryString24h },
      { name: 'buildsQueryString7d', fn: testBuildsQueryString7d },
      { name: 'buildsQueryString30d', fn: testBuildsQueryString30d },
      { name: 'escapesColumnNames', fn: testEscapesColumnNames },
      { name: 'parsesAbsTimeToDate', fn: testParsesAbsTimeToDate },
      { name: 'parsesDoubleToNumber', fn: testParsesDoubleToNumber }
    ];

    tests.forEach(function(t) {
      try {
        if (t.fn()) {
          console.log('PASS: ' + t.name);
          passed++;
        } else {
          console.log('FAIL: ' + t.name);
          failed++;
        }
      } catch (e) {
        console.log('FAIL: ' + t.name + ' - ' + e.message);
        failed++;
      }
    });

    console.log(passed + '/' + (passed + failed) + ' history tests passed');
    return failed === 0;
  }

  // Test 1: query string for last 24 hours
  function testBuildsQueryString24h() {
    var query = HistoryService.buildQuery('station:|slot:/.../METER_0_KWH', 'MyStation', '24h');
    if (query.indexOf('history:') === -1) {
      console.error('Query missing history: prefix');
      return false;
    }
    if (query.indexOf('MyStation') === -1) {
      console.error('Query missing station name');
      return false;
    }
    if (query.indexOf('period=P1D') === -1 && query.indexOf('period=PT24H') === -1) {
      console.error('Query missing 24h period');
      return false;
    }
    return true;
  }

  // Test 2: query string for 7 days
  function testBuildsQueryString7d() {
    var query = HistoryService.buildQuery('station:|slot:/.../METER_0_KWH', 'MyStation', '7d');
    if (query.indexOf('period=P7D') === -1 && query.indexOf('period=P1W') === -1) {
      console.error('Query missing 7d period, got: ' + query);
      return false;
    }
    return true;
  }

  // Test 3: query string for 30 days
  function testBuildsQueryString30d() {
    var query = HistoryService.buildQuery('station:|slot:/.../METER_0_KWH', 'MyStation', '30d');
    if (query.indexOf('period=P30D') === -1 && query.indexOf('period=P1M') === -1) {
      console.error('Query missing 30d period');
      return false;
    }
    return true;
  }

  // Test 4: column name escaping (count(*) → count$28toString$29)
  function testEscapesColumnNames() {
    var escaped = HistoryService.escapeColumnName('count(*)');
    if (escaped !== 'count$28toString$29') {
      console.error('count(*) not escaped correctly, got: ' + escaped);
      return false;
    }

    var escaped2 = HistoryService.escapeColumnName('timestamp');
    if (escaped2 !== 'timestamp') {
      console.error('Simple column should not be escaped, got: ' + escaped2);
      return false;
    }

    return true;
  }

  // Test 5: AbsTime → Date parsing
  function testParsesAbsTimeToDate() {
    var mockAbsTime = {
      getTime: function() { return 1609459200000; },
      encodeToString: function() { return '2021-01-01T00:00:00Z'; }
    };

    var parsed = HistoryService.parseRecordValue(mockAbsTime, 'baja:AbsTime');
    if (!(parsed instanceof Date)) {
      console.error('AbsTime not parsed to Date, got: ' + typeof parsed);
      return false;
    }
    if (parsed.getTime() !== 1609459200000) {
      console.error('Date timestamp mismatch');
      return false;
    }

    return true;
  }

  // Test 6: Double → number parsing
  function testParsesDoubleToNumber() {
    var mockDouble = {
      valueOf: function() { return 42.5; },
      encodeToString: function() { return '42.5'; }
    };

    var parsed = HistoryService.parseRecordValue(mockDouble, 'baja:Double');
    if (typeof parsed !== 'number') {
      console.error('Double not parsed to number, got: ' + typeof parsed);
      return false;
    }
    if (parsed !== 42.5) {
      console.error('Double value mismatch, got: ' + parsed);
      return false;
    }

    return true;
  }

  return { runAll: runAll };
})();
