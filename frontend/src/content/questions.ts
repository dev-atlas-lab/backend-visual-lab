import type { ScenarioQuestion } from "../domain";

export const questionBank: ScenarioQuestion[] = [
  // Kafka Consumer Group & Rebalance Questions
  {
    id: "kafka-q1-rebalance-protocol",
    moduleId: "kafka-consumer-groups-rebalance",
    domainId: "messaging",
    type: "single-choice",
    stem: "A team runs a Kafka Consumer Group with 6 partitions and 3 consumers using the default RangeAssignor. Consumer C3 crashes due to an out-of-memory error. Under the classic Eager Rebalance protocol, what happens immediately to partitions P0..P3 processed by the surviving consumers C1 and C2?",
    choices: [
      {
        id: "a",
        text: "Consumers C1 and C2 keep reading P0..P3 without interruption while only P4 and P5 are reassigned.",
        explanationVi:
          "Sai: Đây là hành vi của CooperativeStickyAssignor (KIP-429), không phải của giao thức Eager Rebalance truyền thống.",
      },
      {
        id: "b",
        text: "All partitions P0..P5 are revoked across all members, causing a group-wide Stop-The-World processing pause until JoinGroup and SyncGroup complete.",
        explanationVi:
          "Chính xác: Giao thức Eager Rebalance bắt buộc tất cả thành viên trong nhóm phải gọi onPartitionsRevoked() và từ bỏ toàn bộ partition đang giữ, dừng hoàn toàn việc tiêu thụ (Stop-The-World) cho đến khi thế hệ mới được thiết lập.",
      },
      {
        id: "c",
        text: "The Broker GroupCoordinator immediately reassigns P4 and P5 to C1 and C2 without waiting for any consumer heartbeat.",
        explanationVi:
          "Sai: Trong Classic Group Protocol, GroupCoordinator không tự phân bổ partition mà phải chờ các consumer gửi JoinGroup/SyncGroup để Consumer Leader thực thi assignor.",
      },
      {
        id: "d",
        text: "Consumers C1 and C2 continue processing and silently commit offsets with the old generationId.",
        explanationVi:
          "Sai: Khi Rebalance kích hoạt, GroupCoordinator sẽ từ chối các commit mang generationId cũ bằng mã lỗi ILLEGAL_GENERATION.",
      },
    ],
    correctChoiceIds: ["b"],
    correctExplanationVi:
      "Trong giao thức Eager Rebalance truyền thống, mọi biến động thành viên (crash, scale-out) đều kích hoạt Stop-The-World pause: tất cả consumers bị thu hồi toàn bộ partitions và ngừng xử lý cho đến khi hoàn tất vòng đời JoinGroup -> SyncGroup.",
    sourceIds: ["kafka-design-doc", "kip-429"],
  },
  {
    id: "kafka-q2-cooperative-sticky",
    moduleId: "kafka-consumer-groups-rebalance",
    domainId: "messaging",
    type: "multiple-response",
    stem: "Which TWO statements accurately describe the architectural improvements introduced by the Cooperative Sticky Assignor (KIP-429) compared to Eager Rebalancing? Select TWO.",
    choices: [
      {
        id: "a",
        text: "Consumers keep consuming from unaffected partitions during the first rebalance phase without a global Stop-The-World pause.",
        explanationVi:
          "Chính xác: KIP-429 áp dụng Incremental Cooperative Rebalancing, cho phép các consumer giữ lại các partition không bị đổi chủ và tiếp tục đọc dữ liệu bình thường.",
      },
      {
        id: "b",
        text: "It eliminates the need for the Kafka GroupCoordinator broker role by switching to a gossip protocol between consumers.",
        explanationVi:
          "Sai: KIP-429 vẫn dựa vào GroupCoordinator để điều phối các thế hệ (generationId) của Consumer Group.",
      },
      {
        id: "c",
        text: "Partition migrations occur in two targeted rebalance rounds: only partitions migrating between members are revoked first, then reassigned in the second round.",
        explanationVi:
          "Chính xác: Để tránh 2 consumer cùng đọc 1 partition tại 1 thời điểm, KIP-429 thực hiện vòng 1 để thu hồi partition cần di chuyển, và vòng 2 để gán partition đó cho chủ mới.",
      },
      {
        id: "d",
        text: "It allows multiple consumers in the same Consumer Group to simultaneously consume from the exact same partition.",
        explanationVi:
          "Sai: Bất biến cốt lõi của Kafka là tại một thời điểm, mỗi partition chỉ có tối đa 1 consumer trong cùng một group được phép đọc.",
      },
    ],
    correctChoiceIds: ["a", "c"],
    correctExplanationVi:
      "KIP-429 giải quyết triệt để nhược điểm Stop-The-World của Eager Rebalancing bằng cách chia quá trình phân bổ thành 2 bước lũy tiến (incremental), chỉ thu hồi các partition cần chuyển giao trong khi các partition ổn định tiếp tục chạy.",
    sourceIds: ["kip-429"],
  },

  // Redis Cache Stampede & TTL Questions
  {
    id: "redis-q1-stampede-root-cause",
    moduleId: "redis-cache-stampede-ttl",
    domainId: "caching",
    type: "single-choice",
    stem: "A flash-sale homepage key `catalog:flash-sale:top-deals` with high concurrent read traffic expires its TTL in Redis. Under a naive Cache-Aside implementation, what is the primary failure mode observed on the backing PostgreSQL database?",
    choices: [
      {
        id: "a",
        text: "PostgreSQL rejects incoming connections because Redis automatically replicates expired keys into PostgreSQL write buffers.",
        explanationVi:
          "Sai: Redis không có cơ chế tự động ghi ngược dữ liệu đã hết hạn vào PostgreSQL.",
      },
      {
        id: "b",
        text: "Cache Stampede (Thundering Herd): hundreds of concurrent worker threads simultaneously receive a cache miss and execute the expensive SQL aggregation query concurrently, exhausting the connection pool and spiking CPU.",
        explanationVi:
          "Chính xác: Khi hot key hết hạn mà không có cơ chế coalescing (gộp truy vấn), hàng trăm luồng đồng thời thấy Cache Miss và cùng lúc bắn câu query nặng xuống DB, làm cạn kiệt HikariCP Connection Pool và treo hệ thống.",
      },
      {
        id: "c",
        text: "PostgreSQL switches from B-Tree index scan to Sequential scan due to Redis memory exhaustion.",
        explanationVi:
          "Sai: Kế hoạch thực thi của PostgreSQL do Cost-based Optimizer quyết định dựa trên thống kê nội bộ, không liên quan trực tiếp đến bộ nhớ Redis.",
      },
      {
        id: "d",
        text: "Redis deadlocks its single-threaded event loop waiting for PostgreSQL transaction locks.",
        explanationVi:
          "Sai: Redis hoàn toàn độc lập với PostgreSQL và không tham gia vào hàng đợi khóa của database.",
      },
    ],
    correctChoiceIds: ["b"],
    correctExplanationVi:
      "Hiện tượng Thundering Herd / Cache Stampede xảy ra khi một key có mật độ truy cập cao (Hot Key) biến mất khỏi cache đúng lúc nhiều luồng cùng đọc, khiến toàn bộ lưu lượng đập trực tiếp vào cơ sở dữ liệu phía sau.",
    sourceIds: ["cache-stampede-vldb", "redis-eviction-spec"],
  },
  {
    id: "redis-q2-mutex-lock-pattern",
    moduleId: "redis-cache-stampede-ttl",
    domainId: "caching",
    type: "multiple-response",
    stem: "When implementing the Mutex Lock (Singleflight) pattern in Redis to prevent Cache Stampede, which TWO design practices are essential to prevent deadlocks and lock stealing? Select TWO.",
    choices: [
      {
        id: "a",
        text: "Acquire the lock using the atomic command `SET lock_key unique_token NX PX ttl_ms` instead of separate `SETNX` and `EXPIRE` commands.",
        explanationVi:
          "Chính xác: Việc tách rời SETNX và EXPIRE sẽ tạo ra kẽ hở (race condition) gây Deadlock vĩnh viễn nếu tiến trình bị crash ngay sau lệnh SETNX trước khi kịp đặt TTL.",
      },
      {
        id: "b",
        text: "Release the lock using an atomic Lua script that verifies the key's value matches `unique_token` before executing `DEL`.",
        explanationVi:
          "Chính xác: Nếu chỉ gọi DEL đơn thuần, một Worker bị chậm (ví dụ do Full GC pause kéo dài hơn TTL của khóa) có thể vô tình xóa khóa của Worker khác đã giành được quyền sau đó (Lock Stealing).",
      },
      {
        id: "c",
        text: "Set the lock TTL to 0ms so the lock releases immediately after the network packet reaches Redis.",
        explanationVi:
          "Sai: TTL = 0ms sẽ khiến khóa biến mất ngay lập tức và không còn tác dụng bảo vệ lượt recompute.",
      },
      {
        id: "d",
        text: "Ensure all worker threads bypass the cache and query PostgreSQL directly if the lock is held.",
        explanationVi:
          "Sai: Nếu bypass khóa để query DB trực tiếp thì bản thân mẫu thiết kế Mutex Lock hoàn toàn mất ý nghĩa bảo vệ.",
      },
    ],
    correctChoiceIds: ["a", "b"],
    correctExplanationVi:
      "Để hiện thực khóa phân tán an toàn trong Redis: bắt buộc dùng SET ... NX PX nguyên tử để chống Deadlock và dùng Lua script kiểm tra token sở hữu trước khi DEL để chống Lock Stealing.",
    sourceIds: ["redis-distlock-spec"],
  },

  // PostgreSQL B-Tree & MVCC Questions
  {
    id: "postgres-q1-update-ctid-internals",
    moduleId: "postgres-btree-mvcc-visibility",
    domainId: "databases",
    type: "single-choice",
    stem: "In PostgreSQL, when transaction Tx 202 executes `UPDATE accounts SET balance_usd = 950 WHERE account_id = 42`, how does PostgreSQL physically store this modification on the 8 KB heap page?",
    choices: [
      {
        id: "a",
        text: "It overwrites the balance bytes directly in-place inside the existing heap tuple at CTID (0,1) and writes the old value to a separate Undo rollback segment.",
        explanationVi:
          "Sai: Đây là cơ chế Undo Log của MySQL InnoDB hoặc Oracle. PostgreSQL không sử dụng Undo Log để lưu trữ các phiên bản cũ.",
      },
      {
        id: "b",
        text: "It marks `t_xmax = 202` on the existing tuple at CTID (0,1) and appends a brand-new physical heap tuple version at a new CTID (e.g., (0,3)) with `t_xmin = 202`.",
        explanationVi:
          "Chính xác: PostgreSQL hiện thực MVCC bằng cơ chế Multi-Version Append-only: bản ghi cũ được đánh dấu xmax với ID giao dịch cập nhật, và một phiên bản vật lý mới được chèn vào trang với địa chỉ CTID mới.",
      },
      {
        id: "c",
        text: "It immediately locks the entire B-Tree root page and prevents all concurrent readers from accessing table accounts.",
        explanationVi:
          "Sai: Trong PostgreSQL, lệnh ghi không bao giờ khóa chặn lệnh đọc (Writers do not block Readers).",
      },
      {
        id: "d",
        text: "It truncates Block 0 and moves all uncommitted transactions to the write-ahead log without modifying shared buffers.",
        explanationVi:
          "Sai: Các sửa đổi dữ liệu diễn ra trực tiếp trên các trang đĩa nạp trong shared_buffers và được ghi nhật ký vào WAL.",
      },
    ],
    correctChoiceIds: ["b"],
    correctExplanationVi:
      "Khác với các hệ quản trị dùng Undo Log, PostgreSQL lưu trữ các phiên bản tuple trực tiếp trên trang Heap 8 KB (hoặc dùng HOT nếu cùng trang). Lệnh UPDATE thực chất là thao tác gán xmax cho tuple cũ và INSERT một tuple mới với CTID mới.",
    sourceIds: ["postgres-page-layout", "postgres-mvcc-concurrency"],
  },
  {
    id: "postgres-q2-index-only-scan-vm",
    moduleId: "postgres-btree-mvcc-visibility",
    domainId: "databases",
    type: "single-choice",
    stem: "Under what specific condition can a PostgreSQL query planner execute a true Index-Only Scan that reads zero 8 KB table heap pages (Heap Fetches = 0)?",
    choices: [
      {
        id: "a",
        text: "Whenever the query references only columns that are part of the B-Tree index, regardless of table write activity.",
        explanationVi:
          "Sai: Bản thân B-Tree Index trong PostgreSQL không chứa thông tin giao dịch xmin/xmax, do đó vẫn phải đọc xuống trang Heap để kiểm tra tính hiển thị MVCC trừ khi Visibility Map xác nhận.",
      },
      {
        id: "b",
        text: "Only when the matching heap page has its `all_visible` bit set to 1 in the PostgreSQL Visibility Map (typically maintained by VACUUM), proving that all tuples on the page are visible to all current transactions.",
        explanationVi:
          "Chính xác: Visibility Map (VM) lưu trữ 1 bit cho mỗi trang 8 KB. Khi bit all_visible = 1, PostgreSQL biết chắc chắn mọi tuple trên trang đó đều đã commit và hiển thị với mọi transaction, cho phép Index-Only Scan bỏ qua việc đọc Heap (Heap Fetches = 0).",
      },
      {
        id: "c",
        text: "Only when the table is configured with `UNLOGGED` mode and synchronous_commit is turned off.",
        explanationVi:
          "Sai: Cấu hình logging không thay đổi yêu cầu kiểm tra tính hiển thị MVCC của Index-Only Scan.",
      },
      {
        id: "d",
        text: "Only when the isolation level is set to READ UNCOMMITTED.",
        explanationVi:
          "Sai: Trong PostgreSQL, mức cô lập READ UNCOMMITTED được xử lý đồng nhất như READ COMMITTED và vẫn tuân thủ đầy đủ quy tắc MVCC.",
      },
    ],
    correctChoiceIds: ["b"],
    correctExplanationVi:
      "Index-Only Scan chỉ đạt hiệu năng tối đa (Heap Fetches = 0) khi Visibility Map có bit all_visible = 1. Nếu trang heap có cập nhật mới chưa chạy VACUUM, engine vẫn buộc phải truy cập trang heap để đối chiếu xmin/xmax.",
    sourceIds: ["postgres-btree-nbtree", "postgres-mvcc-concurrency"],
  },
];
