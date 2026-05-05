var DxdConfigTest = (function() {
  'use strict';

  var requiredFields = ['id', 'folderPath', 'siteName'];

  function testRequiredFields() {
    var allValid = DXD_CONFIG.every(function(folder, index) {
      return requiredFields.every(function(field) {
        var hasField = folder.hasOwnProperty(field)
          && folder[field] !== null
          && folder[field] !== undefined
          && typeof folder[field] === 'string'
          && folder[field].length > 0;
        if (!hasField) {
          console.error('Config entry ' + index + ' missing required field: ' + field);
        }
        return hasField;
      });
    });
    return allValid;
  }

  function testIdUnique() {
    var ids = DXD_CONFIG.map(function(f) { return f.id; });
    var unique = ids.length === new Set(ids).size;
    if (!unique) console.error('Config ids are not unique');
    return unique;
  }

  function testOrdPathFormat() {
    return DXD_CONFIG.every(function(f, index) {
      var valid = f.folderPath.indexOf('station:|slot:/') === 0;
      if (!valid) console.error('Config entry ' + index + ' folderPath missing station:|slot:/ prefix');
      return valid;
    });
  }

  function runAll() {
    var passed = 0;
    var failed = 0;

    var tests = [
      { name: 'requiredFields', fn: testRequiredFields },
      { name: 'idUnique', fn: testIdUnique },
      { name: 'ordPathFormat', fn: testOrdPathFormat }
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

    console.log(passed + '/' + (passed + failed) + ' tests passed');
    return failed === 0;
  }

  return { runAll: runAll, testRequiredFields: testRequiredFields };
})();
