var DiscoveryTest = (function() {
  'use strict';

  function runAll() {
    var passed = 0;
    var failed = 0;

    var tests = [
      { name: 'discoverOneLevel', fn: testDiscoverOneLevel },
      { name: 'discoverTwoLevel', fn: testDiscoverTwoLevel },
      { name: 'buildDescriptors', fn: testBuildDescriptors },
      { name: 'mixedNesting', fn: testMixedNesting }
    ];

    tests.forEach(function(t) {
      try {
        var result = t.fn();
        if (result && typeof result.then === 'function') {
          console.error('FAIL: ' + t.name + ' - test returned promise instead of boolean (async not awaited)');
          failed++;
        } else if (result) {
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

    console.log(passed + '/' + (passed + failed) + ' discovery tests passed');
    return failed === 0;
  }

  // Helper: create a mock component
  function mockComponent(name, slots, hasOut) {
    var children = slots || [];
    return {
      name: name,
      _slots: children,
      _hasOut: hasOut !== undefined ? hasOut : false,
      getName: function() { return this.name; },
      getSlots: function() {
        var self = this;
        return {
          list: function() { return self._slots; },
          isEmpty: function() { return self._slots.length === 0; },
          size: function() { return self._slots.length; }
        };
      },
      get: function(slotName) {
        if (slotName === 'out' && this._hasOut) {
          return { toString: function() { return '42.5'; } };
        }
        return null;
      }
    };
  }

  // Build a mock baja that routes ORDs to the correct mock component.
  // componentMap: { 'componentName': mockComponent }
  function mockBajaWithMap(componentMap) {
    return {
      Ord: {
        make: function(ord) {
          // Extract the last path segment as the component name
          var parts = ord.replace(/\/$/, '').split('/');
          var name = parts[parts.length - 1];
          var comp = componentMap[name];
          return {
            get: function() {
              if (comp) {
                return Promise.resolve(comp);
              }
              return Promise.reject(new Error('Not found: ' + name));
            }
          };
        }
      }
    };
  }

  // Test 1: 1-level nesting (VisionMetering pattern - 6 direct KWH points)
  function testDiscoverOneLevel() {
    var points = [];
    var map = {};
    for (var i = 0; i < 6; i++) {
      var name = 'METER_' + i + '_KWH';
      var pt = mockComponent(name, [], true);
      points.push(pt);
      map[name] = pt;
    }

    var folder = mockComponent('VisionMetering', points, false);
    map['VisionMetering'] = folder;

    var mockBaja = mockBajaWithMap(map);

    return PointDiscovery.discoverPoints(mockBaja, 'station:|slot:/.../VisionMetering')
      .then(function(descriptors) {
        if (descriptors.length !== 6) {
          console.error('Expected 6 points, got ' + descriptors.length);
          return false;
        }

        var allHaveNames = descriptors.every(function(d) { return d.name && d.name.length > 0; });
        var allHaveOrds = descriptors.every(function(d) { return d.ord && d.ord.length > 0; });
        var allHaveSlotPaths = descriptors.every(function(d) { return d.slotPath && d.slotPath.length > 0; });

        if (!allHaveNames || !allHaveOrds || !allHaveSlotPaths) {
          console.error('Missing required descriptor fields');
          return false;
        }

        return true;
      });
  }

  // Test 2: 2-level nesting (TempHumSensors pattern - containers with sub-points)
  function testDiscoverTwoLevel() {
    var map = {};
    var tempPoint1 = mockComponent('Temperature', [], true);
    var tempPoint2 = mockComponent('Humidity', [], true);
    map['Temperature'] = tempPoint1;
    map['Humidity'] = tempPoint2;

    var containers = [];
    for (var i = 0; i < 3; i++) {
      var name = 'Sensor_' + i;
      // Container has sub-slots but no 'out'
      var subSlots = [tempPoint1, tempPoint2];
      // Deep-clone the sub-points per container to avoid shared state issues
      var subCopy = [
        mockComponent('Temperature', [], true),
        mockComponent('Humidity', [], true)
      ];
      var cont = mockComponent(name, subCopy, false);
      containers.push(cont);
      map[name] = cont;
    }

    var folder = mockComponent('TempHumSensors', containers, false);
    map['TempHumSensors'] = folder;

    var mockBaja = mockBajaWithMap(map);

    return PointDiscovery.discoverPoints(mockBaja, 'station:|slot:/.../TempHumSensors')
      .then(function(descriptors) {
        // 3 containers x 2 points each = 6 points
        if (descriptors.length !== 6) {
          console.error('Expected 6 points, got ' + descriptors.length);
          return false;
        }

        // Verify parent info is included for 2-level points
        var hasParentInfo = descriptors.every(function(d) {
          return d.parentName && d.parentName.length > 0;
        });

        if (!hasParentInfo) {
          console.error('2-level descriptors missing parentName');
          return false;
        }

        return true;
      });
  }

  // Test 3: descriptors have correct shape
  function testBuildDescriptors() {
    var map = {};
    var point = mockComponent('TestPoint', [], true);
    map['TestPoint'] = point;
    var folder = mockComponent('TestFolder', [point], false);
    map['TestFolder'] = folder;

    var mockBaja = mockBajaWithMap(map);

    return PointDiscovery.discoverPoints(mockBaja, 'station:|slot:/Test/TestFolder')
      .then(function(descriptors) {
        if (descriptors.length !== 1) return false;
        var d = descriptors[0];

        var hasRequired = typeof d.name === 'string'
          && typeof d.ord === 'string'
          && typeof d.slotPath === 'string';

        var hasMeta = d.hasOwnProperty('type')
          && d.hasOwnProperty('units');

        return hasRequired && hasMeta;
      });
  }

  // Test 4: mixed nesting - some direct points, some containers
  function testMixedNesting() {
    var map = {};
    var directPoint = mockComponent('DirectPoint', [], true);
    map['DirectPoint'] = directPoint;
    var subPoint1 = mockComponent('SubTemp', [], true);
    var subPoint2 = mockComponent('SubHumidity', [], true);
    map['SubTemp'] = subPoint1;
    map['SubHumidity'] = subPoint2;

    var container = mockComponent('Container1', [subPoint1, subPoint2], false);
    map['Container1'] = container;

    var folder = mockComponent('MixedFolder', [directPoint, container], false);
    map['MixedFolder'] = folder;

    var mockBaja = mockBajaWithMap(map);

    return PointDiscovery.discoverPoints(mockBaja, 'station:|slot:/.../MixedFolder')
      .then(function(descriptors) {
        if (descriptors.length !== 3) {
          console.error('Expected 3 points, got ' + descriptors.length);
          return false;
        }

        var directPointDesc = descriptors.find(function(d) { return d.name === 'DirectPoint'; });
        var subPointDesc = descriptors.find(function(d) { return d.name === 'SubTemp'; });

        if (!directPointDesc || !subPointDesc) {
          console.error('Could not find expected point names');
          return false;
        }

        if (subPointDesc.parentName !== 'Container1') {
          console.error('Sub-point missing parent container name, got: ' + subPointDesc.parentName);
          return false;
        }

        return true;
      });
  }

  return { runAll: runAll };
})();
