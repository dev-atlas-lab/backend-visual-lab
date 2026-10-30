# PostgreSQL Storage & MVCC Domain UX Specification
**Domain:** Databases & Storage Engines (`databases`)  
**Status:** COMPLETE (Phase 6)

---

## 1. Domain Mental Model & Physical Storage

PostgreSQL simulation models physical 8 KB slotted disk pages, tuple visibility, B-Tree index traversal, and MVCC snapshot isolation:
- **8 KB Slotted Page**: Page Header $\rightarrow$ ItemId array pointers $\rightarrow$ Physical Heap Tuples growing upward.
- **CTID Pointers**: `(block_number, offset_number)` uniquely addressing physical disk locations.
- **MVCC Visibility Rules**: Tuples have `xmin` (creating transaction ID) and `xmax` (deleting/updating transaction ID).
- **Index Scan vs Sequential Scan**: B-Tree root-to-leaf traversal fetching exact CTIDs vs full table scan.

---

## 2. Canvas & Visual Projections

### Lane 1: Query Execution Engine & Planner
- Query Planner mode: Sequential Scan vs B-Tree Index Scan vs Index-Only Scan.
- Disk blocks read counter and buffer cache hit ratio.

### Lane 2: 8 KB Slotted Page Physical Layout
- Slotted page item pointers (`ItemId[1]`, `ItemId[2]`, `ItemId[3]`).
- Heap Tuples displaying `CTID`, `xmin`, `xmax`, data payload, and Dead Tuple markers.

### Lane 3: MVCC Transaction Snapshot & Visibility
- Active Transaction IDs (`txid_current`).
- Snapshot isolation level (`READ COMMITTED` vs `REPEATABLE READ`).
- Visibility verdict indicator: `VISIBLE` vs `INVISIBLE (Snapshot Rule)`.

---

## 3. Interactive Fault Injection
- `Execute SELECT Query`: Runs query and visualizes traversal path.
- `Run UPDATE (Create Dead Tuple)`: Modifies row, allocates new physical CTID, and marks old tuple as dead with `xmax`.
- `Toggle Index Scan`: Switches planner execution between full table scan and B-Tree index scan.
