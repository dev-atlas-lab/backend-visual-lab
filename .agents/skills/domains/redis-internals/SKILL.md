---
name: redis-internals
description: >-
  Provides authoritative technical knowledge, internal data encodings, eviction/expiration
  mechanics, caching patterns, stampede mitigation, and distributed lock constraints for Redis.
  Activate this skill when researching, designing, implementing, or reviewing Caching & Redis labs.
---

# Redis Internals Skill

## 1. Clear Purpose
Ensure deep technical accuracy across all Redis and Caching learning modules, simulations (TTL expiration, eviction policies, Cache-Aside, Write-Through/Write-Behind, Cache Stampede, Distributed Locks), and assessments.

## 2. When to Use It
- Designing or implementing Redis interactive simulations (`frontend/src/engines/simulation/redis*`) or live Redis sandbox services (`backend/src/main/java/com/devatlaslab/bvl/caching/`).
- Auditing technical accuracy for caching architectures, TTL expiration internals, memory eviction, or Redlock / Lua distributed locks.

## 3. Required Technical Knowledge
- **Single-Threaded Event Loop & I/O Multiplexing**:
  - Command execution runs atomically on a single main event-loop thread (`aeEventLoop` using `epoll`/`kqueue`), while Redis 6/7 offloads socket read/write parsing and background `UNLINK` / AOF fsync (`bio_*`) to I/O and background threads.
- **Internal Object Encodings (`redisObject`)**:
  - Strings: `int`, `embstr` ($\le 44$ bytes in single allocation with `sdshdr`), `raw` (`SDS` — Simple Dynamic String with $O(1)$ `len` and `alloc`).
  - Lists: `listpack` (small lists) / `quicklist` (doubly linked list of `listpack` nodes).
  - Hashes & ZSets: `listpack` for small element counts/sizes; transitions to `hashtable` (`dict` with incremental rehashing across two tables `ht[0]`, `ht[1]`) or `skiplist` + `hashtable` for large ZSets.
- **Key Expiration (Passive vs. Active Probabilistic Sampling)**:
  - Redis does **not** set a separate OS timer per key. It combines:
    1. **Passive (Lazy) Expiration**: Checked when a client accesses the key (`expireIfNeeded`); if expired, purged immediately.
    2. **Active Expiration (`activeExpireCycle`)**: Runs periodically (`hz`, default 10 times/sec), sampling a small batch of keys with TTLs per database and repeating immediately if $>25\%$ of sampled keys are expired.
- **Memory Eviction (`maxmemory-policy`)**:
  - `noeviction`, `allkeys-lru`, `volatile-lru`, `allkeys-lfu`, `volatile-lfu`, `allkeys-random`, `volatile-random`, `volatile-ttl`.
  - Approximated LRU (24-bit clock in `redisObject.lru`, sampling `maxmemory-samples` default 5 keys) and Morris Counter LFU (16-bit logarithmic frequency counter + decay time).
- **Caching Patterns & Failure Modes**:
  - **Cache Stampede (Thundering Herd)**: Hot key expires under high concurrency $\rightarrow N$ workers simultaneously see cache miss and query the database. Mitigations: Singleflight / Mutex lock with backoff, Logical TTL with background refresh, or Probabilistic Early Expiration (XFetch algorithm).
  - **Cache Penetration** (non-existent keys bypassing cache $\rightarrow$ mitigate via Null-value short TTL or Bloom Filter) vs. **Cache Avalanche** (mass simultaneous key expiry $\rightarrow$ mitigate via TTL jitter).
  - **Single-Instance Distributed Lock**: `SET lock_key unique_token NX PX 30000` + atomic Lua check-and-delete script (`if redis.call("get",KEYS[1]) == ARGV[1] then return redis.call("del",KEYS[1]) else return 0 end`). Note Martin Kleppmann's fencing-token critique for safety vs. liveness locks.

## 4. Step-by-Step Workflow
1. **Model Exact Cache & DB Request Timelines**:
   - In Cache Stampede simulations, explicitly track concurrent in-flight requests (`R1..RN`), Redis key state (`HIT`, `MISS`, `EXPIRED`, `LOCKED_RECOMPUTING`), and Database active connection load (`dbActiveQueries` vs `dbMaxPoolSize`).
2. **Model Passive + Active Expiration Accurately**:
   - Show that an expired key still occupies Redis memory until either a client reads it (lazy deletion) or `activeExpireCycle` samples it, or `maxmemory` eviction reclaims it.
3. **Verify Distributed Lock Safety**:
   - Always include the unique owner `token` (`UUID`) and Lua release check in lock simulations; demonstrate how releasing by `DEL key` without token check causes Lock Stealing when Worker A experiences a GC pause longer than `PX` TTL.

## 5. Engineering Constraints
- **Never Claim Redis Uses Exact Linked-List LRU**: Always specify that Redis uses **approximated sampling LRU/LFU** (`maxmemory-samples`) to avoid 16-byte doubly-linked-list pointer overhead per key.
- **Distinguish Stampede, Penetration, and Avalanche**: Never conflate these three distinct failure modes in lessons or quiz distractors.

## 6. Common Mistakes
- **Mistake 1**: Recommending `SETNX` + `EXPIRE` as two separate commands instead of atomic `SET key token NX PX ms`.
- **Mistake 2**: Claiming `Write-Through` eliminates stale reads without mentioning the cost of synchronous write amplification on every mutation.
- **Mistake 3**: Ignoring the classic `Cache-Aside` race condition where a concurrent Read (cache miss $\rightarrow$ reads old DB value) finishes its `SET` *after* a concurrent Write (`UPDATE DB` $\rightarrow$ `DEL cache`).

## 7. Validation Checklist
- [ ] Does the Redis simulation accurately model Cache Hit, Cache Miss, TTL Countdown, Stampede Surge, and Lock-Protected Recompute?
- [ ] Are passive vs. active expiration and approximated LRU/LFU explained accurately?
- [ ] Are distributed lock examples using atomic `SET ... NX PX` and Lua token verification?

## 8. References to Authoritative Documentation
- Redis Official Documentation — Memory Optimization & Eviction: https://redis.io/docs/latest/develop/reference/eviction/
- Redis Distributed Locks & Redlock Specification: https://redis.io/docs/latest/develop/use/patterns/distributed-locks/
- Martin Kleppmann — *How to do distributed locking* (Fencing Tokens): https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html
- Vattani et al. (VLDB 2015) — *Optimal Probabilistic Cache Stampede Prevention (XFetch)*: https://cseweb.ucsd.edu/~avattani/papers/cache_stampede.pdf
