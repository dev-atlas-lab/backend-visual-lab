import type {
  SimulationEngineSpec,
  SimulationInvariantCheck,
  SimulationStepFrame,
} from "./types";

export interface HashMapNode {
  key: string;
  value: string;
  rawHashCode: number;
  spreadHash: number;
  bucketIndex: number;
}

export interface HashMapBucket {
  index: number;
  mode: "EMPTY" | "LINKED_LIST" | "RED_BLACK_TREE";
  nodes: HashMapNode[];
}

export interface JavaHashMapConfig {
  initialCapacity: number; // must be power of 2
  loadFactor: number; // default 0.75
  treeifyThreshold: number; // default 8
  minTreeifyCapacity: number; // default 64 (or 32 for lab simulation)
}

export interface JavaHashMapState {
  capacity: number;
  size: number;
  loadFactor: number;
  threshold: number;
  buckets: HashMapBucket[];
  treeifyThreshold: number;
  minTreeifyCapacity: number;
  totalCollisions: number;
  treeifiedBucketsCount: number;
  lastOperationDetails: {
    key: string;
    rawHashCode: number;
    spreadHash: number;
    targetIndex: number;
    collisionOccurred: boolean;
    treeified: boolean;
  } | null;
}

export type JavaHashMapCommand =
  | { type: "PUT"; key: string; value: string; customHashCode?: number }
  | { type: "BURST_COLLIDING_KEYS"; count: number; targetBucketIndex: number }
  | { type: "TRIGGER_RESIZE_DOUBLING" }
  | { type: "REMOVE"; key: string };

const defaultConfig: JavaHashMapConfig = {
  initialCapacity: 16,
  loadFactor: 0.75,
  treeifyThreshold: 8,
  minTreeifyCapacity: 32, // educational scaling
};

/**
 * OpenJDK perturbation spread function: (h ^ (h >>> 16))
 */
export function computeJavaHash(key: string, customRaw?: number): { raw: number; spread: number } {
  let h = 0;
  if (customRaw !== undefined) {
    h = customRaw;
  } else {
    for (let i = 0; i < key.length; i++) {
      h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
    }
  }
  const spread = (h ^ (h >>> 16)) >>> 0;
  return { raw: h, spread };
}

/**
 * OpenJDK bitwise index calculation: (capacity - 1) & hash
 */
export function computeBucketIndex(spreadHash: number, capacity: number): number {
  return (capacity - 1) & spreadHash;
}

function evaluateInvariants(state: JavaHashMapState): SimulationInvariantCheck[] {
  const isPowerOfTwo = (state.capacity & (state.capacity - 1)) === 0 && state.capacity > 0;
  const loadInvariant = state.threshold === Math.floor(state.capacity * state.loadFactor);
  const actualCount = state.buckets.reduce((acc, b) => acc + b.nodes.length, 0);
  const sizeMatches = actualCount === state.size;

  const treeCheck = state.buckets.every((b) => {
    if (b.nodes.length > state.treeifyThreshold && state.capacity >= state.minTreeifyCapacity) {
      return b.mode === "RED_BLACK_TREE";
    }
    return true;
  });

  return [
    {
      id: "power-of-two-capacity",
      label: "Power-of-Two Capacity Invariant",
      passed: isPowerOfTwo,
      detail: isPowerOfTwo
        ? `Table capacity (${state.capacity}) is strictly a power of two, enabling bitwise (n - 1) & hash indexing.`
        : `VIOLATION: Capacity ${state.capacity} is not a power of two!`,
    },
    {
      id: "hashmap-size-accounting",
      label: "Node Count & Size Field Consistency",
      passed: sizeMatches,
      detail: sizeMatches
        ? `HashMap size field (${state.size}) exactly matches total nodes across all buckets (${actualCount}).`
        : `MISMATCH: Size field is ${state.size} but actual nodes sum to ${actualCount}!`,
    },
    {
      id: "hashmap-threshold-boundary",
      label: "Load Factor Threshold (capacity * 0.75)",
      passed: loadInvariant,
      detail: `Resize threshold set to ${state.threshold} (${state.capacity} * ${state.loadFactor}).`,
    },
    {
      id: "treeification-integrity",
      label: "Red-Black Treeification Threshold Bounding (O(log n))",
      passed: treeCheck,
      detail: treeCheck
        ? `All buckets exceeding collision depth ${state.treeifyThreshold} converted to Red-Black Tree (O(log n) lookup).`
        : "Warning: Bucket exceeded 8 entries without treeification!",
    },
  ];
}

function createEmptyBuckets(capacity: number): HashMapBucket[] {
  return Array.from({ length: capacity }, (_, i) => ({
    index: i,
    mode: "EMPTY",
    nodes: [],
  }));
}

export const javaHashMapSimulation: SimulationEngineSpec<
  JavaHashMapConfig,
  JavaHashMapState,
  JavaHashMapCommand
> = {
  id: "java-hashmap-treeification",
  title: "Java HashMap Internals & Red-Black Treeification Simulator",
  fidelity: {
    mode: "deterministic-educational-model",
    realWorldReference:
      "OpenJDK java.util.HashMap Source Code (Java 8 to 21) — Hash Spreading, Treeification & Bitwise Resizing",
    accurateBehaviors: [
      "Perturbation function (h ^ (h >>> 16)) spreads high-order bits down to lower bits.",
      "Bucket index computed via bitwise AND: (n - 1) & hash rather than expensive modulo arithmetic.",
      "Hash collisions chained via Singly-Linked List tail-insertion (Java 8+).",
      "When a bucket exceeds TREEIFY_THRESHOLD (8 nodes) and capacity >= MIN_TREEIFY_CAPACITY, it transforms into a Red-Black Tree (TreeNode).",
      "When size > threshold (capacity * loadFactor), table capacity doubles (n << 1) and redistributes nodes via high-bit masking (hash & oldCap).",
    ],
    simplifications: [
      "MIN_TREEIFY_CAPACITY is set to 32 for visual interactivity (HotSpot uses 64).",
      "Red-Black Tree rotation and recoloring details are abstracted to balanced tree O(log n) semantics.",
    ],
    assumptions: [
      "Keys are standard Strings or supplied with custom test hash codes to demonstrate collision behavior.",
      "Single-threaded execution (no concurrency race condition modeled for standard non-thread-safe HashMap).",
    ],
    unsupportedEdgeCases: [
      "Keys that do not implement Comparable when converting to TreeNode.",
      "Untreeify threshold triggers (reverting tree to linked list when entries drop <= 6).",
    ],
  },
  presets: [
    {
      id: "uniform-hash-distribution",
      title: "1. Uniform Hash Distribution & Bitwise Indexing",
      badge: "Bitwise Indexing",
      description:
        "Observe distinct keys hashed and distributed into slots 0..15 via (capacity - 1) & hash.",
      config: defaultConfig,
      scriptedCommands: [
        { type: "PUT", key: "userId", value: "1001" },
        { type: "PUT", key: "orderId", value: "98765" },
        { type: "PUT", key: "tenantCode", value: "US_EAST" },
        { type: "PUT", key: "region", value: "us-east-1" },
        { type: "PUT", key: "currency", value: "USD" },
        { type: "PUT", key: "status", value: "PAID" },
      ],
    },
    {
      id: "hash-collision-treeification",
      title: "2. Collision Burst & Red-Black Treeification",
      badge: "Treeify Threshold 8",
      description:
        "Burst 9 keys hashing to the same slot #3. When chain depth reaches 8, HashMap converts the linked list to a Red-Black Tree.",
      config: { ...defaultConfig, minTreeifyCapacity: 16 },
      scriptedCommands: [
        { type: "BURST_COLLIDING_KEYS", count: 9, targetBucketIndex: 3 },
      ],
    },
    {
      id: "load-factor-resize-doubling",
      title: "3. Load Factor Exceeded (0.75) & Table Doubling",
      badge: "Resize x2",
      description:
        "When entry count exceeds threshold = 16 * 0.75 = 12, the table doubles to 32 slots and splits node chains.",
      config: defaultConfig,
      scriptedCommands: [
        { type: "PUT", key: "k1", value: "v1" },
        { type: "PUT", key: "k2", value: "v2" },
        { type: "PUT", key: "k3", value: "v3" },
        { type: "PUT", key: "k4", value: "v4" },
        { type: "PUT", key: "k5", value: "v5" },
        { type: "PUT", key: "k6", value: "v6" },
        { type: "PUT", key: "k7", value: "v7" },
        { type: "PUT", key: "k8", value: "v8" },
        { type: "PUT", key: "k9", value: "v9" },
        { type: "PUT", key: "k10", value: "v10" },
        { type: "PUT", key: "k11", value: "v11" },
        { type: "PUT", key: "k12", value: "v12" },
        { type: "PUT", key: "k13", value: "v13" }, // Trigger Resize!
      ],
    },
  ],

  createInitialFrame(config = defaultConfig): SimulationStepFrame<JavaHashMapState> {
    const initialState: JavaHashMapState = {
      capacity: config.initialCapacity,
      size: 0,
      loadFactor: config.loadFactor,
      threshold: Math.floor(config.initialCapacity * config.loadFactor),
      buckets: createEmptyBuckets(config.initialCapacity),
      treeifyThreshold: config.treeifyThreshold,
      minTreeifyCapacity: config.minTreeifyCapacity,
      totalCollisions: 0,
      treeifiedBucketsCount: 0,
      lastOperationDetails: null,
    };

    return {
      tick: 0,
      phase: "INITIALIZED",
      title: "Java HashMap Initialized Table Array",
      state: initialState,
      events: [
        {
          tick: 0,
          actor: "HashMap",
          action: "INIT_TABLE",
          detail: `Initialized Node<K,V>[] table with capacity = ${config.initialCapacity}, threshold = ${initialState.threshold} (loadFactor = ${config.loadFactor}).`,
          tone: "info",
        },
      ],
      invariants: evaluateInvariants(initialState),
      narration: {
        summary:
          "HashMap initialized table array with 16 buckets. Resize threshold established at 12 elements (16 * 0.75).",
        internalsNote:
          "In Java 8+, table initialization uses lazy allocation: Node<K,V>[] is instantiated in memory only upon the first put() invocation.",
      },
      metrics: {
        Capacity: config.initialCapacity,
        Size: 0,
        "Load Factor": config.loadFactor,
        Threshold: initialState.threshold,
        Collisions: 0,
        "Treeified Buckets": 0,
      },
    };
  },

  applyCommand(currentFrame, command) {
    const state: JavaHashMapState = JSON.parse(JSON.stringify(currentFrame.state));
    const nextTick = currentFrame.tick + 1;
    const events = [...currentFrame.events];
    let phase = "MUTATING";
    let title = "";
    let summary = "";
    let internalsNote = "";
    let productionWarning: string | undefined;

    switch (command.type) {
      case "PUT": {
        const { raw, spread } = computeJavaHash(command.key, command.customHashCode);
        const index = computeBucketIndex(spread, state.capacity);
        const bucket = state.buckets[index];

        const isCollision = bucket.nodes.length > 0;
        if (isCollision) {
          state.totalCollisions += 1;
        }

        const newNode: HashMapNode = {
          key: command.key,
          value: command.value,
          rawHashCode: raw,
          spreadHash: spread,
          bucketIndex: index,
        };

        bucket.nodes.push(newNode);
        state.size += 1;

        let treeified = false;
        if (
          bucket.nodes.length > state.treeifyThreshold &&
          state.capacity >= state.minTreeifyCapacity
        ) {
          if (bucket.mode !== "RED_BLACK_TREE") {
            bucket.mode = "RED_BLACK_TREE";
            state.treeifiedBucketsCount += 1;
            treeified = true;
            events.push({
              tick: nextTick,
              actor: "HashMap",
              action: "TREEIFY_BIN",
              detail: `Bucket #${index} reached ${bucket.nodes.length} nodes (threshold ${state.treeifyThreshold}) -> converted to Red-Black Tree (TreeNode)!`,
              tone: "warn",
            });
          }
        } else if (bucket.mode === "EMPTY") {
          bucket.mode = "LINKED_LIST";
        }

        state.lastOperationDetails = {
          key: command.key,
          rawHashCode: raw,
          spreadHash: spread,
          targetIndex: index,
          collisionOccurred: isCollision,
          treeified,
        };

        events.push({
          tick: nextTick,
          actor: "HashMap",
          action: "PUT_VAL",
          detail: `put("${command.key}", "${command.value}") -> hash: 0x${spread.toString(16)}, slot: [${index}] ${isCollision ? "(COLLISION)" : ""}`,
          tone: isCollision ? "warn" : "ok",
        });

        // Check Resize
        if (state.size > state.threshold) {
          events.push({
            tick: nextTick,
            actor: "HashMap",
            action: "THRESHOLD_EXCEEDED",
            detail: `Size (${state.size}) exceeded threshold (${state.threshold}). Triggering 2x table resize!`,
            tone: "info",
          });
          resizeHashMap(state, events, nextTick);
          productionWarning =
            "Table doubled capacity. In high-throughput systems, instantiating HashMap without sufficient initialCapacity causes CPU latency spikes due to repeated rehash iterations.";
        }

        phase = isCollision ? "COLLISION_RESOLVED" : "KEY_INSERTED";
        title = `Inserted Entry: put("${command.key}", "${command.value}")`;
        summary = `Calculated hash: hashCode() = ${raw} -> bitwise perturbation -> index = (${state.capacity} - 1) & hash = ${index}. ${isCollision ? `Collision detected at slot ${index}; node appended to chain.` : `Slot ${index} empty; node set as bucket head.`}`;
        internalsNote =
          "The perturbation function (h ^ (h >>> 16)) XORs the top 16 bits down to the lower 16 bits to reduce collisions when table capacity n is small.";
        break;
      }

      case "BURST_COLLIDING_KEYS": {
        const targetSlot = command.targetBucketIndex % state.capacity;
        const bucket = state.buckets[targetSlot];

        for (let i = 1; i <= command.count; i++) {
          const fakeKey = `collidingKey_${i}_slot${targetSlot}`;
          const fakeRaw = targetSlot + i * state.capacity * 4;
          const fakeSpread = fakeRaw;

          const newNode: HashMapNode = {
            key: fakeKey,
            value: `val_${i}`,
            rawHashCode: fakeRaw,
            spreadHash: fakeSpread,
            bucketIndex: targetSlot,
          };

          bucket.nodes.push(newNode);
          state.size += 1;
          state.totalCollisions += 1;
        }

        if (bucket.mode === "EMPTY") {
          bucket.mode = "LINKED_LIST";
        }

        let treeified = false;
        if (
          bucket.nodes.length > state.treeifyThreshold &&
          state.capacity >= state.minTreeifyCapacity
        ) {
          bucket.mode = "RED_BLACK_TREE";
          state.treeifiedBucketsCount += 1;
          treeified = true;
          events.push({
            tick: nextTick,
            actor: "HashMap",
            action: "TREEIFY_BIN",
            detail: `Collision burst at Bucket #${targetSlot} (${bucket.nodes.length} nodes) -> converted to Red-Black Tree to preserve O(log n) lookup.`,
            tone: "danger",
          });
        }

        state.lastOperationDetails = {
          key: `burst_batch_slot${targetSlot}`,
          rawHashCode: targetSlot,
          spreadHash: targetSlot,
          targetIndex: targetSlot,
          collisionOccurred: true,
          treeified,
        };

        phase = "TREEIFICATION_TRIGGERED";
        title = `Collision Burst of ${command.count} Keys at Slot #${targetSlot}`;
        summary = `Injected ${command.count} keys sharing the same bucket index into Bucket #${targetSlot}. Collision depth reached ${bucket.nodes.length}.`;
        internalsNote =
          "Prior to Java 8, Hash Collision DoS attacks degraded HashMap lookups into linked list O(n) traversals, causing 100% CPU lockups. Treeification caps worst-case search latency to O(log n).";
        break;
      }

      case "TRIGGER_RESIZE_DOUBLING": {
        resizeHashMap(state, events, nextTick);
        phase = "RESIZE_COMPLETED";
        title = `Table Resized 2x (Capacity: ${state.capacity})`;
        summary = `Table doubled to ${state.capacity} slots. Elements redistributed based on high-bit test (hash & oldCap).`;
        internalsNote =
          "In Java 8+, resize does not recompute hashCode(). Nodes either remain at their existing index (if bit at oldCap is 0) or move to (oldIndex + oldCap) (if bit is 1).";
        break;
      }

      case "REMOVE": {
        for (const b of state.buckets) {
          const idx = b.nodes.findIndex((n) => n.key === command.key);
          if (idx !== -1) {
            b.nodes.splice(idx, 1);
            state.size = Math.max(0, state.size - 1);
            if (b.nodes.length === 0) {
              b.mode = "EMPTY";
            }
            events.push({
              tick: nextTick,
              actor: "HashMap",
              action: "REMOVE_KEY",
              detail: `Removed key "${command.key}" from bucket #${b.index}`,
              tone: "info",
            });
            break;
          }
        }
        phase = "KEY_REMOVED";
        title = `Removed Entry: "${command.key}"`;
        summary = `Key "${command.key}" was located and removed from the hash table.`;
        internalsNote =
          "Upon node deletion, next pointers are updated. If the bucket is in Red-Black Tree mode, the tree self-balances.";
        break;
      }
    }

    const invariants = evaluateInvariants(state);

    return {
      tick: nextTick,
      phase,
      title,
      state,
      events,
      invariants,
      narration: {
        summary,
        internalsNote,
        productionWarning,
      },
      metrics: {
        Capacity: state.capacity,
        Size: state.size,
        "Load Factor": state.loadFactor,
        Threshold: state.threshold,
        Collisions: state.totalCollisions,
        "Treeified Buckets": state.treeifiedBucketsCount,
      },
    };
  },
};

function resizeHashMap(
  state: JavaHashMapState,
  events: SimulationStepFrame<JavaHashMapState>["events"],
  tick: number,
): void {
  const oldCap = state.capacity;
  const newCap = oldCap << 1;
  state.capacity = newCap;
  state.threshold = Math.floor(newCap * state.loadFactor);

  const newBuckets = createEmptyBuckets(newCap);

  // High-bit chain split algorithm (Java 8+)
  let splitCount = 0;
  for (const oldBucket of state.buckets) {
    for (const node of oldBucket.nodes) {
      const newIndex = computeBucketIndex(node.spreadHash, newCap);
      node.bucketIndex = newIndex;
      newBuckets[newIndex].nodes.push(node);
      if (newIndex !== oldBucket.index) {
        splitCount += 1;
      }
    }
  }

  for (const b of newBuckets) {
    if (b.nodes.length === 0) {
      b.mode = "EMPTY";
    } else if (b.nodes.length > state.treeifyThreshold && newCap >= state.minTreeifyCapacity) {
      b.mode = "RED_BLACK_TREE";
    } else {
      b.mode = "LINKED_LIST";
    }
  }

  state.buckets = newBuckets;
  state.treeifiedBucketsCount = newBuckets.filter((b) => b.mode === "RED_BLACK_TREE").length;

  events.push({
    tick,
    actor: "HashMap",
    action: "RESIZE_TABLE",
    detail: `Capacity doubled: ${oldCap} -> ${newCap}. Moved ${splitCount} nodes to upper half of the table (oldIndex + ${oldCap}).`,
    tone: "ok",
  });
}
