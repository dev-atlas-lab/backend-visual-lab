# Redis Caching Domain UX Specification
**Domain:** Caching & Redis (`caching`)  
**Status:** COMPLETE (Phase 6)

---

## 1. Domain Mental Model & Cache Invalidation

Redis simulation models in-memory key expiration, cache-aside data retrieval, and the catastrophic failure mode of dogpile cache stampedes:
- **Cache-Aside Flow**: App checks Redis $\rightarrow$ on hit, returns immediately; on miss, reads DB $\rightarrow$ sets Redis with TTL.
- **Cache Stampede (Dogpile)**: When a high-traffic key expires, 100 concurrent requests miss simultaneously and flood the DB connection pool.
- **Distributed Mutex (SET NX PX)**: Enforces that exactly one thread acquires the lock lease and queries the database, while peer threads wait or serve stale data.

---

## 2. Canvas & Visual Projections

### Lane 1: Inbound HTTP Traffic
- QPS load indicator (e.g. 100 concurrent requests).
- Response latency sparkline (p99 ms).

### Lane 2: Redis In-Memory Keyspace & TTL
- Cached key representation: `user:profile:1001`.
- Real-time TTL countdown bar.
- Expiration mode: Passive on-access vs Active sampling.

### Lane 3: Database Connection Pool & Mutex Sentinel
- Connection pool occupancy gauge (0 to 50 connections).
- Pool exhaustion alert banner when connection limit is reached.
- Distributed lock lease token viewer (`SET NX PX`).

---

## 3. Interactive Fault Injection
- `Expire TTL (0ms)`: Instantly zeros out key TTL to simulate sudden key expiration.
- `Fire 100 Concurrent Requests`: Triggers high-concurrency read spike.
- `Strategy Switcher`: Naive Cache-Aside vs Distributed Mutex Lock vs Probabilistic Early Refresh.
