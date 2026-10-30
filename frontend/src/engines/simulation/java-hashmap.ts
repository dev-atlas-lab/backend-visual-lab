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

export interface JavaHashMapConfig {
  initialCapacity: number;
  loadFactor: number;
  treeifyThreshold: number;
  minTreeifyCapacity: number;
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
  minTreeifyCapacity: 32, // educational threshold for interactive workbench (real Java is 64)
};

export function computeJavaHash(key: string, customCode?: number): { raw: number; spread: number } {
  let h = 0;
  if (customCode !== undefined) {
    h = customCode;
  } else {
    for (let i = 0; i < key.length; i++) {
      h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
    }
  }
  // Perturbation function: (h ^ (h >>> 16))
  const spread = (h ^ (h >>> 16)) | 0;
  return { raw: h, spread };
}

export function computeBucketIndex(spreadHash: number, capacity: number): number {
  return (capacity - 1) & spreadHash;
}

function evaluateInvariants(state: JavaHashMapState): SimulationInvariantCheck[] {
  const isPowerOfTwo = (state.capacity & (state.capacity - 1)) === 0;

  let allKeysInCorrectSlot = true;
  for (const b of state.buckets) {
    for (const node of b.nodes) {
      const expectedSlot = computeBucketIndex(node.spreadHash, state.capacity);
      if (expectedSlot !== b.index) {
        allKeysInCorrectSlot = false;
      }
    }
  }

  const treeCheck = state.buckets.every((b) => {
    if (b.nodes.length > state.treeifyThreshold && state.capacity >= state.minTreeifyCapacity) {
      return b.mode === "RED_BLACK_TREE";
    }
    return true;
  });

  return [
    {
      id: "power-of-two-capacity",
      label: "Power-of-Two Table Capacity ((n & (n - 1)) == 0)",
      passed: isPowerOfTwo,
      detail: isPowerOfTwo
        ? `Capacity = ${state.capacity} là lũy thừa của 2, cho phép thay thế phép chia % bằng phép bitwise AND ((n - 1) & hash) với tốc độ nano giây.`
        : "Vi phạm: Dung lượng bảng không phải lũy thừa của 2!",
    },
    {
      id: "bucket-indexing-correctness",
      label: "Slot Indexing Integrity ((capacity - 1) & spreadHash)",
      passed: allKeysInCorrectSlot,
      detail: allKeysInCorrectSlot
        ? "Mọi Node trong tất cả các bucket đều nằm chính xác tại vị trí băm tính toán."
        : "Lỗi bất biến: Phát hiện phần tử nằm sai slot trong mảng table!",
    },
    {
      id: "treeification-integrity",
      label: "Treeification Threshold Guarantee (KIP/JEP Treeify >= 8)",
      passed: treeCheck,
      detail: treeCheck
        ? `Các bucket có độ sâu va chạm > ${state.treeifyThreshold} đã được chuyển đổi thành Red-Black Tree (O(log n) lookup).`
        : "Cảnh báo: Bucket vượt ngưỡng 8 phần tử nhưng chưa được treeify!",
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
      "Hàm băm perturbation (h ^ (h >>> 16)) phân tán các bit bậc cao xuống bậc thấp.",
      "Vị trí bucket được tính bằng phép bitwise AND: (n - 1) & hash thay vì phép chia modulo % đắt đỏ.",
      "Va chạm băm giải quyết bằng Singly-Linked List node nối đuôi (tail-insertion trong Java 8+).",
      "Khi một bucket vượt quá TREEIFY_THRESHOLD (8 nodes) và dung lượng bảng >= MIN_TREEIFY_CAPACITY, bucket chuyển hóa thành Red-Black Tree (TreeNode).",
      "Khi size > threshold (capacity * loadFactor), mảng table tăng gấp đôi (n << 1) và phân bổ lại node theo bit kiểm tra (hash & oldCap).",
    ],
    simplifications: [
      "Ngưỡng MIN_TREEIFY_CAPACITY được đặt thành 32 cho mô hình tương tác trực quan (trong HotSpot thực tế là 64).",
      "Các thao tác xoay cây Red-Black (left/right rotate, recoloring) được trừu tượng hóa thành cấu trúc cây cân bằng O(log n).",
    ],
    assumptions: [
      "Các key là chuỗi String có hashCode() xác định hoặc được cấp mã hash tùy biến để kiểm thử va chạm.",
      "Môi trường đơn luồng (không có race condition như HashMap trong multi-threaded context).",
    ],
    unsupportedEdgeCases: [
      "Keys không implement Comparable interface khi chuyển đổi sang TreeNode.",
      "Untreeify khi số lượng phần tử giảm xuống dưới UNTREEIFY_THRESHOLD (6) do thao tác xóa hàng loạt.",
    ],
  },
  presets: [
    {
      id: "uniform-hash-distribution",
      title: "Phân bổ Băm Đồng đều & Phép Bitwise Indexing",
      badge: "Bitwise Indexing",
      descriptionVi:
        "Quan sát các key khác nhau được băm phân tán ngẫu nhiên vào các slot 0..15 thông qua (capacity - 1) & hash.",
      config: defaultConfig,
      scriptedCommands: [
        { type: "PUT", key: "userId", value: "1001" },
        { type: "PUT", key: "orderId", value: "98765" },
        { type: "PUT", key: "tenantCode", value: "VN_CORP" },
        { type: "PUT", key: "region", value: "ap-southeast-1" },
        { type: "PUT", key: "currency", value: "VND" },
        { type: "PUT", key: "status", value: "PAID" },
      ],
    },
    {
      id: "hash-collision-treeification",
      title: "Bão Va chạm Băm & Chuyển hóa Red-Black Tree",
      badge: "Treeify Threshold 8",
      descriptionVi:
        "Tập hợp 9 keys cùng băm về slot #3. Khi chuỗi Node đạt độ sâu 8, HashMap tự động biến đổi danh sách liên kết thành Red-Black Tree O(log n).",
      config: { ...defaultConfig, minTreeifyCapacity: 16 },
      scriptedCommands: [
        { type: "BURST_COLLIDING_KEYS", count: 9, targetBucketIndex: 3 },
      ],
    },
    {
      id: "load-factor-resize-doubling",
      title: "Vượt Ngưỡng Tải (Load Factor 0.75) & Nhân Đôi Bảng",
      badge: "Resize x2",
      descriptionVi:
        "Khi số lượng phần tử vượt quá threshold = 16 * 0.75 = 12, bảng table tăng gấp đôi lên 32 slots và chia đôi các chuỗi node.",
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
      title: "Java HashMap Khởi tạo Mảng Table",
      state: initialState,
      events: [
        {
          tick: 0,
          actor: "HashMap",
          action: "INIT_TABLE",
          detail: `Khởi tạo table Node<K,V>[] với capacity = ${config.initialCapacity}, threshold = ${initialState.threshold} (loadFactor = ${config.loadFactor}).`,
          tone: "info",
        },
      ],
      invariants: evaluateInvariants(initialState),
      narration: {
        summaryVi:
          "HashMap khởi tạo mảng table với 16 buckets. Ngưỡng tái định kích thước (threshold) được thiết lập là 12 phần tử (16 * 0.75).",
        internalsNoteVi:
          "Trong Java 8+, việc khởi tạo bảng diễn ra theo cơ chế lazy allocation: mảng Node<K,V>[] chỉ thực sự được cấp phát bộ nhớ khi thao tác put() đầu tiên được gọi.",
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
    let summaryVi = "";
    let internalsNoteVi = "";
    let productionWarningVi: string | undefined;

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
              detail: `Bucket #${index} đạt ${bucket.nodes.length} nodes (ngưỡng ${state.treeifyThreshold}) -> chuyển hóa thành Red-Black Tree (TreeNode)!`,
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
          detail: `put("${command.key}", "${command.value}") -> hash: ${spread.toString(16)}, slot: [${index}] ${isCollision ? "(COLLISION)" : ""}`,
          tone: isCollision ? "warn" : "ok",
        });

        // Kiểm tra Resize
        if (state.size > state.threshold) {
          events.push({
            tick: nextTick,
            actor: "HashMap",
            action: "THRESHOLD_EXCEEDED",
            detail: `Size (${state.size}) vượt quá threshold (${state.threshold}). Kích hoạt resize x2!`,
            tone: "info",
          });
          resizeHashMap(state, events, nextTick);
          productionWarningVi =
            "Table vừa resize gấp đôi dung lượng. Trong môi trường tải cao, việc khởi tạo HashMap không có initialCapacity phù hợp sẽ gây spike CPU do rehash liên tục.";
        }

        phase = isCollision ? "COLLISION_RESOLVED" : "KEY_INSERTED";
        title = `Chèn phần tử: put("${command.key}", "${command.value}")`;
        summaryVi = `Tính vị trí băm: hashCode() = ${raw} -> bitwise perturbation -> index = (${state.capacity} - 1) & hash = ${index}. ${isCollision ? `Phát hiện va chạm tại slot ${index}, node được nối vào chuỗi.` : `Slot ${index} trống, node trở thành head của bucket.`}`;
        internalsNoteVi =
          "Hàm perturbation (h ^ (h >>> 16)) XOR 16 bit bậc cao xuống 16 bit bậc thấp để giảm thiểu va chạm khi dung lượng mảng n còn nhỏ (các bit bậc cao không bị lãng phí).";
        break;
      }

      case "BURST_COLLIDING_KEYS": {
        const targetSlot = command.targetBucketIndex % state.capacity;
        const bucket = state.buckets[targetSlot];

        for (let i = 1; i <= command.count; i++) {
          const fakeKey = `collidingKey_${i}_slot${targetSlot}`;
          // Ép mã băm để (spread & (capacity - 1)) đúng bằng targetSlot
          const fakeRaw = targetSlot + i * state.capacity * 4;
          const fakeSpread = fakeRaw; // simplified

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
            detail: `Bão va chạm tại Bucket #${targetSlot} (${bucket.nodes.length} nodes) -> Đã chuyển sang Red-Black Tree để duy trì O(log n) thay vì thoái hóa O(n).`,
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
        title = `Bão va chạm ${command.count} keys tại Slot #${targetSlot}`;
        summaryVi = `Bơm ${command.count} keys có cùng vị trí băm vào Bucket #${targetSlot}. Độ sâu va chạm đạt ${bucket.nodes.length}.`;
        internalsNoteVi =
          "Trước Java 8, tấn công Hash Collision DoS (khi kẻ tấn công gửi hàng ngàn HTTP params cùng mã băm) sẽ biến HashMap thành danh sách liên kết O(n), làm tê liệt CPU 100%. Từ Java 8, treeification giới hạn độ phức tạp tìm kiếm tối đa ở O(log n).";
        break;
      }

      case "TRIGGER_RESIZE_DOUBLING": {
        resizeHashMap(state, events, nextTick);
        phase = "RESIZE_COMPLETED";
        title = `Tái cấu trúc Resize x2 (Capacity: ${state.capacity})`;
        summaryVi = `Bảng table được nhân đôi kích thước lên ${state.capacity} slots. Các phần tử được phân bổ lại theo bit kiểm tra (hash & oldCap).`;
        internalsNoteVi =
          "Trong Java 8+, không cần tính lại hashCode() khi resize. Node hoặc giữ nguyên vị trí cũ (nếu bit tại oldCap bằng 0) hoặc dịch chuyển sang vị trí (cũ + oldCap) (nếu bit bằng 1).";
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
        title = `Xóa phần tử: "${command.key}"`;
        summaryVi = `Phần tử "${command.key}" đã được tìm thấy và loại bỏ khỏi bảng băm.`;
        internalsNoteVi =
          "Khi một Node bị xóa, con trỏ next được cập nhật để nối tắt qua node kế tiếp. Nếu bucket đang ở chế độ Red-Black Tree, cấu trúc cây sẽ tự cân bằng lại.";
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
        summaryVi,
        internalsNoteVi,
        productionWarningVi,
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

  // Thuật toán tách chuỗi (High-Bit split) chuẩn Java 8+
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

  // Cập nhật mode cho các bucket mới
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
    detail: `Capacity nhân đôi: ${oldCap} -> ${newCap}. Di chuyển ${splitCount} nodes sang nửa trên của bảng (oldIndex + ${oldCap}).`,
    tone: "ok",
  });
}
