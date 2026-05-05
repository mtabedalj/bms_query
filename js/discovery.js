var PointDiscovery = (function() {
  'use strict';

  function discoverPoints(baja, folderOrd) {
    return baja.Ord.make(folderOrd).get()
      .then(function(folder) {
        return enumerateChildren(baja, folder, folderOrd);
      });
  }

  function enumerateChildren(baja, folder, folderOrd) {
    var children = folder.getSlots();
    var descriptors = [];

    var tasks = [];
    children.list().forEach(function(childSlot) {
      tasks.push(processSlot(baja, childSlot, folderOrd, descriptors));
    });

    return Promise.all(tasks).then(function() {
      return descriptors;
    });
  }

  function processSlot(baja, childSlot, parentOrd, descriptors) {
    var childOrd = parentOrd + '/' + childSlot.getName();

    return baja.Ord.make(childOrd).get()
      .then(function(child) {
        var hasOut = false;
        try {
          hasOut = child.get('out') !== null;
        } catch (e) {
          // Component may not support get('out')
        }

        if (hasOut) {
          // 1-level: direct point
          descriptors.push(makeDescriptor(child, childOrd, null));
        } else {
          // 2-level: container, enumerate its children as points
          var subSlots = child.getSlots();
          if (!subSlots.isEmpty()) {
            subSlots.list().forEach(function(subSlot) {
              var subOrd = childOrd + '/' + subSlot.getName();
              descriptors.push(makeSlotDescriptor(subSlot, subOrd, child.getName()));
            });
          }
        }
      })
      .catch(function(err) {
        // Skip unresolvable slots silently
      });
  }

  function makeDescriptor(component, ord, parentName) {
    var descriptor = {
      name: component.getName(),
      ord: ord,
      slotPath: extractSlotPath(ord),
      parentName: parentName || null,
      type: null,
      units: null
    };

    try {
      var facets = component.getFacets && component.getFacets();
      if (facets) {
        descriptor.units = facets.get('units') || null;
      }
    } catch (e) {
      // Facets not available
    }

    return descriptor;
  }

  function makeSlotDescriptor(slot, ord, parentName) {
    return {
      name: slot.getName(),
      ord: ord,
      slotPath: extractSlotPath(ord),
      parentName: parentName || null,
      type: null,
      units: null
    };
  }

  function extractSlotPath(ord) {
    var idx = ord.indexOf('slot:');
    return idx >= 0 ? ord.substring(idx + 5) : ord;
  }

  return { discoverPoints: discoverPoints };
})();
