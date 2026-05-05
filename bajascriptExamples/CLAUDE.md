# BajaScript & Niagara Alarm Reference

This folder contains reference documentation and source code for BajaScript APIs and the Niagara alarm subsystem. Use it as a lookup when working on the SensorDashboard's Niagara integration (subscriptions, ord resolution, history queries, alarm extensions).

## BajaScript API Patterns

All BajaScript code runs inside `require(['baja!', ...], function(baja, ...) { })` blocks loaded by RequireJS from the Niagara station.

### Module Loading

```js
// Import baja + additional Niagara types
require(['baja!', 'baja!alarm:AlarmSourceExt,alarm:OutOfRangeAlgorithm', 'dialogs'],
  function(baja, types, dialogs) { });
```

Types can be imported via the `baja!` plugin in require() or dynamically with `baja.importTypes()`.

### Ord Resolution

```js
// Single ord
baja.Ord.make('station:|slot:/path/to/Component').get({ subscriber: sub })
  .then((component) => { })
  .catch((err) => baja.error(err));

// Batch resolve — minimal network calls
const resolve = new baja.BatchResolve(['station:|slot:/path/A', 'station:|slot:/path/B']);
resolve.resolve({ each: function() { /* this = resolved component */ } })
  .then(() => { })
  .catch((err) => baja.error(err));
```

### Subscriptions (Real-time Data)

```js
const sub = new baja.Subscriber();
sub.attach('changed', function(prop) {
  if (prop.getName() === 'out') { update(this); }
});

baja.Ord.make('station:|slot:/path').get({ subscriber: sub })
  .then((comp) => { /* initial read */ })
  .catch((err) => baja.error(err));

// Cleanup
sub.unsubscribeAll();
sub.detach();
```

### Available Subscriber Events

`changed`, `added`, `removed`, `renamed`, `reordered`, `topicFired`, `flagsChanged`, `facetsChanged`, `subscribed`, `unsubscribed`, `unmount`, `componentRenamed`, `componentFlagsChanged`, `componentFacetsChanged`, `componentReordered`

### Leasing (Temporary Subscription)

```js
baja.Ord.make('station:|slot:/path').get({
  lease: true,
  leaseTime: baja.RelTime.make({ minutes: 1 })
});
```

### BQL Queries (History & Table Data)

```js
baja.Ord.make("station:|slot:/|bql:select toPathString from baja:Component")
  .get({
    cursor: {
      before: function() { },
      each: function() { /* this = current row */ },
      after: function() { },
      limit: 15,
      offset: 0
    }
  })
  .then((result) => {
    result.getColumns().forEach((c) => { });
  })
  .catch((err) => baja.error(err));
```

History paths follow: `history:/stationName/sensorName_pointName?period=timePeriod`

### Setting Properties

```js
point.getCountUp().setValue(true);  // returns Promise
```

### Adding Components (Alarm Extensions)

```js
const ext = baja.$("alarm:AlarmSourceExt", {
  faultAlgorithm: baja.$("alarm:OutOfRangeFaultAlgorithm"),
  offnormalAlgorithm: baja.$("alarm:OutOfRangeAlgorithm")
});

ext.getOffnormalAlgorithm().setHighLimit(80);
ext.getOffnormalAlgorithm().setLowLimit(20);
ext.getOffnormalAlgorithm().getLimitEnable().setLowLimitEnable(true);
ext.getOffnormalAlgorithm().getLimitEnable().setHighLimitEnable(true);

point.add({ slot: "alarmExt?", value: ext });
```

### BajaScript Object Types

- Primitives: `baja.Double.make()`, `baja.Integer.make()`, `baja.Float.make()`, `baja.Long.make()`, `baja.Boolean`
- Time: `baja.RelTime.make({ hours, minutes, seconds })`, `baja.AbsTime.now()`
- Facets: `baja.Facets.make({ key: value })`, `.encodeToString()`, `.decodeAsync(str)`
- Status: `baja.Status.make(baja.Status.DOWN | baja.Status.FAULT)`
- Enums: `baja.$("baja:Weekday").get("monday")`

## Niagara Alarm Architecture

### Class Hierarchy

```
BAlarmSourceExt (abstract, extends BPointExtension)
  └─ BOutOfRangeAlarmExt — high/low limit alarming for numeric points
       └─ Uses BOutOfRangeAlgorithm (offnormal) + OutOfRangeFaultAlgorithm (fault)

BAlarmClass — groups alarms with same routing/handling characteristics
  └─ Lives under BAlarmService
  └─ Properties: ackRequired, priority, escalation levels 1-3

BAlarmService — singleton service per station
  └─ Routes alarms between AlarmSources and AlarmRecipients
  └─ Manages alarm database, escalation timers, coalescing
```

### BAlarmSourceExt Key Properties

| Property | Type | Purpose |
|----------|------|---------|
| alarmInhibit | BStatusBoolean | Suppresses alarm generation |
| inhibitTime | BRelTime | Delay after inhibit lifts |
| alarmState | BAlarmState | Current: normal, highLimit, lowLimit, fault |
| timeDelay | BRelTime | Min duration before alarming |
| timeDelayToNormal | BRelTime | Min duration before returning to normal |
| alarmEnable | BAlarmTransitionBits | Which transitions generate alarms |
| ackedTransitions | BAlarmTransitionBits | Tracks unacknowledged transitions |
| toOffnormalTimes | BAlarmTimestamps | Last offnormal event/ack/normal times + count |
| toFaultTimes | BAlarmTimestamps | Last fault event/ack/normal times + count |
| timeInCurrentState | BRelTime | Duration in current alarm state |
| sourceName | BFormat | Display name for alarm source |
| toFaultText / toOffnormalText / toNormalText | BFormat | Alarm message text |
| alarmClass | String | Name of BAlarmClass for routing (default: "defaultAlarmClass") |
| offnormalAlgorithm | BOffnormalAlgorithm | Algorithm for out-of-range detection |
| faultAlgorithm | BFaultAlgorithm | Algorithm for fault detection |
| alarmInstructions | BAlarmInstructions | Response instructions |

### BOutOfRangeAlgorithm Key Properties

| Property | Type | Purpose |
|----------|------|---------|
| highLimit | double | Upper alarm threshold |
| lowLimit | double | Lower alarm threshold |
| deadband | double | Hysteresis to prevent chatter |
| limitEnable | BLimitEnable | Enable/disable high and low limit checks |
| highLimitText / lowLimitText | BFormat | Text for each limit alarm |

### Alarm State Transitions

```
normal → offnormal (highLimit or lowLimit exceeded, after timeDelay)
offnormal → normal (value returns within limits + deadband, after timeDelayToNormal)
normal → fault (fault condition detected)
fault → normal or offnormal (fault clears)
```

### BAlarmClass Key Properties

| Property | Type | Purpose |
|----------|------|---------|
| ackRequired | BAlarmTransitionBits | Which transitions require acknowledgement |
| priority | BAlarmPriorities | Priority per transition type |
| totalAlarmCount | int | Total alarms routed through this class |
| openAlarmCount | int | Currently open alarms |
| inAlarmCount | int | Currently in-alarm |
| unackedAlarmCount | int | Unacknowledged alarms |
| timeOfLastAlarm | BAbsTime | Timestamp of most recent alarm |
| escalationLevel1-3Enabled | boolean | Escalation tier toggles |
| escalationLevel1-3Delay | BRelTime | Delay before each escalation (5/15/30 min defaults) |

### BAlarmService Key Properties

| Property | Type | Purpose |
|----------|------|---------|
| alarmDbConfig | BAlarmDbConfig | Database configuration |
| defaultAlarmClass | BAlarmClass | Fallback when no class matches |
| masterAlarmInstructions | BAlarmInstructions | Instructions available to all alarm exts |
| escalationTimeTrigger | BTimeTrigger | How often escalation is checked (default: 1 min) |
| coalesceAlarms | boolean | Merge duplicate alarms (default: true) |

### Key Alarm Topics

- `BAlarmSourceExt.toOffnormal` — fired on offnormal transition
- `BAlarmSourceExt.toFault` — fired on fault transition
- `BAlarmSourceExt.toNormal` — fired on return to normal
- `BAlarmClass.alarm` — fired when alarm is routed to a class
- `BAlarmClass.escalatedAlarm1/2/3` — fired on escalation tiers
- `BAlarmService.alarm` — fired on any alarm received by service

### Reading Alarm Extension from BajaScript

For the SensorDashboard, alarm limits are read from the Niagara component tree:

```js
// Check if a point has an alarm extension
const slots = point.getSlots().is("alarm:AlarmSourceExt");
if (!slots.isEmpty()) {
  // Read offnormal algorithm limits
  const algo = point.getAlarmSourceExt().getOffnormalAlgorithm();
  const highLimit = algo.getHighLimit();
  const lowLimit = algo.getLowLimit();
  const highEnabled = algo.getLimitEnable().getHighLimitEnable();
  const lowEnabled = algo.getLimitEnable().getLowLimitEnable();
  const alarmState = point.getAlarmSourceExt().getAlarmState();
}
```

## Reference Documents in This Folder

| File | Content |
|------|---------|
| GettingStarted.md | BajaScript basics, require() pattern |
| Subscription.md | Subscriber + changed callback pattern |
| BatchResolve.md | BatchResolve for efficient multi-ord resolution |
| Querying.md | BQL queries with cursor pattern |
| Objects.md | BajaScript type system (Double, Integer, RelTime, etc.) |
| Setting.md | Setting component properties via Promises |
| Events.md | Full list of subscriber events |
| Adding.md | Adding alarm extensions to points |
| Removing.md | Removing components |
| Renaming.md | Renaming components |
| Reordering.md | Reordering slots |
| InvokeAnAction.md | Invoking Niagara actions |
| RPC.md | Remote procedure calls |
| Batching.md | Batching operations |
| aec_alarm_ext.md | AEC alarm extension description |
| BAlarmClass.md | BAlarmClass Java source (alarm routing + escalation) |
| BAlarmService.md | BAlarmService Java source (singleton alarm service) |
| BAlarmSourceExt.md | BAlarmSourceExt Java source (alarm detection algorithm) |
| BOutOfRangeAlgorithm.md | BOutOfRangeAlgorithm Java source (high/low limit algo) |
| OffnormalAlgorithm.md | Offnormal algorithm flow diagram description |
| OutOfRangeAlarmExt_Slot_Sheet.md | OutOfRangeAlarmExt slot definitions |
| ComponentsTreeStructure.md/png | Niagara component tree structure |
| NF23-Developer-Niagara-JS.md/pdf | Niagara developer documentation for JS |
| Chat.md | Chat/reference notes |