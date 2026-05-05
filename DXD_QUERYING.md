# DXD Querying Guide — Retrieving Data from Tridium Niagara

A practical guide for building dashboards that read live data, subscribe to changes, query history, and read alarm limits from a Niagara station via BajaScript.

## Table of Contents

1. [How BajaScript Works](#1-how-bajascript-works)
2. [ORD Resolution (Single Point)](#2-ord-resolution-single-point)
3. [Batch Resolution](#3-batch-resolution)
4. [Live Subscriptions](#4-live-subscriptions)
5. [BQL History Queries](#5-bql-history-queries)
6. [Reading Alarm Extensions](#6-reading-alarm-extensions)
7. [Configuring sensorConfig.js for New Points](#7-configuring-sensorconfigjs-for-new-points)
8. [Adapting for New Point Types](#8-adapting-for-new-point-types)
9. [Common Pitfalls](#9-common-pitfalls)

---

## 1. How BajaScript Works

BajaScript is the JavaScript API that runs **inside a Niagara station's web container**. It communicates with the Niagara framework running on the server to resolve components, subscribe to live value changes, query history databases, and manipulate the component tree.

### Module Loading with RequireJS

All BajaScript code runs inside a `require()` block loaded by RequireJS. In the SensorDashboard, we use `bajaRequire()` (a wrapper that Niagara provides in the page context) instead of the bare `require()`:

```js
// SensorDashboard pattern (js/dashboard.js, js/history.js)
bajaRequire(['baja!', 'jquery'], function(baja, $) {
  'use strict';
  // baja is the BajaScript API
  // $ is jQuery
});
```

The BajaScript examples use the native `require()`:

```js
// bajascriptExamples/GettingStarted.md
require(['baja!', 'dialogs'], function(baja, dialogs) {
  'use strict';
  dialogs.showOk('BajaScript version: ' + baja.version);
});
```

**Key difference**: In a standalone Niagara module page you use `require()`. In the SensorDashboard (served from a Niagara station's file system), use `bajaRequire()` — it's the same API but resolved through the station's RequireJS config.

### Importing Niagara Types

Some operations require specific Niagara types to be loaded before you can use them. There are two ways:

**Option A: Via the `baja!` plugin in require()** — best when you know the types upfront:

```js
// bajascriptExamples/Adding.md
require([
  'baja!',
  'baja!alarm:AlarmSourceExt,alarm:OutOfRangeFaultAlgorithm,alarm:OutOfRangeAlgorithm',
  'dialogs'
], function(baja, types, dialogs) {
  // types are now registered — you can use baja.$("alarm:OutOfRangeAlgorithm")
});
```

**Option B: Via `baja.importTypes()`** — best when types need to be loaded dynamically:

```js
// js/dashboard.js (init function)
await baja.importTypes([
  'alarm:AlarmSourceExt',
  'alarm:OutOfRangeFaultAlgorithm',
  'alarm:OutOfRangeAlgorithm'
]);
```

**Why this matters**: If you try to call `baja.$("alarm:OutOfRangeAlgorithm")` before importing the type, it will throw. Type imports must complete before you resolve or create typed components.

### Promise-Based API

All BajaScript operations that make network calls return Promises. The entire API is async:

```js
// bajascriptExamples/GettingStarted.md pattern
baja.Ord.make('station:|slot:/path').get()
  .then((component) => { /* do something */ })
  .catch((err) => baja.error(err));
```

In the SensorDashboard we use `async/await` for readability:

```js
var br = await baja.BatchResolve.resolve({ ords: allSensorOrds, lease: true });
```

### BajaScript Object Types

BajaScript augments JavaScript primitives with Niagara-compatible types. See `bajascriptExamples/Objects.md` for the full reference.

| Type | Constructor | Example |
|------|------------|---------|
| Double | `baja.Double.make(12.3)` | Numeric values |
| Integer | `baja.Integer.make(12)` | Integer values |
| Boolean | `true` / `false` | Native JS booleans work |
| RelTime | `baja.RelTime.make({ hours: 1, minutes: 30 })` | Relative time durations |
| AbsTime | `baja.AbsTime.now()` | Absolute timestamps |
| Facets | `baja.Facets.make({ key: value })` | Property metadata |
| Status | `baja.Status.make(baja.Status.DOWN \| baja.Status.FAULT)` | Component status flags |
| Enums | `baja.$("baja:Weekday").get("monday")` | Niagara enumerations |

---

## 2. ORD Resolution (Single Point)

An **ORD** (Object Reference Descriptor) is a path string that identifies a component in the Niagara station. The simplest way to read a single value is to resolve an ORD and read its properties.

### Basic Resolution

```js
// bajascriptExamples/Subscription.md pattern
baja.Ord.make('station:|slot:/BajaScriptExamples/Components/Ramp')
  .get()
  .then((component) => {
    // component is a proxy to the real Niagara component
    var value = component.get('out');       // read the "out" property
    var display = component.getOutDisplay(); // formatted display value
  })
  .catch((err) => baja.error(err));
```

### ORD Path Syntax

Niagara ORD paths follow a specific format:

```
station:|slot:/Drivers/AbstractMqttDriverNetwork/FordHiveMQTT/points/TempHumSensors/BLD6_DOCK
│         │     │
│         │     └─ Slot path hierarchy
│         └─ "slot:" separator (always used for component tree navigation)
└─ "station:" protocol (always station-local in BajaScript)
```

The SensorDashboard uses paths like:

```js
// sensorConfig.js — MQTT sensor basePath
'station:|slot:/Drivers/AbstractMqttDriverNetwork/FordHiveMQTT/points/TempHumSensors'

// Full point ORD for a specific sensor's TEMPERATURE point:
'station:|slot:/Drivers/AbstractMqttDriverNetwork/FordHiveMQTT/points/TempHumSensors/BLD6_DOCK/TEMPERATURE'
```

For Niagara Network sensors, the path includes the remote station:

```js
// sensorConfig.js — Niagara Network sensor basePath
'station:|slot:/Drivers/NiagaraNetwork/RE_Center/Staff_Blds/STAFF_BLDG/points'

// Full point ORD:
'station:|slot:/Drivers/NiagaraNetwork/RE_Center/Staff_Blds/STAFF_BLDG/points/BLD1_SUBSTATION/TEMPERATURE'
```

### Leased Resolution (Temporary Read)

When you just need to read a value once without subscribing, you can lease the component temporarily:

```js
// bajascriptExamples/Setting.md pattern
baja.Ord.make('station:|slot:/path/to/Component')
  .get({
    lease: true,  // temporarily subscribe
    leaseTime: baja.RelTime.make({ minutes: 1 })  // lease duration
  })
  .then((point) => {
    // Read values — the lease auto-expires after the specified time
  });
```

Without `lease: true` or a `subscriber`, the component is leased for the default duration (10 seconds). This is fine for one-shot reads but **not** for live dashboards.

---

## 3. Batch Resolution

Resolving dozens of ORD paths one at a time creates a network round-trip per call. **`baja.BatchResolve`** resolves multiple ORD paths in a single network call, dramatically reducing load time.

### Basic BatchResolve

```js
// bajascriptExamples/BatchResolve.md
const ords = [
  'station:|slot:/BajaScriptExamples/Components/Ramp',
  'station:|slot:/BajaScriptExamples/Components/Counter',
  'station:|slot:/BajaScriptExamples/Components/NumericWritable'
];

const resolve = new baja.BatchResolve(ords);
resolve.resolve({
  each: function() {
    // 'this' is the resolved component
    console.log(this.toPathString());
  }
})
.then(() => { /* all resolved */ })
.catch((err) => baja.error(err));
```

### SensorDashboard BatchResolve Pattern

The dashboard uses a **two-phase batch resolve** — first resolve the sensor containers, then resolve their child points:

**Phase 1: Resolve sensor containers**

```js
// js/dashboard.js — initializeSensors()
var allSensorOrds = [];
var ordToGroupMap = {};

// Build the list of sensor container ORDs from config
sensorGroups.forEach(function(group) {
  group.sensors.forEach(function(sensorName) {
    var ord = group.basePath + '/' + sensorName;
    allSensorOrds.push(ord);
    ordToGroupMap[ord] = {
      groupId: group.groupId,
      groupName: group.groupName,
      sensorName: sensorName,
      type: group.type,
      stationName: group.stationName,
      tempPointName: group.tempPointName || 'TEMPERATURE',
      points: group.points,
      historyNameOverrides: group.historyNameOverrides
    };
  });
});

// Batch resolve ALL sensor containers at once
var br = await baja.BatchResolve.resolve({ ords: allSensorOrds, lease: true });
```

**Phase 2: Resolve child points with subscription**

After iterating the sensor containers, build child point ORDs and batch-resolve them with a subscriber:

```js
var allPointOrds = [];
var ordToSensorMap = {};

for (var i = 0; i < br.size(); i++) {
  var ord = br.getOrd(i);
  var ordStr = ord.toString();
  var groupInfo = ordToGroupMap[ordStr];
  if (!groupInfo) continue;

  var sensorId = groupInfo.groupId + '_' + groupInfo.sensorName;

  // Register sensor in AppState
  AppState.sensorData[sensorId] = {
    name: groupInfo.sensorName.replace(/_/g, ' '),
    type: groupInfo.type,
    stationName: groupInfo.stationName,
    temperature: NaN, humidity: NaN, battery: NaN, rssi: NaN,
    // ... more fields
  };

  // Build child point ORDs
  groupInfo.points.forEach(function(pointType) {
    var pointOrd = ordStr + '/' + pointType;  // e.g. ".../BLD6_DOCK/TEMPERATURE"
    allPointOrds.push(pointOrd);
    ordToSensorMap[pointOrd] = { sensorId: sensorId, pointType: pointType };
  });
}

// Batch resolve ALL child points and subscribe them
var pointsBr = await baja.BatchResolve.resolve({
  ords: allPointOrds,
  lease: true,
  subscriber: subscriber  // <-- this is what enables live updates
});
```

### Reading Initial Values from BatchResolve Results

```js
for (var j = 0; j < pointsBr.size(); j++) {
  var point = pointsBr.get(j);
  var info = ordToSensorMap[pointsBr.getOrd(j).toString()];
  if (!info) continue;

  var id = info.sensorId;

  // Map the component to its slotPath for subscriber routing
  componentToSensorMap[point.getSlotPath()] = info;

  if (info.pointType === 'LAST_UPDATE') {
    AppState.sensorData[id].lastReportedStr = extractLastUpdateValue(point);
  } else {
    var value = parseFloat(point.get('out').toString());
    if (info.pointType === 'TEMPERATURE' || info.pointType === 'EXTTEMP') {
      AppState.sensorData[id].temperature = value;
    }
    else if (info.pointType === 'HUMIDITY') {
      AppState.sensorData[id].humidity = value;
    }
    else if (info.pointType === 'BATTERY') {
      AppState.sensorData[id].battery = value;
    }
    else if (info.pointType === 'RSSI') {
      AppState.sensorData[id].rssi = value;
    }
  }
}
```

### BatchResolve API Summary

| Method/Property | Description |
|-----------------|-------------|
| `new baja.BatchResolve(ords)` | Create with array of ORD strings |
| `.resolve({ each, lease, subscriber })` | Resolve all ORDs. `each` callback fires per component. |
| `baja.BatchResolve.resolve({ ords, lease, subscriber })` | Static version — resolves and returns a result object |
| `br.size()` | Number of resolved components |
| `br.get(i)` | Get the i-th resolved component |
| `br.getOrd(i)` | Get the i-th original ORD |

### Manual Batching (Legacy)

> Note: as of Niagara 4.10, most network requests batch together automatically. Manual batching is largely obsolete.

```js
// bajascriptExamples/Batching.md
var batch = new baja.comm.Batch();
const promises = points.map((point) => Promise.all([
  sub.subscribe({ comps: point, batch }),
  point.invoke({ slot: 'set', value, batch })
]));
batch.commit();  // sends all queued operations in one network call
```

You probably won't need manual batching unless you're doing writes. For read-heavy dashboards, `BatchResolve` is the right tool.

---

## 4. Live Subscriptions

Subscriptions give you **push-based real-time updates**. When a Niagara component's value changes, the subscriber's callback fires automatically.

### Creating a Subscriber

```js
// js/dashboard.js
var subscriber = new baja.Subscriber();
```

### Attaching Event Handlers

The `changed` event fires whenever a subscribed component's property changes:

```js
// bajascriptExamples/Subscription.md — basic pattern
subscriber.attach('changed', function(prop) {
  if (prop.getName() === 'out') {
    // 'this' is the component that changed
    update(this);
  }
});
```

The SensorDashboard uses an object literal to attach to a single event type with more context:

```js
// js/dashboard.js
subscriber.attach({
  changed: function(prop, cx) {
    var comp = this;           // the component that fired the change
    var propName = prop.getName(); // which property changed (e.g. 'out', 'alarmState')
    var slotPath = comp.getSlotPath(); // unique path for routing updates

    // Route the update to the right sensor
    if (componentToSensorMap[slotPath]) {
      var info = componentToSensorMap[slotPath];
      var id = info.sensorId;

      if (info.pointType === 'TEMPERATURE') {
        var val = parseFloat(comp.get('out').toString());
        AppState.sensorData[id].temperature = val;
      }
      // ... handle other point types
    }
  }
});
```

### The SlotPath Routing Pattern

This is the key architectural pattern in the SensorDashboard. Since one subscriber handles updates for **all** points, we need a way to route each update to the right sensor:

```js
// During initialization, map each component's slotPath to its sensor metadata
componentToSensorMap[point.getSlotPath()] = {
  sensorId: sensorId,
  pointType: pointType  // 'TEMPERATURE', 'HUMIDITY', 'BATTERY', etc.
};

// During the changed callback, look up the routing info
if (componentToSensorMap[slotPath]) {
  var info = componentToSensorMap[slotPath];
  // route the update...
}
```

### Subscribing During BatchResolve

The most efficient way to subscribe is to pass the subscriber during batch resolution:

```js
// js/dashboard.js — subscribe all points in one batch call
var pointsBr = await baja.BatchResolve.resolve({
  ords: allPointOrds,
  lease: true,
  subscriber: subscriber  // all resolved components are auto-subscribed
});
```

This is equivalent to calling `subscriber.subscribe({ comps: point })` for each component, but done in a single network round-trip.

### Subscribing to Alarm Extension State Changes

The dashboard also subscribes to alarm extension components for real-time alarm state updates:

```js
// js/dashboard.js — readAlarmExtension()
var extSlotPath = alarmExt.getSlotPath();
componentToSensorMap[extSlotPath] = { sensorId: sensorId, pointType: 'ALARM_STATE' };
subscriber.subscribe({ comps: alarmExt });
```

When the alarm state changes, the subscriber's `changed` callback fires with `prop.getName() === 'alarmState'`, and the routing logic updates `AppState.sensorData[id].alarmState`.

### Available Subscriber Events

From `bajascriptExamples/Events.md`, you can attach handlers for:

| Event | When it fires |
|-------|--------------|
| `changed` | Any property on a subscribed component changes |
| `added` | A child component is added |
| `removed` | A child component is removed |
| `renamed` | A component is renamed |
| `reordered` | Children are reordered |
| `topicFired` | A topic event fires |
| `flagsChanged` | Component flags change |
| `facetsChanged` | Component facets change |
| `subscribed` | Component is subscribed |
| `unsubscribed` | Component is unsubscribed |
| `unmount` | Component removed from station |

You can attach to multiple events at once:

```js
// bajascriptExamples/Events.md
subscriber.attach({
  changed: function(prop, cx) { /* ... */ },
  added: function(prop, cx) { /* ... */ },
  removed: function(val, cx) { /* ... */ },
  topicFired: function(topic, event, cx) { /* ... */ }
});
```

### Cleanup

Always clean up subscribers when the page unloads or the component unmounts:

```js
// js/dashboard.js
window.addEventListener('beforeunload', function() {
  subscriber.unsubscribeAll();  // stop receiving updates
});

// bajascriptExamples/Subscription.md — full cleanup
sub.unsubscribeAll();  // stop all subscriptions
sub.detach();           // remove all event handlers
```

---

## 5. BQL History Queries

Niagara stores historical data in history extensions. You query them using **BQL** (Baja Query Language) with the cursor pattern.

### History Path Format

History records live under a specific ORD path pattern:

```
history:/stationName/sensorName_pointName?period=timePeriod
```

- `stationName` — the Niagara station name (e.g. `FordWS`)
- `sensorName` — the sensor's raw name (e.g. `BLD6_DOCK`)
- `pointName` — the point type (e.g. `TEMPERATURE`, or `EXTTEMP` for coolers/freezers)
- `timePeriod` — the query window (e.g. `last7Days`, `last24Hours`, `last30Days`)

The SensorDashboard determines the history path based on sensor type:

```js
// js/history.js — loadSensorHistory()
var nameToUse = s.historyName || s.rawName;
var historyPath = '';

if (s.type === 'mqtt') {
  historyPath = 'FordWS/' + nameToUse + '_' + s.tempPointName;
} else if (s.type === 'niagara') {
  historyPath = s.stationName + '/' + nameToUse + '_' + s.tempPointName;
}

var bqlData = 'history:/' + historyPath + '?period=' + period;
```

For coolers/freezers, `tempPointName` is `EXTTEMP` and `historyNameOverrides` maps the sensor name:

```js
// sensorConfig.js
{
  groupId: 'mqtt_fxc',
  tempPointName: 'TEMPERATURE',  // default for non-cooler sensors
  historyNameOverrides: {
    'FXC_COOLER_1': 'FXC_COOLER_1_EXTTEMP',  // overrides to use EXTTEMP history
    'FXC_MN_FREEZER': 'FXC_MN_FREEZER_EXTTEMP'
  }
}
```

### Two-Step History Query Pattern

The dashboard queries history in two steps: first get the record count, then fetch the actual records.

**Step 1: Count records**

```js
// js/history.js — execHistoryBQL()
var bqlCnt = 'history:/' + historyPath + '?period=' + period + '|bql:select count(*)';
var bqlCntList = await baja.Ord.make(bqlCnt).get({ lease: true });

var recordCount = 0;
await bqlCntList.cursor({
  each: function(rec) {
    recordCount = rec.getValueOf('count$28toString$29');
  }
});

if (recordCount === 0) throw new Error('No records');
```

**Note on column name escaping**: `count(*)` gets encoded as `count$28toString$29` in BajaScript. The `escapeString` helper handles this:

```js
// js/history.js
var escapeString = function(s) {
  return s === 'count(*)' ? 'count$28toString$29' : baja.SlotPath.escape(s);
};
```

**Step 2: Fetch records with cursor**

```js
// js/history.js — execHistoryBQL()
var bqlList = await baja.Ord.make(bqlStr).get({ lease: true });
var historyRecords = [];
var columns = [];

await bqlList.cursor({
  before: function(cur) {
    // Discover column names from the result schema
    cur.getSource().getColumns().forEach(function(item) {
      var c = {};
      c[item.getDisplayName()] = escapeString(item.getName());
      columns.push(c);
    });
  },
  each: function(rec) {
    // Build a JS object from each history record
    var recordObj = {};
    columns.forEach(function(item) {
      var k = Object.keys(item)[0];   // display name (e.g. "Timestamp")
      var v = Object.values(item)[0]; // escaped name (e.g. "timestamp")
      var val = rec.get(v);

      if (val.getType().toString() === 'baja:AbsTime') {
        recordObj[k] = val.getJsDate();  // convert to JS Date
      } else if (val.getType().toString() === 'baja:Double') {
        recordObj[k] = parseFloat(val.toString());
      } else {
        recordObj[k] = val.toString();
      }
    });
    historyRecords.push(recordObj);
  },
  limit: recordCount  // fetch all records
});
```

### BQL Query Syntax

The general pattern for BQL queries:

```js
// bajascriptExamples/Querying.md — basic BQL query
baja.Ord.make("station:|slot:/|bql:select toPathString from baja:Component")
  .get({
    cursor: {
      before: function() { /* called before iteration */ },
      each: function() {
        // 'this' is the current row
        console.log(this.get("toPathString"));
      },
      after: function() { /* called after iteration */ },
      limit: 15,   // max records (defaults to 10)
      offset: 0    // starting offset (for pagination)
    }
  })
  .then((result) => {
    result.getColumns().forEach((c) => {
      console.log("Column: " + c.getDisplayName());
    });
  })
  .catch((err) => baja.error(err));
```

### Available Time Periods

Common periods used in history queries:

| Period String | Coverage |
|--------------|----------|
| `last15Minutes` | Rolling 15-minute window |
| `lastHour` | Rolling 1-hour window |
| `last24Hours` | Rolling 24-hour window |
| `last7Days` | Rolling 7-day window |
| `last30Days` | Rolling 30-day window |

### Charting with Google Charts

The dashboard renders history data as a line chart using Google Charts:

```js
// js/history.js — drawHistoryChart()
var data = new google.visualization.DataTable();
data.addColumn('datetime', 'Time');
data.addColumn('number', 'Temp');

// Add alarm limit lines if available
var hasLimits = sensorData.hasAlarmExt
  && sensorData.alarmHighLimit !== null && sensorData.alarmLowLimit !== null;
if (hasLimits) {
  data.addColumn('number', 'High Limit');
  data.addColumn('number', 'Low Limit');
}

records.forEach(function(r) {
  var t = r.timestamp || r.Timestamp;
  var v = r.value || r.Value;
  if (t && !isNaN(v)) {
    if (hasLimits) {
      data.addRow([new Date(t), parseFloat(v),
        sensorData.alarmHighLimit, sensorData.alarmLowLimit]);
    } else {
      data.addRow([new Date(t), parseFloat(v)]);
    }
  }
});

// Render
var chart = new google.visualization.LineChart(container);
chart.draw(data, options);
```

Google Charts must be loaded before use:

```js
// js/history.js — initialization
google.charts.load('current', { packages: ['corechart', 'line'] });
```

---

## 6. Reading Alarm Extensions

Niagara points can have **alarm extensions** attached that define high/low limits and track alarm state. Reading these requires a workaround due to how BajaScript proxies typed components.

### The Type Proxy Problem

When you read an alarm extension's `offnormalAlgorithm` as a sub-property of the extension, BajaScript returns a proxy typed as **`BOffnormalAlgorithm`** (the declared base type). This type **does not have** `getHighLimit()` or `getLowLimit()` — those methods only exist on `BOutOfRangeAlgorithm` (the runtime subtype).

The workaround: resolve the `offnormalAlgorithm` component **directly via its own ORD path**. This gives you a properly-typed proxy.

### Step 1: Check if a Point Has an Alarm Extension

```js
// js/dashboard.js — readAlarmExtension()
var alarmSlots = point.getSlots().is('alarm:AlarmSourceExt');
if (alarmSlots.isEmpty()) return;  // no alarm extension on this point

var alarmExt = alarmSlots.firstValue();
```

### Step 2: Read the Alarm State

```js
var alarmState;
try {
  alarmState = alarmExt.getAlarmState();  // typed method
} catch (e) {
  alarmState = alarmExt.get('alarmState'); // fallback: generic property access
}

var stateStr = alarmState ? alarmState.toString().toLowerCase() : 'normal';
if (stateStr.indexOf('high') !== -1) alarmState = 'highLimit';
else if (stateStr.indexOf('low') !== -1) alarmState = 'lowLimit';
else alarmState = 'normal';
```

### Step 3: Collect offnormalAlgorithm ORD Paths for Batch Resolution

Instead of reading limits from the sub-property (which returns a `BOffnormalAlgorithm` proxy), we build the full ORD path to resolve it directly:

```js
// js/dashboard.js — readAlarmExtension()
var extName = alarmExt.getName();
var pointOrd = point.getNavOrd().toString();
var offnormalAlgOrd = pointOrd + '/' + extName + '/offnormalAlgorithm';
alarmAlgOrds[sensorId] = offnormalAlgOrd;
```

This produces ORD paths like:
```
station:|slot:/Drivers/.../BLD6_DOCK/TEMPERATURE/alarmExt1/offnormalAlgorithm
```

### Step 4: Batch Resolve All Algorithm Components

```js
// js/dashboard.js — resolveAlarmLimits()
var ids = Object.keys(alarmAlgOrds);
var ords = ids.map(function(id) { return alarmAlgOrds[id]; });

var br = await baja.BatchResolve.resolve({ ords: ords, lease: true });

for (var i = 0; i < br.size(); i++) {
  var algo = br.get(i);  // Now properly typed as BOutOfRangeAlgorithm

  var highLimit = null, lowLimit = null;
  try { highLimit = algo.getHighLimit(); } catch (e) {}
  try { lowLimit = algo.getLowLimit(); } catch (e) {}
  // Fallback: generic property access
  if (highLimit == null) try { highLimit = algo.get('highLimit'); } catch (e) {}
  if (lowLimit == null) try { lowLimit = algo.get('lowLimit'); } catch (e) {}

  highLimit = parseFloat(highLimit);
  lowLimit = parseFloat(lowLimit);
  if (!isNaN(highLimit)) AppState.sensorData[sensorId].alarmHighLimit = highLimit;
  if (!isNaN(lowLimit)) AppState.sensorData[sensorId].alarmLowLimit = lowLimit;

  // Read limit enable flags
  var limitEnable = null;
  try { limitEnable = algo.getLimitEnable(); } catch (e) {}
  if (!limitEnable) try { limitEnable = algo.get('limitEnable'); } catch (e) {}

  if (limitEnable) {
    var highEn = null, lowEn = null;
    try { highEn = limitEnable.isHighLimitEnable(); } catch (e) {}
    try { lowEn = limitEnable.isLowLimitEnable(); } catch (e) {}
    // Multiple fallback attempts for different Niagara versions
    if (highEn == null) try { highEn = limitEnable.isHighLimitEnabled(); } catch (e) {}
    if (lowEn == null) try { lowEn = limitEnable.isLowLimitEnabled(); } catch (e) {}
    if (highEn == null) try { highEn = limitEnable.get('highLimitEnable'); } catch (e) {}
    if (lowEn == null) try { lowEn = limitEnable.get('lowLimitEnable'); } catch (e) {}

    AppState.sensorData[sensorId].alarmHighEnabled = !!highEn;
    AppState.sensorData[sensorId].alarmLowEnabled = !!lowEn;
  }
}
```

### Step 5: Subscribe to Alarm State Changes

```js
// js/dashboard.js — readAlarmExtension()
var extSlotPath = alarmExt.getSlotPath();
componentToSensorMap[extSlotPath] = { sensorId: sensorId, pointType: 'ALARM_STATE' };
subscriber.subscribe({ comps: alarmExt });
```

When the alarm state changes, the subscriber's `changed` callback handles it:

```js
// In the subscriber's changed handler:
if (info.pointType === 'ALARM_STATE') {
  var alarmStateVal;
  try { alarmStateVal = comp.getAlarmState(); } catch (e) { alarmStateVal = comp.get('alarmState'); }
  var stateStr = alarmStateVal ? alarmStateVal.toString().toLowerCase() : 'normal';
  if (stateStr.indexOf('high') !== -1) AppState.sensorData[id].alarmState = 'highLimit';
  else if (stateStr.indexOf('low') !== -1) AppState.sensorData[id].alarmState = 'lowLimit';
  else AppState.sensorData[id].alarmState = 'normal';
}
```

### Why the Multiple Fallback Attempts?

Niagara API method names vary between versions and modules:
- `getHighLimit()` vs `get('highLimit')`
- `isHighLimitEnable()` vs `isHighLimitEnabled()` vs `get('highLimitEnable')`

The defensive pattern of trying typed methods first, then falling back to generic `get()`, ensures compatibility across Niagara versions.

### Adding an Alarm Extension to a Point

If you need to **create** alarm extensions (not just read them), see `bajascriptExamples/Adding.md`:

```js
// bajascriptExamples/Adding.md
const ext = baja.$("alarm:AlarmSourceExt", {
  faultAlgorithm: baja.$("alarm:OutOfRangeFaultAlgorithm"),
  offnormalAlgorithm: baja.$("alarm:OutOfRangeAlgorithm")
});

ext.getOffnormalAlgorithm().setHighLimit(80);
ext.getOffnormalAlgorithm().setLowLimit(20);
ext.getOffnormalAlgorithm().getLimitEnable().setLowLimitEnable(true);
ext.getOffnormalAlgorithm().getLimitEnable().setHighLimitEnable(true);

point.add({
  slot: "alarmExt?",  // '?' guarantees a unique slot name
  value: ext
});
```

**Prerequisites**: You must import the types first:
```js
baja.importTypes(['alarm:AlarmSourceExt', 'alarm:OutOfRangeFaultAlgorithm', 'alarm:OutOfRangeAlgorithm']);
```

### Alarm Architecture Reference

```
BAlarmSourceExt (abstract, extends BPointExtension)
  └─ BOutOfRangeAlarmExt — high/low limit alarming for numeric points
       └─ Uses BOutOfRangeAlgorithm (offnormal) + OutOfRangeFaultAlgorithm (fault)

BAlarmClass — groups alarms with same routing/handling characteristics
  └─ Lives under BAlarmService
  └─ Properties: ackRequired, priority, escalation levels 1-3

BAlarmService — singleton service per station
  └─ Routes alarms between AlarmSources and AlarmRecipients
```

| Alarm Extension Property | Type | Purpose |
|--------------------------|------|---------|
| `alarmState` | BAlarmState | Current: normal, highLimit, lowLimit, fault |
| `timeDelay` | BRelTime | Min duration before alarming |
| `alarmEnable` | BAlarmTransitionBits | Which transitions generate alarms |
| `offnormalAlgorithm` | BOffnormalAlgorithm | Algorithm for out-of-range detection |
| `faultAlgorithm` | BFaultAlgorithm | Algorithm for fault detection |

| OutOfRangeAlgorithm Property | Type | Purpose |
|------------------------------|------|---------|
| `highLimit` | double | Upper alarm threshold |
| `lowLimit` | double | Lower alarm threshold |
| `deadband` | double | Hysteresis to prevent chatter |
| `limitEnable` | BLimitEnable | Enable/disable high and low limit checks |

See `bajascriptExamples/BOutOfRangeAlgorithm.md`, `bajascriptExamples/BAlarmSourceExt.md`, and `bajascriptExamples/BAlarmService.md` for the full Java source reference.

---

## 7. Configuring sensorConfig.js for New Points

The `sensorConfig.js` file is the central configuration that defines what the dashboard subscribes to. Understanding its structure is essential for adapting the dashboard to a new set of points.

### Structure

```js
var sensorGroups = [
  {
    groupId: 'string',           // Unique ID prefixed by type (e.g. 'mqtt_bld6')
    groupName: 'string',          // Display name for the group (e.g. 'Building 6 Sensors')
    basePath: 'string',          // Niagara ORD path to the sensor parent folder
    type: 'mqtt' | 'niagara',    // Data source type — determines history path format
    stationName: 'string',       // Niagara station name (used in history queries)
    tempPointName: 'string',     // Primary temperature point name ('TEMPERATURE' or 'EXTTEMP')
    points: ['string', ...],    // Child point names to subscribe to
    sensors: ['string', ...],   // Sensor names under basePath
    historyNameOverrides: {}    // Optional: map sensor name → history record name
  }
];
```

### Field-by-Field Guide

#### `groupId`
A unique identifier. The dashboard uses `{type}_{site}` as a convention:
```js
groupId: 'mqtt_bld6'      // MQTT-driven sensors in Building 6
groupId: 'niagara_ddl'    // Niagara Network sensors from DDL
groupId: 'waterleak_aec'  // Water leak sensors
```

This becomes part of the sensor's internal ID: `mqtt_bld6_BLD6_DOCK`.

#### `basePath`
The Niagara ORD path to the parent folder containing sensors. All sensors in the group must live under this path:

```js
// MQTT sensors
basePath: 'station:|slot:/Drivers/AbstractMqttDriverNetwork/FordHiveMQTT/points/TempHumSensors'

// Niagara Network sensors
basePath: 'station:|slot:/Drivers/NiagaraNetwork/RE_Center/Staff_Blds/STAFF_BLDG/points'
```

The full ORD for a sensor is `basePath + '/' + sensorName`.

#### `type`
Determines how history paths are constructed and how the sensor is categorized:

| Type | History Path Pattern | Example |
|------|---------------------|---------|
| `mqtt` | `FordWS/{sensorName}_{pointName}` | `FordWS/BLD6_DOCK_TEMPERATURE` |
| `niagara` | `{stationName}/{sensorName}_{pointName}` | `STAFF_BLDG/BLD1_SUBSTATION_TEMPERATURE` |
| `waterleak` | `FordWS/{sensorName}_{pointName}` | Same as mqtt |

#### `stationName`
The Niagara station name that owns the history records. Used in BQL history queries:

```js
// MQTT sensors all use FordWS
stationName: 'FordWS'

// Niagara Network sensors use their own station name
stationName: 'STAFF_BLDG'
```

#### `tempPointName`
The primary temperature point name. Most sensors use `TEMPERATURE`, but cooler/freezer sensors use `EXTTEMP`:

```js
tempPointName: 'TEMPERATURE'  // standard temp/humidity sensors
tempPointName: 'EXTTEMP'      // cooler/freezer external probes
```

This affects history path construction: `sensorName_EXTTEMP` instead of `sensorName_TEMPERATURE`.

#### `points`
The child point names under each sensor. These are the actual Niagara point components that hold the data:

```js
// Standard temp/humidity sensor
points: ['TEMPERATURE', 'HUMIDITY', 'BATTERY', 'RSSI', 'LAST_UPDATE']

// Niagara Network sensor (no humidity)
points: ['TEMPERATURE', 'BATTERY', 'RSSI', 'LAST_UPDATE']

// Water leak sensor
points: ['TOT_NO_WTR_LEAKS', 'LAST_LEAK_DUR', 'BATTERY', 'WATER_LEAK_STATUS', 'LAST_UPDATE', 'RSSI']
```

Each point becomes a separate ORD: `basePath/sensorName/POINT_NAME`.

#### `sensors`
The list of sensor component names under `basePath`:

```js
sensors: ['BLD6_DOCK', 'BLD6_EMPLOYEE_ENTR_1ST_FLR', 'BLD6_MAIN_ENTR_ROTUNDA']
```

#### `historyNameOverrides`
Optional. Maps sensor names to their actual history record names when they differ. Common scenario: cooler/freezer sensors store history under a different name than the sensor component name:

```js
historyNameOverrides: {
  'FXC_COOLER_1': 'FXC_COOLER_1_EXTTEMP',  // history is stored as EXTTEMP variant
  'FXC_MN_FREEZER': 'FXC_MN_FREEZER_EXTTEMP'
}
```

### Adding a New Sensor Group

To add sensors from a new building or system:

```js
{
  groupId: 'mqtt_newsite',
  groupName: 'New Site Sensors',
  basePath: 'station:|slot:/Drivers/AbstractMqttDriverNetwork/FordHiveMQTT/points/TempHumSensors',
  type: 'mqtt',
  stationName: 'FordWS',
  tempPointName: 'TEMPERATURE',
  points: ['TEMPERATURE', 'HUMIDITY', 'BATTERY', 'RSSI', 'LAST_UPDATE'],
  sensors: [
    'NEWSITE_LOBBY',
    'NEWSITE_SERVER_ROOM',
    'NEWSITE_ROOFTOP_UNIT_1'
  ]
}
```

**Steps to verify the ORD path**:
1. Open Niagara Workbench
2. Navigate to the component in the station tree
3. Right-click → Copy Ord
4. Verify the path starts with `station:|slot:/`
5. Test resolution: `baja.Ord.make('your:ord:path').get().then(c => console.log(c.toPathString()))`

---

## 8. Adapting for New Point Types

If your new dashboard monitors different point types (e.g. pressure, CO2, occupancy), you need to adapt several parts of the code.

### Step 1: Define Your Points in sensorConfig.js

```js
{
  groupId: 'mqtt_iaq',
  groupName: 'Indoor Air Quality',
  basePath: 'station:|slot:/Drivers/AbstractMqttDriverNetwork/FordHiveMQTT/points/IAQSensors',
  type: 'mqtt',
  stationName: 'FordWS',
  tempPointName: 'CO2',  // or whatever your primary point is
  points: ['CO2', 'PM25', 'VOC', 'TEMPERATURE', 'BATTERY', 'RSSI', 'LAST_UPDATE'],
  sensors: ['BLD6_OPEN_OFFICE_3A', 'BLD6_CONF_RM_301']
}
```

### Step 2: Extend AppState.sensorData

Add fields for your new point types:

```js
AppState.sensorData[sensorId] = {
  // ... existing fields
  co2: NaN,
  pm25: NaN,
  voc: NaN,
  // Add validation thresholds for new types
};
```

### Step 3: Add Validation Functions

Follow the existing pattern in `js/dashboard.js`:

```js
var CO2_MIN = 0, CO2_MAX = 5000;
var PM25_MIN = 0, PM25_MAX = 500;

function validateCO2(val) {
  if (isNaN(val)) return { value: val, warning: true };
  if (val < CO2_MIN || val > CO2_MAX) return { value: val, warning: true };
  return { value: val, warning: false };
}
```

### Step 4: Handle New Point Types in the Subscriber

Add routing for new point types in the subscriber's `changed` handler:

```js
subscriber.attach({
  changed: function(prop, cx) {
    var comp = this;
    var propName = prop.getName();
    if (propName !== 'out' && propName !== 'alarmState') return;
    var slotPath = comp.getSlotPath();

    if (componentToSensorMap[slotPath]) {
      var info = componentToSensorMap[slotPath];
      var id = info.sensorId;
      var val = parseFloat(comp.get('out').toString());

      // Add your new point types here
      if (info.pointType === 'CO2') {
        var result = validateCO2(val);
        AppState.sensorData[id].co2 = result.value;
        AppState.sensorData[id].co2Warning = result.warning;
      }
      else if (info.pointType === 'PM25') {
        AppState.sensorData[id].pm25 = val;
      }
      else if (info.pointType === 'VOC') {
        AppState.sensorData[id].voc = val;
      }
      // ... existing point types
    }
  }
});
```

### Step 5: Read Initial Values During BatchResolve

Add new point types to the initial value reading loop:

```js
if (info.pointType === 'CO2') {
  AppState.sensorData[id].co2 = value;
  readAlarmExtension(point, id);  // if you want alarm limits
}
```

### Step 6: Update the Rendering

Add columns for new point types in the table renderer and update `renderHelpers.js` for any new status displays:

```js
// Add new table columns
'<th style="width:9%">CO2</th>' +
'<th style="width:9%">PM2.5</th>' +

// Render values
'<td data-label="CO2">' + co2Display + '</td>' +
'<td data-label="PM2.5">' + pm25Display + '</td>' +
```

### Step 7: Update History Queries

If your new point types have their own history extensions, update the history path construction in `js/history.js`:

```js
if (s.type === 'mqtt') {
  historyPath = 'FordWS/' + nameToUse + '_' + s.tempPointName;
  // For CO2 history: 'FordWS/NEWSITE_OPEN_OFFICE_CO2'
}
```

You may need to support querying multiple history points per sensor. One approach:

```js
// Query CO2 history
var co2HistoryPath = 'FordWS/' + nameToUse + '_CO2';
var tempHistoryPath = 'FordWS/' + nameToUse + '_TEMPERATURE';
// Fetch both and combine in the chart
```

### Reading Component Tags for Coordinates

The dashboard reads lat/lng coordinates from Niagara component tags (not from the config file). If your points have coordinate tags:

```js
// js/dashboard.js — tag reading pattern
var tags = await point.tags();
var latitudeTag = new baja.Id('my:latitude');
var longitudeTag = new baja.Id('my:longitude');
var latVal = tags.get(latitudeTag);
var lngVal = tags.get(longitudeTag);

if (latVal != null && lngVal != null) {
  AppState.sensorData[id].lat = parseFloat(latVal.toString());
  AppState.sensorData[id].lng = parseFloat(lngVal.toString());
}
```

Tags are set in Niagara Workbench on each point component. The `my:latitude` and `my:longitude` tag namespace is a convention — adjust to match your Niagara configuration.

---

## 9. Common Pitfalls

### Forgetting to Import Types Before Using Them

```js
// WRONG: This throws because alarm:OutOfRangeAlgorithm is not imported
var algo = baja.$("alarm:OutOfRangeAlgorithm");

// CORRECT: Import first
await baja.importTypes(['alarm:OutOfRangeAlgorithm']);
var algo = baja.$("alarm:OutOfRangeAlgorithm");
```

### Not Passing the Subscriber to BatchResolve

```js
// WRONG: Components resolve but you never get live updates
var br = await baja.BatchResolve.resolve({ ords: allPointOrds, lease: true });
// No subscriber = no push updates

// CORRECT: Pass the subscriber
var br = await baja.BatchResolve.resolve({
  ords: allPointOrds,
  lease: true,
  subscriber: subscriber  // <-- enables live updates
});
```

### Using the Wrong ORD Path Format

```js
// WRONG: Missing 'station:|' prefix or 'slot:' separator
baja.Ord.make('/Drivers/AbstractMqttDriverNetwork/...')

// CORRECT: Full ORD path
baja.Ord.make('station:|slot:/Drivers/AbstractMqttDriverNetwork/...')
```

### Not Cleaning Up Subscribers

```js
// WRONG: Memory leak — subscriber keeps firing after page is closed
// (nothing)

// CORRECT: Clean up on page unload
window.addEventListener('beforeunload', function() {
  subscriber.unsubscribeAll();
});
```

### Reading Alarm Limits from Sub-Proxies

```js
// WRONG: alarmExt.getOffnormalAlgorithm() returns BOffnormalAlgorithm proxy
// which lacks getHighLimit() and getLowLimit()
var algo = alarmExt.getOffnormalAlgorithm();
var high = algo.getHighLimit();  // THROWS: method doesn't exist on base type

// CORRECT: Resolve the offnormalAlgorithm component via its own ORD path
var offnormalAlgOrd = pointOrd + '/' + extName + '/offnormalAlgorithm';
var br = await baja.BatchResolve.resolve({ ords: [offnormalAlgOrd], lease: true });
var algo = br.get(0);  // properly typed as BOutOfRangeAlgorithm
var high = algo.getHighLimit();  // works!
```

### Forgetting BQL Column Name Escaping

```js
// WRONG: count(*) is not a valid BajaScript identifier
recordCount = rec.getValueOf('count(*)');

// CORRECT: Escape special characters
recordCount = rec.getValueOf('count$28toString$29');
// Or use the helper
var escaped = escapeString('count(*)');  // → 'count$28toString$29'
```

### Not Handling the DD-MM-YYYY Date Format

Sensor timestamps use a non-standard format that JavaScript's `Date` constructor can't parse:

```js
// WRONG: JavaScript can't parse "05-01-2026 14:30:00" (DD-MM-YYYY)
var date = new Date('05-01-2026 14:30:00');  // parsed as MM-DD-YYYY!

// CORRECT: Use the custom parser
function parseCustomDate(str) {
  var parts = str.trim().split(' ');
  var d = parts[0].split('-');  // [DD, MM, YYYY]
  var t = parts[1].split(':');  // [HH, MM, SS]
  return new Date(d[2], d[1] - 1, d[0], t[0], t[1], t[2]);
}
```

### Battery Values Are Raw ADC, Not Percentage

```js
// WRONG: Treating raw ADC value as percentage
var batteryPct = point.get('out');  // e.g. 3100 — not a percentage!

// CORRECT: Convert from ADC range (2400-3600) to percentage
var rawVal = parseFloat(point.get('out').toString());
var pct = Math.min(100, Math.max(0, ((rawVal - 2400) / 1200) * 100));
```

### Missing `bajaRequire` vs `require`

If your code runs inside a Niagara station's web page (like the SensorDashboard), use `bajaRequire()` not bare `require()`:

```js
// For station-served pages (SensorDashboard)
bajaRequire(['baja!', 'jquery'], function(baja, $) { ... });

// For Niagara module pages (BajaScriptExamples)
require(['baja!', 'dialogs'], function(baja, dialogs) { ... });
```

---

## Quick Reference: bajascriptExamples/ File Index

| File | Covers | When to Reference |
|------|--------|-------------------|
| `GettingStarted.md` | Basic require() pattern, BajaScript version | First BajaScript hello-world |
| `Subscription.md` | Subscriber + changed callback, lease pattern | Setting up live subscriptions |
| `BatchResolve.md` | BatchResolve for multi-ord resolution | Efficient bulk resolution |
| `Querying.md` | BQL queries with cursor pattern | History and table data queries |
| `Objects.md` | BajaScript type system (Double, RelTime, Facets, etc.) | Working with Niagara values |
| `Setting.md` | Setting component properties, lease/leaseTime | Writing values back to Niagara |
| `Events.md` | Full list of subscriber events | Advanced event handling |
| `Adding.md` | Adding alarm extensions to points | Creating alarm configurations |
| `Removing.md` | Removing components | Cleaning up Niagara tree |
| `Renaming.md` | Renaming components | Component management |
| `Reordering.md` | Reordering slots | Component tree management |
| `InvokeAnAction.md` | Invoking Niagara actions (override, set) | Triggering point overrides |
| `RPC.md` | Remote procedure calls to Java methods | Custom server-side logic |
| `Batching.md` | Manual network call batching (legacy) | Write-heavy operations |
| `BAlarmClass.md` | Alarm routing + escalation Java source | Understanding alarm class config |
| `BAlarmService.md` | Singleton alarm service Java source | Alarm service architecture |
| `BAlarmSourceExt.md` | Alarm detection algorithm Java source | Alarm extension internals |
| `BOutOfRangeAlgorithm.md` | High/low limit algorithm Java source | Understanding limit logic |
| `OffnormalAlgorithm.md` | Offnormal algorithm flow diagram | Alarm transition flow |
| `OutOfRangeAlarmExt_Slot_Sheet.md` | OutOfRangeAlarmExt slot definitions | Complete property reference |
| `ComponentsTreeStructure.md` | Niagara component tree structure | Understanding station layout |
| `NF23-Developer-Niagara-JS.md/pdf` | Niagara developer JS documentation | Comprehensive BajaScript reference |