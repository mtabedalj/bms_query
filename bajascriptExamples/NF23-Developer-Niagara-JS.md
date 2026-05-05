# NF23 Developer Guide - Niagara JS

*Converted from PDF: NF23-Developer-Niagara-JS.pdf*

## Introduction
This document provides the developer's guide for integrating Niagara systems with JavaScript using BajaScript.

## Core Concepts

### BajaScript
BajaScript is the JavaScript API that allows web applications to interact with the Niagara X platform. It provides a way to resolve components (ORDs), subscribe to real-time changes, and invoke actions.

### Resolving Components
To interact with a Niagara object, it must first be "resolved" using its ORD (Object Resolution Descriptor).
- **Baja.BatchResolve**: Used to resolve multiple ORDs in a single request for efficiency.
- **Leasing**: Resolved objects are leased. Leases must be managed to avoid memory leaks in the Niagara station.

### Subscriptions
Real-time updates are handled via subscriptions.
- When a property of a resolved component changes, a callback is triggered.
- This allows the UI to update instantly without polling.

### BQL (Baja Query Language)
BQL is used to query the Niagara database. It is similar to SQL but tailored for the Niagara object hierarchy.
- Example: `station:|slot:/Drivers/MqttDriver/SENSORS/S1/TEMPERATURE`

## Implementation Details

### Module Loading
The API uses AMD (Asynchronous Module Definition) and is typically loaded via RequireJS.

### Common Patterns
1. **Resolve**: Get the object from the station.
2. **Subscribe**: Listen for changes.
3. **Update UI**: Reflect the change in the browser.

## Best Practices
- **Batching**: Always use `BatchResolve` instead of multiple individual resolve calls.
- **Lease Management**: Ensure all resolved objects are released when no longer needed.
- **Error Handling**: Always wrap resolution and action calls in try-catch blocks to handle network or permission errors.