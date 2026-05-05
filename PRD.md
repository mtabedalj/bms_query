# PRD: DXD Explorer

## Problem Statement

Facility operators and engineers need to browse live point data and historical trends from a Niagara DXD station without opening Niagara Workbench. Currently, inspecting points requires either the full Workbench client or manually constructing BajaScript ORD paths. There is no lightweight, table-based tool that lets a user point at a folder in the station tree and immediately see all points, their live values, status, and history.

## Solution

DXD Explorer is a single-page web application served from the Niagara station's file system. It uses the station's native BajaScript API to dynamically discover points within a configured folder, display them in a sortable table with live-updating values, and provide one-click access to historical trend charts in a modal overlay.

The tool starts with a single folder (VisionMetering energy meters) and is designed to support multiple folders via configuration.

## User Stories

### Point Discovery & Display
1. As a facility engineer, I want to open DXD Explorer in my browser and immediately see all points in a configured folder, so that I don't need to launch Niagara Workbench to inspect points.
2. As a facility engineer, I want point names displayed in a readable format (underscores replaced with spaces), so that I can quickly identify which meter or sensor I'm looking at.
3. As a facility engineer, I want to see each point's current value alongside its engineering units, so that I know what the reading means without guessing.
4. As a facility engineer, I want to see the operational status of each point (normal, fault, down, stale), so that I can spot problematic points at a glance.
5. As an operator, I want the point table to be scannable with clearly separated columns, so that I can find a specific meter quickly.
6. As a developer adding new folders later, I want the tool to auto-detect whether points are direct children of the folder or nested one level deep under containers, so that I don't need to reconfigure the discovery logic per folder.

### Live Updates
7. As a facility engineer, I want point values in the table to update in real time as they change in the station, so that I always see the current state without refreshing the page.
8. As a facility engineer, I want the status column to update in real time when a point goes into alarm or fault, so that I can react to issues immediately.

### History
9. As a facility engineer, I want to click a "History" button on any point row and see a trend chart of that point's historical data, so that I can understand how the value has changed over time.
10. As a facility engineer, I want to select different time periods in the history modal (last 24 hours, last 7 days, last 30 days), so that I can zoom in on recent changes or see long-term trends.
11. As a facility engineer, I want the history chart to show the point's value over time as a line chart with properly formatted timestamps on the x-axis, so that the visualization is clear and interpretable.
12. As a facility engineer, I want the history modal to show the point name and current value at the top, so that I know exactly which point I'm viewing history for.
13. As a facility engineer, I want to close the history modal by clicking outside it or pressing Escape, so that I can return to the main table quickly.

### Configuration
14. As a system integrator, I want to configure which folders DXD Explorer monitors by editing a single JavaScript config file, so that I can add or remove folders without changing application logic.
15. As a system integrator, I want the config file to support an array of folder definitions (each with an ID, folder path, and display name), so that I can add new folders as the building expands without restructuring the config.
16. As a system integrator, I want each folder definition to support a custom base path prefix for history queries, so that points from different data sources (MQTT, Niagara Network) resolve their history correctly.

### Cross-Cutting
17. As a facility engineer, I want the page to load quickly even with dozens of points, so that I don't wait long for the initial view.
18. As a facility engineer, I want the tool to work in modern browsers (Chrome, Firefox, Edge), so that I can use it from any workstation.
19. As a station administrator, I want DXD Explorer to clean up its subscriptions when the browser tab is closed, so that it doesn't leave orphaned subscribers consuming station resources.

## Implementation Decisions

### Architecture
- **Runtime**: Inside the Niagara station's web container, using the BajaScript API loaded via `bajaRequire()`. This gives direct access to ORD resolution, batch resolve, subscriptions, and BQL queries without building an intermediate API layer.
- **Module structure**: Multi-file flat layout — `index.html`, `css/app.css`, `js/app.js`, `js/config.js`, `js/history.js`. Files stay under 400 lines each and are extracted into finer modules as they grow.
- **Dependencies**: jQuery (already available in the Niagara station context), Google Charts (for history trend visualization), plain CSS (no framework).

### Point Discovery
- Given a folder ORD from config, the tool resolves the folder component and enumerates its immediate child slots.
- For each child, it checks whether the child has its own children. If yes, treat it as a container and enumerate its children as points (2-level). If no, treat the child itself as a point (1-level, as with the VisionMetering folder).
- Each discovered point is described by: name, full ORD path, slot path (for subscription routing), and metadata (units, type).

### Subscription Management
- All discovered points are resolved in a single `baja.BatchResolve.resolve()` call with a shared `baja.Subscriber` instance, matching the pattern from DXD_QUERYING.md.
- A slotPath-to-point mapping is maintained so that the subscriber's `changed` callback can route updates to the correct table cell.
- On `beforeunload`, the subscriber calls `unsubscribeAll()` to release station resources.

### History Data
- History queries use the two-step BQL pattern from DXD_QUERYING.md: count records first, then fetch with a cursor using the discovered column schema.
- Column names are escaped using the `baja.SlotPath.escape()` pattern, with a special case for `count(*)` → `count$28toString$29`.
- The history path format is derived from the config: `{stationName}/{pointName}` for MQTT-type sources, or `{stationName}/{containerName}_{pointName}` for Niagara Network sources.
- Records are converted from BajaScript types (`baja:AbsTime` → JS Date, `baja:Double` → number) before returning to the rendering layer.

### History Modal
- Clicking a row's History button opens a modal overlay with a Google Charts LineChart.
- The modal includes a time period selector (last 24 hours, last 7 days, last 30 days).
- Chart uses datetime x-axis and numeric y-axis. Point name and time period are displayed as the chart title.
- Modal closes on outside click, Escape key, or a close button.

### Table Rendering
- Five columns: Point Name, Value, Units, Status, History (action button).
- Values and status columns are live-updated via the subscription callback.
- Status values are styled with color coding (green for normal, red for fault/alarm, yellow for stale/unknown).
- Point names have underscores replaced with spaces for readability.

### Config Schema
- The config is a JavaScript array of folder objects. Each object has:
  - `id` (string): unique identifier, used internally for namespacing
  - `folderPath` (string): full Niagara ORD path to the folder
  - `siteName` (string): human-readable display name for the folder/site
  - `stationName` (string, optional): Niagara station name for history queries (defaults to `'FordWS'`)

### Deployment
- Files are developed and tested locally (HTML/CSS/JS layout and logic don't require Niagara).
- Once working, files are copied to the Niagara station's file system (e.g., `shared/` directory) and served via the station's built-in web server.

## Testing Decisions

### What makes a good test
- Tests verify external behavior, not implementation details. For example, test that the point discovery function returns the correct array of point descriptors given a mocked folder response, without asserting on internal BajaScript call counts.
- For DOM-bound modules, tests verify the rendered HTML structure and data binding, not jQuery internal state.
- The BajaScript API (`baja`, `bajaRequire`) is mocked in tests since tests run outside Niagara.

### Modules to test
All modules are tested:

1. **Config** — validates schema, required fields, ORD path format
2. **Point Discovery** — given mocked child slots, verifies correct point list is produced for both 1-level and 2-level folder structures
3. **Subscription Manager** — verifies that BatchResolve is called with correct ORDs, slotPath mapping is built, and changed callbacks route to the right handler
4. **History Service** — verifies BQL query string construction for different point types and time periods, cursor result parsing
5. **History Modal** — verifies DOM structure of modal, chart container creation, time period selector wiring
6. **Table Renderer** — verifies table HTML generation, cell update on value change, status color coding

### Test framework
- Since the tool is a browser-based BajaScript app and tests run outside Niagara, use a lightweight test runner suitable for vanilla JS DOM testing.

## Out of Scope

- Recursive tree walking beyond 2 levels of nesting
- Writing values back to points (read-only tool)
- User authentication or access control
- Mobile-optimized responsive layout (desktop-first for v1)
- Alarm limit display in history charts (the SensorDashboard has this; can be added later)
- Exporting data to CSV/Excel
- Persistent user preferences (time period default, column ordering)
- Multi-station support (connecting to stations other than the one hosting the page)

## Further Notes

- The tool's primary audience is facility engineers and operators who already have browser access to the Niagara station but find Workbench too heavy for quick point inspection.
- The VisionMetering folder with its six energy meter points is the v1 target and validation case. Success means opening the page and seeing those six points with live values and working history charts.
- Incremental growth path after v1: add more folders → add alarm limits to charts → add point search/filter → add recursive tree browsing → add write capability.
- The name "DXD Explorer" was chosen to be descriptive and self-documenting for users familiar with Niagara terminology.
