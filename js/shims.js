(function() {
  'use strict';

  var SAMPLE_POINTS = [
    { name: 'Main_Energy_kWh', value: 45280.5, status: 'normal', units: 'kWh' },
    { name: 'Solar_Energy_kWh', value: 12340.2, status: 'normal', units: 'kWh' },
    { name: 'Building_Total_kW', value: 187.3, status: 'normal', units: 'kW' },
    { name: 'HVAC_Power_kW', value: 92.1, status: 'normal', units: 'kW' },
    { name: 'Lighting_Power_kW', value: 45.7, status: 'normal', units: 'kW' },
    { name: 'Equipment_Power_kW', value: 49.5, status: 'normal', units: 'kW' }
  ];

  function createStatus() {
    return {
      _fault: false,
      _down: false,
      _stale: false,
      isFault: function() { return this._fault; },
      isDown: function() { return this._down; },
      isStale: function() { return this._stale; },
      isNormal: function() { return !this._fault && !this._down && !this._stale; },
      isOk: function() { return true; }
    };
  }

  function createBajaValue(initialValue, statusObj) {
    return {
      _value: initialValue,
      _status: statusObj,
      getOut: function() { return this._value; },
      toPathString: function() { return this._path || ''; },
      getStatus: function() { return this._status; },
      get: function(key) {
        if (key === 'out') return this._value;
        if (key === 'status') return this._status;
        return null;
      }
    };
  }

  function createComponent(name, config) {
    var comp = createBajaValue(config.value, config.statusObj);

    comp.getName = function() { return name; };
    comp.getSlots = function() {
      var children = (config.children || []).map(function(c) {
        return createSlot(c.name);
      });
      return {
        _items: children,
        list: function() { return this._items; },
        isEmpty: function() { return this._items.length === 0; }
      };
    };
    comp.getFacets = function() {
      return {
        _facets: { units: config.units || null },
        get: function(key) { return this._facets[key] || null; }
      };
    };

    return comp;
  }

  function createSlot(name) {
    return { getName: function() { return name; } };
  }

  function findPointByName(name) {
    for (var i = 0; i < SAMPLE_POINTS.length; i++) {
      if (SAMPLE_POINTS[i].name === name) return SAMPLE_POINTS[i];
    }
    return null;
  }

  function createComponentForPoint(p, ord) {
    var comp = createComponent(p.name, {
      value: p.value,
      statusObj: createStatus(),
      units: p.units
    });
    comp._path = ord;
    return comp;
  }

  function extractLastSegment(ord) {
    var idx = ord.lastIndexOf('/');
    return idx >= 0 ? ord.substring(idx + 1) : ord;
  }

  function resolveOrd(ord) {
    var points = [];

    SAMPLE_POINTS.forEach(function(p) {
      points.push(createComponentForPoint(p, ord + '/' + p.name));
    });

    var folder = {
      getName: function() { return 'VisionMetering'; },
      get: function(key) {
        if (key === 'out') return null;
        return null;
      },
      getOut: function() { return null; },
      getSlots: function() {
        var slots = SAMPLE_POINTS.map(function(p) {
          return createSlot(p.name);
        });
        return {
          _items: slots,
          list: function() { return this._items; },
          isEmpty: function() { return this._items.length === 0; }
        };
      }
    };

    return { folder: folder, points: points };
  }

  function resolveSinglePoint(ord) {
    var name = extractLastSegment(ord);
    var point = findPointByName(name);
    if (point) {
      return createComponentForPoint(point, ord);
    }
    return null;
  }

  function createHistoryRecord(point, timestamp) {
    var self = this || {};
    self._timestamp = timestamp;
    self._value = point.value;

    self.getColumns = function() {
      return [
        { getDisplayName: function() { return 'timestamp'; } },
        { getDisplayName: function() { return point.name; } }
      ];
    };

    self.get = function(colName) {
      var val = null;
      if (colName === 'timestamp') val = timestamp;
      else if (colName === point.name) val = point.value;
      return {
        _val: val,
        getType: function() { return val instanceof Date ? 'baja:AbsTime' : 'baja:Double'; },
        getTime: function() { return val instanceof Date ? val.getTime() : null; },
        valueOf: function() { return typeof val === 'number' ? val : 0; },
        toString: function() { return String(val); }
      };
    };

    return self;
  }

  function createJQueryMock() {
    function $(selector) {
      if (selector === window || selector === document) {
        return $(wrapElement(selector));
      }

      if (typeof selector === 'string') {
        if (selector.charAt(0) === '<') {
          return $(createFromHtml(selector));
        }

        var els = document.querySelectorAll(selector);
        return $(Array.prototype.slice.call(els));
      }

      if (selector instanceof JQueryInstance) {
        return selector;
      }

      return new JQueryInstance(selector);
    }

    function wrapElement(el) {
      return new JQueryInstance([el]);
    }

    function createFromHtml(html) {
      var trimmed = html.trim();
      var tagMatch = trimmed.match(/^<(\w+)/);
      var tagName = tagMatch ? tagMatch[1].toLowerCase() : '';
      var tableTags = ['td', 'th', 'tr', 'tbody', 'thead', 'tfoot'];
      var wrapper = tableTags.indexOf(tagName) !== -1
        ? document.createElement('table')
        : document.createElement('div');

      wrapper.innerHTML = trimmed;
      var child = wrapper.firstChild;

      if (tagName === 'td' || tagName === 'th') {
        if (child) child = child.firstChild;  // tbody
        if (child) child = child.firstChild;  // tr
        if (child) child = child.firstChild;  // td/th
      } else if (tagName === 'tr') {
        if (child) child = child.firstChild;  // tbody
        if (child) child = child.firstChild;  // tr
      }

      if (child && child.parentNode) {
        child.parentNode.removeChild(child);
      }

      return new JQueryInstance([child]);
    }

    function JQueryInstance(elements) {
      var els = Array.isArray(elements) ? elements : [elements];
      for (var i = 0; i < els.length; i++) {
        this[i] = els[i];
      }
      this.length = els.length;
    }

    JQueryInstance.prototype.show = function() {
      for (var i = 0; i < this.length; i++) {
        if (this[i] && this[i].style) this[i].style.display = '';
      }
      return this;
    };

    JQueryInstance.prototype.hide = function() {
      for (var i = 0; i < this.length; i++) {
        if (this[i] && this[i].style) this[i].style.display = 'none';
      }
      return this;
    };

    JQueryInstance.prototype.text = function(val) {
      if (arguments.length === 0) {
        var t = '';
        for (var i = 0; i < this.length; i++) {
          if (this[i]) t += this[i].textContent || '';
        }
        return t;
      }
      for (var j = 0; j < this.length; j++) {
        if (this[j]) this[j].textContent = val;
      }
      return this;
    };

    JQueryInstance.prototype.html = function(val) {
      if (arguments.length === 0) {
        return this[0] ? this[0].innerHTML : '';
      }
      for (var i = 0; i < this.length; i++) {
        if (this[i]) this[i].innerHTML = val;
      }
      return this;
    };

    JQueryInstance.prototype.append = function(content) {
      for (var i = 0; i < this.length; i++) {
        if (!this[i]) continue;
        if (content instanceof JQueryInstance) {
          for (var j = 0; j < content.length; j++) {
            if (content[j]) this[i].appendChild(content[j]);
          }
        } else if (typeof content === 'string') {
          this[i].insertAdjacentHTML('beforeend', content);
        } else if (content.nodeType) {
          this[i].appendChild(content);
        }
      }
      return this;
    };

    JQueryInstance.prototype.empty = function() {
      for (var i = 0; i < this.length; i++) {
        if (this[i]) this[i].innerHTML = '';
      }
      return this;
    };

    JQueryInstance.prototype.on = function(event, selectorOrHandler, handler) {
      var h = handler || selectorOrHandler;
      var sel = handler ? selectorOrHandler : null;

      for (var i = 0; i < this.length; i++) {
        if (!this[i]) continue;
        if (sel) {
          this[i].addEventListener(event, function(e) {
            var target = e.target;
            if (target && target.matches && target.matches(sel)) {
              h.call(target, e);
            }
          });
        } else {
          this[i].addEventListener(event, function(e) {
            h.call(this, e);
          });
        }
      }
      return this;
    };

    JQueryInstance.prototype.attr = function(name, value) {
      if (arguments.length === 1) {
        return this[0] ? this[0].getAttribute(name) : undefined;
      }
      for (var i = 0; i < this.length; i++) {
        if (this[i]) this[i].setAttribute(name, value);
      }
      return this;
    };

    JQueryInstance.prototype.addClass = function(className) {
      var classes = className.split(/\s+/);
      for (var i = 0; i < this.length; i++) {
        if (this[i] && this[i].classList) {
          for (var c = 0; c < classes.length; c++) {
            this[i].classList.add(classes[c]);
          }
        }
      }
      return this;
    };

    JQueryInstance.prototype.removeClass = function(className) {
      var classes = className.split(/\s+/);
      for (var i = 0; i < this.length; i++) {
        if (this[i] && this[i].classList) {
          for (var c = 0; c < classes.length; c++) {
            this[i].classList.remove(classes[c]);
          }
        }
      }
      return this;
    };

    JQueryInstance.prototype.find = function(selector) {
      var results = [];
      for (var i = 0; i < this.length; i++) {
        if (this[i] && this[i].querySelectorAll) {
          var found = this[i].querySelectorAll(selector);
          for (var j = 0; j < found.length; j++) {
            results.push(found[j]);
          }
        }
      }
      return new JQueryInstance(results);
    };

    JQueryInstance.prototype.is = function(selector) {
      for (var i = 0; i < this.length; i++) {
        if (this[i] && this[i].matches && this[i].matches(selector)) return true;
        if (selector === ':visible' && this[i] && this[i].style && this[i].style.display !== 'none') return true;
      }
      return false;
    };

    JQueryInstance.prototype.data = function(name) {
      if (arguments.length === 0) {
        var obj = {};
        if (this[0] && this[0].dataset) {
          var keys = Object.keys(this[0].dataset);
          for (var k = 0; k < keys.length; k++) {
            var camelKey = keys[k].replace(/-([a-z])/g, function(_, c) { return c.toUpperCase(); });
            obj[camelKey] = this[0].dataset[keys[k]];
          }
        }
        return obj;
      }
      return this[0] && this[0].dataset ? this[0].dataset[name] : undefined;
    };

    return $;
  }

  function createMockBaja() {
    function Ord() {}
    Ord.make = function(path) {
      return {
        _path: path,
        get: function(opts) {
          return new Promise(function(resolve) {
            var component;

            if (opts && opts.cursor && opts.cursor.each) {
              var now = Date.now();
              var intervals = [3600000, 7200000, 10800000, 14400000, 18000000];
              SAMPLE_POINTS.forEach(function(p) {
                intervals.forEach(function(offset, i) {
                  var rec = createHistoryRecord(p, new Date(now - offset));
                  rec.getColumns = function() {
                    return [
                      { getDisplayName: function() { return 'timestamp'; } },
                      { getDisplayName: function() { return p.name; } }
                    ];
                  };
                  rec.get = function(colName) {
                    var val = colName === 'timestamp' ? new Date(now - offset) : p.value + (Math.random() - 0.5) * 10;
                    return {
                      _val: val,
                      getType: function() { return val instanceof Date ? 'baja:AbsTime' : 'baja:Double'; },
                      getTime: function() { return val instanceof Date ? val.getTime() : null; },
                      valueOf: function() { return typeof val === 'number' ? val : 0; },
                      toString: function() { return String(val); }
                    };
                  };
                  opts.cursor.each.call(rec);
                });
              });
              component = { getName: function() { return 'history'; } };
            } else {
              var result = resolveOrd(path);
              component = result.folder;
            }

            resolve(component);
          });
        }
      };
    };

    function BatchResolve(ords) {
      this._ords = ords;
    }
    BatchResolve.prototype.resolve = function(opts) {
      var self = this;
      return new Promise(function(resolve) {
        self._ords.forEach(function(ord) {
          var component = resolveSinglePoint(ord);
          if (component && opts.each) {
            opts.each.call(component);
          }
        });
        resolve();
      });
    };

    function Subscriber() {
      this._handlers = {};
    }
    Subscriber.prototype.attach = function(event, handler) {
      this._handlers[event] = handler;
    };
    Subscriber.prototype.unsubscribeAll = function() {
      this._handlers = {};
    };
    Subscriber.prototype.detach = function() {
      this._handlers = {};
    };

    function bajaError(msg) {
      console.error(msg);
    }

    return {
      Ord: Ord,
      BatchResolve: BatchResolve,
      Subscriber: Subscriber,
      error: bajaError
    };
  }

  window.bajaRequire = function(deps, callback) {
    var baja = createMockBaja();
    var $ = createJQueryMock();
    window.$ = $;
    callback(baja, $);
  };
})();
