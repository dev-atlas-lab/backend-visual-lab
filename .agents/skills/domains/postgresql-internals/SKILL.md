---
name: postgresql-internals
description: >-
  Provides authoritative technical knowledge on PostgreSQL internals (8 KB page layout,
  Heap Tuples, CTID, B-Tree index pages, Sequential vs Index vs Bitmap Scan, MVCC
  xmin/xmax/txid snapshots, Isolation Levels, SSI, Locks, Deadlocks, WAL). Activate this
  skill when researching, designing, implementing, or reviewing Database labs.
---

# PostgreSQL Internals Skill

## 1. Clear Purpose
Guarantee engine-level technical accuracy for all PostgreSQL and Database learning modules, visualizations (B-Tree traversal, Sequential vs. Index Scan, MVCC tuple visibility, WAL durability, Lock queues), and assessments.

## 2. When to Use It
- Designing or implementing PostgreSQL interactive visualizations (`frontend/src/engines/simulation/postgres*`) or live `EXPLAIN` / MVCC sandbox endpoints (`backend/src/main/java/com/devatlaslab/bvl/database/`).
- Reviewing technical accuracy of SQL execution pipelines, index access paths, transaction isolation, or concurrency control content.

## 3. Required Technical Knowledge
- **Storage & 8 KB Slotted Page Layout**:
  - Tables (Heaps) and Indexes are stored as arrays of **8 KB (`8192` bytes) pages/blocks**.
  - Each heap page contains a `PageHeaderData` (24 bytes, including `pd_lsn`, `pd_lower`, `pd_upper`), an array of **Line Pointers (`ItemIdData`, 4 bytes each)** growing downward from `pd_lower`, and **Heap Tuples (`HeapTupleHeaderData` + user data)** growing upward from `pd_upper`.
  - Every physical tuple version is addressed by its **CTID `(block_number, item_offset)`**, e.g., `(0, 1)`.
- **MVCC (Multi-Version Concurrency Control) & Tuple Visibility**:
  - In PostgreSQL, `UPDATE` does **not** overwrite in-place or write old versions to a separate rollback segment (unlike Oracle/MySQL InnoDB). Instead, `UPDATE` marks the existing tuple's `t_xmax` with the updating XID and inserts a **new physical tuple version** (`new CTID`) with `t_xmin = current_xid` (using **HOT — Heap-Only Tuple** optimization if no indexed columns changed and space exists on the same 8 KB page).
  - Tuple header fields: `t_xmin` (inserting XID), `t_xmax` (deleting/updating XID or `0`), `t_cid` (command ID within transaction), `t_ctid` (points to self or newer version in update chain), and `t_infomask` hint bits (`HEAP_XMIN_COMMITTED`, `HEAP_XMAX_INVALID`).
  - Transaction Snapshot (`xmin:xmax:xip_list`):
    - `READ COMMITTED` takes a **new snapshot at the start of each SQL statement**.
    - `REPEATABLE READ` and `SERIALIZABLE` take a **single snapshot at the first non-transaction-control statement** of the transaction.
- **B-Tree Index (`nbtree` — Lehman & Yao High-Concurrency B-Tree)**:
  - Meta page (block 0) $\rightarrow$ Root / Internal pages (downlinks to child block numbers + separator keys) $\rightarrow$ Doubly-linked Leaf pages containing `(key, CTID)` index tuples (plus high key on non-rightmost pages).
  - **Access Paths**:
    - `Seq Scan`: Reads all heap pages sequentially ($0..B-1$). Wins when selectivity is high (returning a large fraction of pages) due to sequential I/O vs random page fetches.
    - `Index Scan`: Walks B-Tree to leaf, fetches matching `CTID`s one-by-one from heap pages to check MVCC visibility (`t_xmin`/`t_xmax`).
    - `Index-Only Scan`: Consults the **Visibility Map (VM)** bit (`all_visible` per heap page); if set, returns key directly from index leaf without visiting the heap page!
    - `Bitmap Index Scan` + `Bitmap Heap Scan`: Builds an in-memory bitmap of matching heap pages/tuples, sorts by physical block number to turn random I/O into sequential-like I/O, and supports combining multiple indexes via `BitmapAnd` / `BitmapOr`.
- **WAL (Write-Ahead Logging) & Checkpoints**:
  - Changes to shared buffers generate XLOG records with monotonic **LSN (Log Sequence Number)** flushed to disk on `COMMIT` (`synchronous_commit = on`). Data pages tracks `pd_lsn` to enforce the WAL rule: log record must reach disk before dirty data page is flushed.

## 4. Step-by-Step Workflow
1. **Model Exact Heap & B-Tree Page Structures in Visualizations**:
   - Represent B-Tree nodes with explicit block numbers, key ranges, and leaf `(key -> CTID)` pointers.
   - Represent Heap pages with block number, line pointers (`lp[1]`, `lp[2]`), and tuple headers (`xmin`, `xmax`, `ctid`, payload).
2. **Trace MVCC Visibility Step-by-Step**:
   - Given active transactions `Tx 100`, `Tx 101`, `Tx 102` and a reader snapshot, explicitly show why each tuple version on the heap page is `VISIBLE` or `INVISIBLE` (uncommitted `xmin`, committed `xmax` before snapshot, etc.).
3. **Compare Scan Costs Honestly**:
   - Show the page read counter (`shared hit` / `read` buffers) during `Seq Scan` vs `Index Scan` vs `Bitmap Heap Scan` vs `Index-Only Scan (with Visibility Map)`.

## 5. Engineering Constraints
- **Never Confuse PostgreSQL Heap MVCC with Undo-Log MVCC**: PostgreSQL stores multiple tuple versions directly in the heap pages (cleaned up later by `VACUUM` / HOT pruning), whereas MySQL InnoDB modifies clustered index rows in place and reconstructs older versions from an Undo Log.
- **PostgreSQL `REPEATABLE READ` Prevents Phantom Reads**: Note that while the ANSI SQL-92 standard permits Phantom Reads in `REPEATABLE READ`, PostgreSQL's snapshot isolation implementation prevents Phantom Reads even at `REPEATABLE READ` (and only allows Write Skew anomalies, which `SERIALIZABLE` SSI prevents).

## 6. Common Mistakes
- **Mistake 1**: Claiming an `Index Scan` in PostgreSQL never touches the table heap when all queried columns are in the index (it MUST touch the heap to check `xmin`/`xmax` MVCC visibility unless an `Index-Only Scan` sees the page marked `all_visible` in the Visibility Map).
- **Mistake 2**: Stating that an index is always faster than a `Seq Scan` regardless of selectivity or `random_page_cost`.
- **Mistake 3**: Forgetting that `UPDATE` in PostgreSQL writes a new tuple with a new `CTID`.

## 7. Validation Checklist
- [ ] Does the PostgreSQL visualizer display accurate `CTID (block, offset)`, `xmin`, `xmax`, and Visibility Map states?
- [ ] Does the B-Tree traversal show Root $\rightarrow$ Internal $\rightarrow$ Leaf $\rightarrow$ Heap Page (or Visibility Map shortcut)?
- [ ] Are PostgreSQL-specific isolation semantics (`READ COMMITTED` vs `REPEATABLE READ` snapshot timing) accurately explained?

## 8. References to Authoritative Documentation
- PostgreSQL 17 Official Documentation — Chapter 66: Database Page Layout: https://www.postgresql.org/docs/current/storage-page-layout.html
- PostgreSQL 17 Official Documentation — Chapter 13: Concurrency Control (MVCC & Isolation): https://www.postgresql.org/docs/current/mvcc.html
- PostgreSQL 17 Official Documentation — Chapter 64: B-Tree Index Implementation (`nbtree`): https://www.postgresql.org/docs/current/btree.html
- Hironobu Suzuki — *The Internals of PostgreSQL*: https://www.interdb.jp/pg/
