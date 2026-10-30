import type { LearningModule } from "../domain";

export const learningModules: LearningModule[] = [
  // 1. Flagship Deep-Dive: Kafka Consumer Groups & Rebalancing
  {
    id: "kafka-consumer-groups-rebalance",
    slug: "kafka-consumer-groups-rebalance",
    domainId: "messaging",
    title: "Apache Kafka — Consumer Groups, Partition Assignment & Rebalance Internals",
    subtitle:
      "Hiểu sâu về cơ chế phân bổ Partition, Stop-The-World vs Cooperative Sticky (KIP-429), và máy trạng thái GroupCoordinator",
    governanceStatus: "VERIFIED",
    estimatedMinutes: 25,
    difficulty: "Intermediate",
    simulationId: "kafka-consumer-group",
    keyTerms: [
      {
        term: "Consumer Group",
        definitionVi:
          "Tập hợp các consumer instances cùng phối hợp để tiêu thụ dữ liệu song song từ một hoặc nhiều Topic. Mỗi Partition trong Topic chỉ được gán cho duy nhất 1 Consumer tại một thời điểm.",
      },
      {
        term: "GroupCoordinator",
        definitionVi:
          "Một Broker được chỉ định (dựa trên hash của groupId trên topic nội bộ __consumer_offsets) để quản lý tư cách thành viên, heartbeat, và vòng đời Rebalance của nhóm.",
      },
      {
        term: "CooperativeStickyAssignor (KIP-429)",
        definitionVi:
          "Chiến lược phân bổ Partition lũy tiến (Incremental Cooperative), loại bỏ việc thu hồi toàn bộ Partition (Stop-The-World) khi có thành viên rời hoặc gia nhập nhóm.",
      },
      {
        term: "generationId",
        definitionVi:
          "Một số nguyên đơn điệu tăng dần do GroupCoordinator quản lý. Mỗi lần Rebalance hoàn tất, generationId tăng lên để loại bỏ (fence) các request commit offset muộn từ thế hệ cũ.",
      },
    ],
    stages: {
      what: {
        heading: "1. Khái niệm cốt lõi (WHAT)",
        paragraphs: [
          "Apache Kafka đạt được khả năng mở rộng thông lượng tiêu thụ (horizontal scalability) thông qua cơ chế Consumer Group. Thay vì để một consumer duy nhất gánh toàn bộ dữ liệu của một Topic lớn, Kafka chia nhỏ Topic thành nhiều Partition song song và phân bổ các Partition này cho các consumer trong cùng nhóm.",
          "Điểm mấu chốt: Trong cùng một Consumer Group, mỗi Partition chỉ được xử lý bởi tối đa một Consumer tại một thời điểm. Điều này đảm bảo tính toàn vẹn thứ tự xử lý dữ liệu (strict ordering) trên từng Partition mà vẫn cho phép xử lý song song trên toàn Topic.",
        ],
        bulletPoints: [
          "Nếu số Consumers < số Partitions: Một Consumer sẽ gánh nhiều Partitions.",
          "Nếu số Consumers == số Partitions: Tỷ lệ 1-1 hoàn hảo, thông lượng tối ưu.",
          "Nếu số Consumers > số Partitions: Các Consumers dư thừa sẽ rơi vào trạng thái rảnh rỗi (idle standby), không nhận được Partition nào.",
        ],
      },
      why: {
        heading: "2. Tại sao cần cơ chế Rebalance? (WHY)",
        paragraphs: [
          "Trong môi trường microservices thực tế, các consumer instances có thể gặp sự cố bất ngờ (crash, Out-Of-Memory, mất mạng) hoặc được tự động tăng giảm quy mô (Auto-scaling / Kubernetes Pod rescheduling).",
          "Khi tập hợp thành viên trong nhóm thay đổi, hệ thống bắt buộc phải kích hoạt một quá trình thương lượng lại gọi là Rebalance: thu hồi các Partition từ các node đã chết hoặc chia bớt tải cho các node mới gia nhập. Nếu không có Rebalance, dữ liệu trên các Partition mất kết nối sẽ bị ứ đọng vĩnh viễn (Consumer Lag tăng không kiểm soát).",
        ],
        callout: {
          tone: "warning",
          title: "Vấn đề của Eager Rebalance cổ điển",
          body: "Trong giao thức Eager Rebalance truyền thống (RangeAssignor / RoundRobinAssignor), mỗi khi 1 consumer rời hoặc vào nhóm, TẤT CẢ consumers đều phải từ bỏ mọi Partition đang giữ (Stop-The-World), dừng toàn bộ tiến trình xử lý trong hàng giây tới hàng phút, gây spike Consumer Lag nghiêm trọng.",
        },
      },
      how: {
        heading: "3. Giao thức vận hành chi tiết (HOW)",
        paragraphs: [
          "Vòng đời của một Consumer Group được quản lý bởi một Broker đặc biệt đóng vai trò GroupCoordinator thông qua 4 pha chính:",
          "1. FindCoordinator: Consumer mới gửi truy vấn tới bất kỳ Broker nào trong cụm để tìm ra Broker nào đang quản lý groupId của mình (dựa trên math hash của groupId tới partition của __consumer_offsets).",
          "2. JoinGroup: Các Consumer gửi JoinGroupRequest. Coordinator chọn Consumer đầu tiên gửi request làm Group Leader và tăng generationId. Leader nhận danh sách toàn bộ thành viên.",
          "3. SyncGroup: Group Leader thực thi thuật toán phân bổ (PartitionAssignor) trên máy client, sau đó gửi bảng phân bổ về Coordinator qua SyncGroupRequest. Coordinator gửi kết quả phân bổ riêng biệt cho từng Consumer.",
          "4. Heartbeat: Các Consumer định kỳ gửi HeartbeatRequest trong nền (heartbeat.interval.ms) để Coordinator biết node vẫn sống. Nếu quá session.timeout.ms không có heartbeat, Coordinator tuyên bố consumer đã chết và kích hoạt Rebalance.",
        ],
      },
      internals: {
        heading: "4. Cơ chế nội tại & So sánh thuật toán Assignor (INTERNALS)",
        paragraphs: [
          "Phép so sánh quan trọng nhất trong kỹ thuật Kafka hiện đại là giữa Eager Rebalance (Range/RoundRobin) và Incremental Cooperative Rebalance (KIP-429).",
          "Dưới KIP-429 (CooperativeStickyAssignor), khi một consumer mới gia nhập, các consumer cũ KHÔNG thu hồi toàn bộ partition. Thay vào đó, chúng giữ nguyên phần lớn partition đang đọc và chỉ chuyển giao những partition cần thiết trong hai vòng lặp tái cân bằng ngắn gọn.",
        ],
        codeSnippet: {
          language: "java",
          caption: "Cấu hình Production khuyên dùng cho Kafka Consumer",
          code: `Properties props = new Properties();
props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
props.put(ConsumerConfig.GROUP_ID_CONFIG, "order-billing-cg");
// Sử dụng CooperativeStickyAssignor để triệt tiêu Stop-The-World Rebalance
props.put(ConsumerConfig.PARTITION_ASSIGNMENT_STRATEGY_CONFIG,
    "org.apache.kafka.clients.consumer.CooperativeStickyAssignor");
// Phân biệt rõ ràng giữa Heartbeat liveness và Processing loop
props.put(ConsumerConfig.SESSION_TIMEOUT_MS_CONFIG, 45000);   // Heartbeat thread failure detection
props.put(ConsumerConfig.HEARTBEAT_INTERVAL_MS_CONFIG, 3000);  // Gửi heartbeat mỗi 3s
props.put(ConsumerConfig.MAX_POLL_INTERVAL_MS_CONFIG, 300000); // 5 phút tối đa cho xử lý logic app`,
        },
      },
      tradeOffs: {
        heading: "5. Phân tích đánh đổi kỹ thuật (TRADE-OFFS)",
        paragraphs: [
          "Mỗi chiến lược phân bổ mang lại sự đánh đổi rõ ràng giữa tính đơn giản và độ ổn định thông lượng:",
        ],
        bulletPoints: [
          "RangeAssignor: Rất đơn giản, giữ tính co-partitioning giữa các topic có cùng số partition. Nhược điểm: Gây lệch tải (imbalance) về các consumer đứng đầu danh sách nếu nhiều topic cùng được đăng ký.",
          "RoundRobinAssignor: Phân bổ đều tuyệt đối giữa các thành viên. Nhược điểm: Vẫn là Eager Rebalance, dừng toàn bộ cụm khi có biến động.",
          "CooperativeStickyAssignor: Tối ưu thông lượng P99, không dừng toàn cụm, giữ tối đa phân bổ cũ. Nhược điểm: Phức tạp hơn, cần hai vòng rebalance liên tiếp để hoàn tất việc di chuyển partition.",
        ],
      },
      failureScenarios: {
        heading: "6. Các kịch bản sự cố thực tế (FAILURE SCENARIOS)",
        paragraphs: [
          "1. Heartbeat Timeout (session.timeout.ms): Luồng gửi heartbeat chạy nền bị treo do JVM Full GC pause kéo dài hoặc mất mạng tạm thời -> Coordinator loại consumer và rebalance.",
          "2. Processing Hang (max.poll.interval.ms): Luồng ứng dụng gọi dịch vụ bên thứ ba bị timeout hoặc xử lý batch quá lâu, không kịp gọi poll() tiếp theo -> Coordinator ngắt kết nối vì nghi ngờ ứng dụng bị treo, gây Rebalance Loop tai hại.",
        ],
        callout: {
          tone: "warning",
          title: "Hiện tượng Rebalance Storm",
          body: "Khi max.poll.interval.ms bị vi phạm, Coordinator kick consumer ra -> Rebalance -> Partition được chuyển sang consumer khác -> Consumer mới lại xử lý đúng batch đó và lại bị quá thời gian -> Vòng lặp Rebalance Storm liên tục khiến cụm ngưng trệ.",
        },
      },
      productionEngineering: {
        heading: "7. Kinh nghiệm vận hành Production (PRODUCTION ENGINEERING)",
        paragraphs: [
          "Để vận hành Consumer Group ổn định trong môi trường thực tế, hãy tuân thủ các quy tắc chuẩn:",
          "1. Luôn kích hoạt CooperativeStickyAssignor trên Kafka 2.4+.",
          "2. Đặt heartbeat.interval.ms <= 1/3 của session.timeout.ms để chịu được việc mất 1-2 gói tin heartbeat.",
          "3. Giảm max.poll.records (ví dụ: từ 500 xuống 50 hoặc 100) nếu mỗi bản ghi cần gọi I/O bên ngoài, đảm bảo thời gian xử lý luôn < max.poll.interval.ms.",
          "4. Thiết lập cảnh báo (Alert) trên chỉ số Prometheus: kafka_consumergroup_lag > 0 trong 5 phút và kafka_server_GroupCoordinator_RebalanceRateAndTimeMs.",
        ],
      },
    },
    sourceIds: ["kafka-design-doc", "kip-429", "kip-848"],
    questionIds: ["kafka-q1-rebalance-protocol", "kafka-q2-cooperative-sticky"],
  },

  // 2. Interactive Lab: Redis Cache Stampede & TTL Expiration
  {
    id: "redis-cache-stampede-ttl",
    slug: "redis-cache-stampede-ttl",
    domainId: "caching",
    title: "Redis — Cache-Aside, TTL Expiration & Cache Stampede Mitigation",
    subtitle:
      "Nguyên nhân sập Connection Pool cơ sở dữ liệu khi Hot Key hết hạn và các giải pháp Mutex Lock (Singleflight) / Logical TTL",
    governanceStatus: "VERIFIED",
    estimatedMinutes: 20,
    difficulty: "Intermediate",
    simulationId: "redis-stampede",
    keyTerms: [
      {
        term: "Cache Stampede (Thundering Herd)",
        definitionVi:
          "Sự cố xảy ra khi một Hot Key có lưu lượng đọc lớn bị hết hạn TTL hoặc bị xóa, khiến hàng nghìn request đồng thời nhận Cache Miss và cùng lúc gửi câu query nặng xuống cơ sở dữ liệu.",
      },
      {
        term: "Passive vs Active Expiration",
        definitionVi:
          "Cơ chế dọn dẹp key trong Redis: Passive (xóa lười khi có lệnh đọc chạm vào key đã quá hạn) kết hợp với Active (quét mẫu ngẫu nhiên định kỳ hz = 10 lần/giây trong nền).",
      },
      {
        term: "Mutex Lock / Singleflight",
        definitionVi:
          "Mẫu thiết kế gộp truy vấn: Chỉ cho phép duy nhất một luồng giành được khóa phân tán (SET NX PX) truy vấn cơ sở dữ liệu để tái tạo cache, các luồng khác đợi kết quả mới.",
      },
      {
        term: "Logical TTL (Probabilistic / Early Refresh)",
        definitionVi:
          "Lưu timestamp hết hạn logic bên trong giá trị JSON; khi sắp hết hạn, trả ngay dữ liệu cũ (stale) trong 1ms và kích hoạt một luồng chạy ngầm làm mới dữ liệu từ Database.",
      },
    ],
    stages: {
      what: {
        heading: "1. Khái niệm cốt lõi (WHAT)",
        paragraphs: [
          "Mô hình Cache-Aside (Lazy Loading) là mẫu kiến trúc phổ biến nhất trong các hệ thống backend: Ứng dụng luôn kiểm tra Cache (Redis) trước; nếu có (Cache Hit), trả về ngay trong ~1ms; nếu không có (Cache Miss), đọc từ PostgreSQL/MySQL, nạp vào Redis với thời gian sống (TTL), rồi mới trả kết quả.",
          "Tuy nhiên, khi lưu lượng truy cập đạt hàng nghìn request/giây trên cùng một Hot Key (như trang chủ flash-sale, bảng giá chứng khoán), việc hết hạn TTL tự nhiên có thể gây ra hiện tượng sập đổ dây chuyền gọi là Cache Stampede (Thundering Herd).",
        ],
      },
      why: {
        heading: "2. Thảm họa sập Connection Pool (WHY)",
        paragraphs: [
          "Khi một Hot Key hết hạn tại giây thứ $T$, trong cửa sổ 200ms tiếp theo trong lúc cơ sở dữ liệu đang thực thi câu truy vấn tổng hợp phức tạp, tất cả các request mới đến đều gặp Cache Miss.",
          "Nếu có 500 request đồng thời, cả 500 luồng đều mở kết nối xuống PostgreSQL. Vì Connection Pool (ví dụ HikariCP) thường chỉ có kích thước 20-50 kết nối, toàn bộ pool sẽ bị nghẽn (Pool Exhaustion), các luồng bị treo chờ (Queue Timeout), đẩy độ trễ P99 từ 2ms lên 10,000ms+ và làm sập toàn bộ dịch vụ phụ thuộc.",
        ],
      },
      how: {
        heading: "3. Các chiến lược phòng chống Stampede (HOW)",
        paragraphs: [
          "Có hai giải pháp kiến trúc kinh điển để dập tắt hiện tượng Cache Stampede:",
          "1. Mutex Lock / Singleflight (SET NX PX): Khi gặp Cache Miss, worker thread cố gắng chiếm một khóa nguyên tử trong Redis bằng lệnh SET lock:key unique_token NX PX 5000. Chỉ 1 worker giành được khóa được phép query DB; các worker khác chờ kết quả hoặc đọc lại cache.",
          "2. Logical TTL (Phục vụ dữ liệu cũ + Nạp nền): Đặt TTL vật lý trong Redis dài hơn (ví dụ 1 ngày), nhưng nhúng trường logical_expire_at (ví dụ 5 phút) vào payload. Khi quá 5 phút, trả ngay dữ liệu cũ (vẫn đúng 99% trường hợp) cho người dùng trong 1ms, đồng thời khởi chạy 1 tác vụ bất đồng bộ để làm mới cache.",
        ],
      },
      internals: {
        heading: "4. Cơ chế nội tại của Redis (INTERNALS)",
        paragraphs: [
          "Lệnh khóa phân tán bắt buộc phải sử dụng dạng thức nguyên tử đơn lệnh:",
          "SET resource_name my_random_value NX PX 30000",
          "Nếu chia thành hai lệnh SETNX rồi EXPIRE, tiến trình có thể crash ở giữa hai lệnh, khiến khóa tồn tại vĩnh viễn không có TTL và gây Deadlock toàn hệ thống.",
        ],
        codeSnippet: {
          language: "lua",
          caption: "Giải phóng khóa an toàn chống Lock Stealing bằng Lua script",
          code: `-- Script kiểm tra đúng token sở hữu trước khi DEL
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end`,
        },
      },
      tradeOffs: {
        heading: "5. Phân tích đánh đổi (TRADE-OFFS)",
        paragraphs: [
          "So sánh ba chiến lược quản lý Cache khi tải cao:",
        ],
        bulletPoints: [
          "Naive Cache-Aside: Rất đơn giản, dữ liệu luôn mới nhất khi có miss. Nhược điểm: Cực kỳ nguy hiểm khi gặp Hot Key hết hạn.",
          "Mutex Lock (Singleflight): Bảo vệ DB 100%, chỉ 1 query duy nhất chạy. Nhược điểm: Các request khác phải chịu độ trễ chờ đợi trong lúc worker đầu tiên đang recompute.",
          "Logical TTL / Background Refresh: Độ trễ P99 luôn đạt ~1ms, bảo vệ DB tuyệt đối. Nhược điểm: Chấp nhận tính nhất quán cuối cùng (Eventual Consistency) — người dùng có thể nhận dữ liệu trễ vài trăm mili-giây.",
        ],
      },
      failureScenarios: {
        heading: "6. Kịch bản lỗi: Lock Stealing do GC Pause (FAILURE SCENARIOS)",
        paragraphs: [
          "Một lỗi rất tinh vi trong các ứng dụng Java/NodeJS: Worker 1 giành được khóa với TTL = 5 giây. Đột nhiên Worker 1 gặp một đợt Stop-the-world Full GC kéo dài 7 giây. Khóa trong Redis tự động hết hạn và Worker 2 giành được khóa. Khi Worker 1 tỉnh dậy, nó hoàn thành công việc và gọi lệnh DEL lock mà không kiểm tra token -> vô tình xóa khóa của Worker 2! Đó là lý do bắt buộc phải dùng Lua script so khớp token.",
        ],
      },
      productionEngineering: {
        heading: "7. Khuyến nghị Vận hành Production (PRODUCTION ENGINEERING)",
        paragraphs: [
          "1. Bổ sung Jitter ngẫu nhiên vào TTL: Thay vì đặt cứng TTL = 300s cho hàng loạt key, hãy đặt TTL = 300 + rand(-30, 30) giây để tránh hiện tượng Cache Avalanche (nhiều key cùng hết hạn một lúc).",
          "2. Với các Hot Key quan trọng bậc nhất, hãy dùng pattern Singleflight (như golang.org/x/sync/singleflight hoặc Guava LoadingCache trong Java).",
          "3. Giám sát chỉ số Redis: instantaneous_ops_per_sec, keyspace_hits vs keyspace_misses, và HikariCP ConnectionPool ActiveConnections.",
        ],
      },
    },
    sourceIds: ["redis-eviction-spec", "redis-distlock-spec", "cache-stampede-vldb"],
    questionIds: ["redis-q1-stampede-root-cause", "redis-q2-mutex-lock-pattern"],
  },

  // 3. Interactive Lab: PostgreSQL B-Tree & MVCC
  {
    id: "postgres-btree-mvcc-visibility",
    slug: "postgres-btree-mvcc-visibility",
    domainId: "databases",
    title: "PostgreSQL — B-Tree Index Scan, Visibility Map & MVCC Tuple Visibility",
    subtitle:
      "Khám phá trang 8 KB, con trỏ CTID, thuật toán nbtree, và sự khác biệt về Snapshot giữa READ COMMITTED và REPEATABLE READ",
    governanceStatus: "VERIFIED",
    estimatedMinutes: 25,
    difficulty: "Senior / Staff",
    simulationId: "postgres-mvcc-btree",
    keyTerms: [
      {
        term: "Slotted Page (8 KB)",
        definitionVi:
          "Đơn vị lưu trữ cơ sở của PostgreSQL. Gồm PageHeaderData (24 bytes), mảng Line Pointers (ItemIdData) phát triển xuống dưới, và dữ liệu Tuple phát triển ngược lên trên.",
      },
      {
        term: "CTID (block_number, item_offset)",
        definitionVi:
          "Địa chỉ vật lý duy nhất của một phiên bản tuple trên đĩa, ví dụ (0, 1) là Block 0, Line Pointer số 1.",
      },
      {
        term: "MVCC (t_xmin & t_xmax)",
        definitionVi:
          "Multi-Version Concurrency Control: Trường header trên mỗi tuple lưu ID giao dịch chèn (xmin) và ID giao dịch xóa/cập nhật (xmax). Lệnh UPDATE không ghi đè tại chỗ mà tạo ra tuple mới với CTID mới.",
      },
      {
        term: "Visibility Map (VM)",
        definitionVi:
          "Cấu trúc bitmap lưu trên đĩa, đánh dấu 1 bit all_visible cho mỗi trang 8 KB. Giúp Index-Only Scan bỏ qua việc đọc Heap Tuple (Heap Fetches = 0) nếu mọi tuple trên trang đều đã hiển thị với mọi giao dịch.",
      },
    ],
    stages: {
      what: {
        heading: "1. Khái niệm cốt lõi (WHAT)",
        paragraphs: [
          "PostgreSQL là một trong những hệ quản trị cơ sở dữ liệu quan hệ mạnh mẽ nhất thế giới nhờ vào kiến trúc lưu trữ đa phiên bản (MVCC) và cấu trúc chỉ mục B-Tree (nbtree) hiệu năng cao.",
          "Khác biệt căn bản giữa PostgreSQL và các RDBMS khác (như MySQL InnoDB hay Oracle): PostgreSQL không sử dụng Undo Log để tái tạo các phiên bản cũ của dòng dữ liệu. Thay vào đó, tất cả các phiên bản (cũ và mới) đều cùng nằm trực tiếp trên các trang bảng (Heap Pages 8 KB), và tính hiển thị được quyết định động thông qua so sánh t_xmin và t_xmax với Snapshot giao dịch.",
        ],
      },
      why: {
        heading: "2. Tại sao lệnh ghi không khóa lệnh đọc? (WHY)",
        paragraphs: [
          "Trong các hệ thống RDBMS truyền thống sử dụng khóa bi quan (2-Phase Locking như SQL Server mặc định), một giao dịch đang thực hiện UPDATE sẽ đặt khóa độc quyền (Exclusive Lock) chặn tất cả các giao dịch khác muốn SELECT dòng đó cho đến khi COMMIT.",
          "Cơ chế MVCC của PostgreSQL giải phóng hoàn toàn sự xung đột này: Readers do not block Writers, and Writers do not block Readers. Người đọc luôn nhìn thấy một bức ảnh chụp nhất quán (Snapshot) của dữ liệu tại thời điểm quá khứ mà không bao giờ bị khóa chặn bởi giao dịch ghi.",
        ],
      },
      how: {
        heading: "3. Cơ chế Index Scan và Snapshot Visibility (HOW)",
        paragraphs: [
          "Khi thực hiện một truy vấn SELECT thông qua B-Tree Index:",
          "1. Engine duyệt từ Root Page -> Internal Page -> Leaf Page của chỉ mục để tìm khóa cần tra cứu.",
          "2. Trang lá B-Tree trả về một danh sách các con trỏ vật lý CTID (ví dụ: (0, 1), (0, 3)).",
          "3. Engine bắt buộc phải dùng CTID để nạp trang Heap 8 KB tương ứng vào shared_buffers và đọc header của từng tuple:",
          "   - Nếu xmin chưa COMMIT hoặc xmin >= Snapshot xmax -> Ẩn (Invisible).",
          "   - Nếu xmax đã COMMIT và xmax <= Snapshot -> Ẩn (Dead Tuple).",
          "   - Chỉ khi tuple thỏa mãn điều kiện Snapshot thì nó mới được trả về cho câu lệnh SELECT.",
        ],
      },
      internals: {
        heading: "4. So sánh Snapshot: READ COMMITTED vs REPEATABLE READ (INTERNALS)",
        paragraphs: [
          "Sự khác biệt cốt lõi giữa hai cấp độ cô lập trong PostgreSQL nằm ở thời điểm chụp Snapshot:",
          "- READ COMMITTED: Chụp một Snapshot MỚI tại thời điểm bắt đầu của MỖI CÂU LỆNH SQL trong giao dịch. Do đó nếu giao dịch ghi Tx 202 COMMIT ở giữa hai câu SELECT, câu SELECT thứ hai sẽ nhìn thấy dữ liệu mới.",
          "- REPEATABLE READ: Chỉ chụp DUY NHẤT MỘT Snapshot tại thời điểm bắt đầu câu lệnh đầu tiên của giao dịch và giữ nguyên Snapshot đó cho đến khi kết thúc. Mọi sửa đổi đã COMMIT của Tx 202 sau đó đều hoàn toàn vô hình!",
        ],
        codeSnippet: {
          language: "sql",
          caption: "Xem chi tiết thông tin MVCC nội bộ bằng extension pageinspect",
          code: `CREATE EXTENSION IF NOT EXISTS pageinspect;

-- Kiểm tra header MVCC thực tế của các dòng trong Heap Block 0
SELECT lp, t_ctid, t_xmin, t_xmax,
       (t_infomask & 256)::bool AS xmin_committed,
       (t_infomask & 1024)::bool AS xmax_invalid
FROM heap_page_items(get_raw_page('accounts', 0));`,
        },
      },
      tradeOffs: {
        heading: "5. Đánh đổi: Cái giá của việc không dùng Undo Log (TRADE-OFFS)",
        paragraphs: [
          "Kiến trúc MVCC Append-only của PostgreSQL mang lại thông lượng đọc tuyệt vời nhưng cũng đi kèm các đánh đổi lớn:",
        ],
        bulletPoints: [
          "Table Bloat (Phình to bảng): Lệnh UPDATE và DELETE để lại các Dead Tuples trên đĩa. Nếu không dọn dẹp, dung lượng bảng sẽ tăng vọt và làm chậm các truy vấn Seq Scan.",
          "Index Pointer Bloat: Mỗi lần UPDATE không thỏa mãn HOT (Heap-Only Tuple) đều phải chèn con trỏ CTID mới vào toàn bộ các chỉ mục của bảng.",
          "Cần tiến trình Autovacuum liên tục chạy nền để thu hồi dung lượng trống và cập nhật Visibility Map.",
        ],
      },
      failureScenarios: {
        heading: "6. Kịch bản lỗi: Autovacuum không theo kịp tốc độ UPDATE (FAILURE SCENARIOS)",
        paragraphs: [
          "Khi một bảng có hàng chục triệu dòng và tần suất UPDATE liên tục, nếu autovacuum_vacuum_cost_limit quá thấp, tiến trình VACUUM sẽ không kịp dọn dẹp các Dead Tuples. Hậu quả là B-Tree Index phình to gấp 5 lần, Visibility Map bị vô hiệu hóa (all_visible = 0), khiến các câu lệnh Index-Only Scan suy thoái thành Index Scan và phải đọc hàng nghìn trang đĩa không cần thiết.",
        ],
      },
      productionEngineering: {
        heading: "7. Kinh nghiệm vận hành Production (PRODUCTION ENGINEERING)",
        paragraphs: [
          "1. Điều chỉnh Autovacuum cho các bảng ghi nhiều: Giảm autovacuum_vacuum_scale_factor từ mặc định 0.2 (20%) xuống 0.05 (5%) và tăng autovacuum_vacuum_cost_limit lên 1000-2000.",
          "2. Đảm bảo các cột hay UPDATE không nằm trong các Index không cần thiết để tận dụng tối đa tính năng HOT (Heap-Only Tuple) — tái sử dụng trang hiện tại mà không sửa đổi B-Tree.",
          "3. Giám sát chỉ số: n_dead_tup vs n_live_tup trong pg_stat_user_tables và độ tuổi transaction ID của pg_database để tránh XID Wraparound.",
        ],
      },
    },
    sourceIds: ["postgres-page-layout", "postgres-mvcc-concurrency", "postgres-btree-nbtree"],
    questionIds: ["postgres-q1-update-ctid-internals", "postgres-q2-index-only-scan-vm"],
  },
];
