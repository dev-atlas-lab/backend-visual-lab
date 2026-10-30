import type { ScenarioQuestion } from "../domain";

export const questionBank: ScenarioQuestion[] = [
  // Java Core & JVM Internals Questions
  {
    id: "java-q1-stack-vs-heap",
    moduleId: "java-memory-heap-stack-gc",
    domainId: "java",
    type: "single-choice",
    stem: "A Java method defines a local variable 'int counter = 10;' and creates a new object 'Order order = new Order();'. When the method finishes execution and its stack frame is popped, what happens to 'counter' and 'order' in JVM memory?",
    choices: [
      {
        id: "a",
        text: "Both 'counter' and the 'Order' instance are instantly deallocated by the operating system alongside the stack frame without GC intervention.",
        explanationVi:
          "Sai: Chỉ có biến nguyên thủy 'counter' và biến tham chiếu con trỏ 'order' trên Stack bị giải phóng cùng frame. Bản thân thực thể Order object nằm trên Heap và cần Garbage Collector dọn dẹp.",
      },
      {
        id: "b",
        text: "The primitive 'counter' and the reference pointer 'order' on the Stack frame are instantly cleared. The Heap-allocated 'Order' object becomes unreachable from GC Roots and will be reclaimed in the next Minor GC cycle.",
        explanationVi:
          "Chính xác: Stack Frame lưu trữ trực tiếp biến nguyên thủy và con trỏ 4/8 byte. Khi hàm return, stack frame tự hủy lập tức (zero GC cost). Instance Order trên Heap mất tham chiếu (unreachable from GC Roots) và trở thành rác chờ Minor GC dọn dẹp.",
      },
      {
        id: "c",
        text: "The 'Order' instance is immediately moved into Old Gen (Tenured) to avoid fragmented allocation in Eden.",
        explanationVi:
          "Sai: Đối tượng không được chuyển sang Old Gen trừ khi nó sống sót qua nhiều chu kỳ GC đạt ngưỡng tenuring threshold hoặc là một Humongous object.",
      },
      {
        id: "d",
        text: "The HotSpot garbage collector immediately pauses all application threads (Stop-The-World) to sweep the 'Order' object from the heap.",
        explanationVi:
          "Sai: HotSpot GC không kích hoạt STW ngay lập tức khi một hàm kết thúc; nó chỉ chạy khi không gian Eden bị đầy hoặc khi hệ thống kích hoạt chu kỳ GC định kỳ.",
      },
    ],
    correctChoiceIds: ["b"],
    correctExplanationVi:
      "Stack Frame tự giải phóng ngay khi hàm return, hủy biến nguyên thủy và địa chỉ con trỏ tham chiếu. Thực thể Object trên Heap không còn đường dẫn từ bất kỳ GC Root nào và sẽ được HotSpot Garbage Collector thu hồi trong chu kỳ Minor GC kế tiếp.",
    sourceIds: ["jvm-spec-se21"],
  },
  {
    id: "java-q2-generational-promotion",
    moduleId: "java-memory-heap-stack-gc",
    domainId: "java",
    type: "multiple-response",
    stem: "Which TWO statements accurately describe the mechanics and assumptions of HotSpot Generational Garbage Collection (Young vs Old Generation)? Select TWO.",
    choices: [
      {
        id: "a",
        text: "It is built on the Weak Generational Hypothesis: the vast majority of Java objects die shortly after allocation, making copying collection in Young Gen extremely fast.",
        explanationVi:
          "Chính xác: Giả thuyết thế hệ (Weak Generational Hypothesis) chứng minh trên 95-98% đối tượng Java có vòng đời ngắn (chỉ dùng trong phạm vi hàm). Thuật toán Mark-Copy trên Young Gen chỉ tốn chi phí tỉ lệ với số object còn sống sót.",
      },
      {
        id: "b",
        text: "Survivor space S0 and S1 are utilized simultaneously for new object allocations to maximize L1 CPU cache locality.",
        explanationVi:
          "Sai: Tại một thời điểm, chỉ một trong hai vùng S0 hoặc S1 đóng vai trò From-Space chứa object sống sót, vùng còn lại bắt buộc phải hoàn toàn trống (To-Space) để chuẩn bị cho lượt sơ tán kế tiếp.",
      },
      {
        id: "c",
        text: "Surviving objects in Young Gen have an age counter incremented after each Minor GC; upon reaching MaxTenuringThreshold (default 15), they are promoted to the Old Generation (Tenured).",
        explanationVi:
          "Chính xác: Mỗi lần sống sót qua Minor GC, object được tăng tenuring age (lưu trong Object Header Mark Word). Khi đạt ngưỡng MaxTenuringThreshold, object được thăng hạng sang Old Gen.",
      },
      {
        id: "d",
        text: "Major / Full GC pauses are consistently shorter than Minor GC pauses because the Old Generation contains fewer objects.",
        explanationVi:
          "Sai: Major/Full GC quét toàn bộ Old Gen và thường áp dụng Mark-Sweep-Compact, dẫn đến thời gian Stop-The-World (STW) dài hơn nhiều lần so với Minor GC.",
      },
    ],
    correctChoiceIds: ["a", "c"],
    correctExplanationVi:
      "Generational GC dựa trên Giả thuyết thế hệ (đa số object chết trẻ) và sử dụng cơ chế thăng hạng (Tenuring Age counter) để di chuyển các đối tượng sống lâu sang Old Generation sau khi vượt ngưỡng MaxTenuringThreshold.",
    sourceIds: ["jvm-spec-se21"],
  },

  // Java Collections & HashMap Treeification Questions
  {
    id: "java-q3-hashmap-indexing",
    moduleId: "java-hashmap-treeification",
    domainId: "java",
    type: "single-choice",
    stem: "In Java 8+, why does java.util.HashMap enforce that table capacity must always be a power of two (e.g., 16, 32, 64), and how does it compute the bucket index from a key's 32-bit hash value?",
    choices: [
      {
        id: "a",
        text: "It allows replacing the slow mathematical modulo operator (%) with an ultra-fast bitwise AND operation: index = (capacity - 1) & hash.",
        explanationVi:
          "Chính xác: Khi capacity là lũy thừa của 2, (capacity - 1) luôn là một chuỗi bit 1 nhị phân (vd: 16 - 1 = 15 = 0b1111). Phép bitwise AND (n - 1) & hash tương đương toán học với hash % n nhưng chạy ở tốc độ nano giây trên CPU.",
      },
      {
        id: "b",
        text: "It guarantees that no hash collisions can mathematically occur regardless of the key's hashCode implementation.",
        explanationVi:
          "Sai: Va chạm băm vẫn xảy ra theo nguyên lý chuồng bồ câu (Pigeonhole Principle).",
      },
      {
        id: "c",
        text: "It forces the JVM to allocate contiguous physical memory pages aligned directly with CPU cache line boundaries.",
        explanationVi:
          "Sai: Đây là tối ưu cấp độ thuật toán mảng của thư viện Collections, không liên quan đến cơ chế page alignment của hệ điều hành.",
      },
      {
        id: "d",
        text: "It is required so that the HashMap can execute binary search directly on the table buckets in O(log n) time.",
        explanationVi:
          "Sai: HashMap truy cập bucket trực tiếp theo chỉ số mảng O(1), không phải binary search.",
      },
    ],
    correctChoiceIds: ["a"],
    correctExplanationVi:
      "Dung lượng là lũy thừa của 2 cho phép chuyển phép chia lấy dư hash % capacity thành phép toán bitwise AND: (capacity - 1) & hash, tối ưu hóa tốc độ truy cập bucket lên mức tối đa.",
    sourceIds: ["openjdk-hashmap-source"],
  },
  {
    id: "java-q4-treeify-threshold",
    moduleId: "java-hashmap-treeification",
    domainId: "java",
    type: "multiple-response",
    stem: "Under what conditions does Java 8+ HashMap convert a colliding bucket from a Singly-Linked List into a Red-Black Tree (TreeNode), and what architectural problem does this solve? Select TWO.",
    choices: [
      {
        id: "a",
        text: "The bucket chain length must reach or exceed TREEIFY_THRESHOLD (8) AND the total table capacity must be at least MIN_TREEIFY_CAPACITY (64).",
        explanationVi:
          "Chính xác: Nếu độ sâu chuỗi >= 8 nhưng capacity < 64, HashMap sẽ chọn phương án resize nhân đôi bảng thay vì treeify để giảm mật độ va chạm.",
      },
      {
        id: "b",
        text: "It converts immediately whenever any two keys produce identical 32-bit hash codes regardless of table capacity.",
        explanationVi:
          "Sai: Hai key trùng hash chỉ tạo thành danh sách liên kết có độ sâu 2, chưa đạt ngưỡng 8.",
      },
      {
        id: "c",
        text: "It mitigates Hash Collision DoS vulnerabilities by capping the worst-case lookup, insertion, and deletion complexity at O(log n) instead of degrading to O(n).",
        explanationVi:
          "Chính xác: Trước Java 8, tấn công băm va chạm có thể ép HashMap thoái hóa thành danh sách liên kết O(n), gây nghẽn CPU 100%. Red-Black Tree đảm bảo giới hạn tìm kiếm tối đa O(log n).",
      },
      {
        id: "d",
        text: "It reduces memory consumption by 50% because TreeNode uses fewer bytes than standard Node.",
        explanationVi:
          "Sai: TreeNode thực tế ngốn bộ nhớ gấp đôi Node thông thường (do phải lưu thêm con trỏ left, right, parent, và thuộc tính red/black).",
      },
    ],
    correctChoiceIds: ["a", "c"],
    correctExplanationVi:
      "Java 8+ chuyển đổi bucket thành Red-Black Tree khi chuỗi va chạm >= 8 và capacity >= 64, giúp bảo vệ ứng dụng khỏi nguy cơ Hash Collision DoS bằng cách giới hạn độ phức tạp tìm kiếm ở O(log n).",
    sourceIds: ["openjdk-hashmap-source"],
  },

  // Java 8+ Streams & CompletableFuture Questions
  {
    id: "java-q5-stream-lazy-fusion",
    moduleId: "java-streams-lazy-evaluation",
    domainId: "java",
    type: "single-choice",
    stem: "Consider the Java Stream pipeline: list.stream().filter(x -> x > 10).map(x -> x * 2).findFirst();. How does the JVM execute this pipeline internally?",
    choices: [
      {
        id: "a",
        text: "It creates a temporary ArrayList holding all elements > 10, then creates a second ArrayList for the mapped values, and finally extracts the first item.",
        explanationVi:
          "Sai: Đây là cách tiếp cận eagerly-evaluated (truyền thống). Stream API được thiết kế để không tạo ra các danh sách trung gian lãng phí bộ nhớ.",
      },
      {
        id: "b",
        text: "Intermediate operations (filter, map) are lazy and fused into a single pull-based pipeline. Processing halts immediately at the very first element that matches the filter and is transformed by map, without examining the remaining elements.",
        explanationVi:
          "Chính xác: Stream API áp dụng kỹ thuật Loop Fusion và Lazy Evaluation: không có lệnh nào chạy cho đến khi gặp terminal operation (findFirst). Nhờ cơ chế short-circuiting, pipeline dừng lại ngay khi phần tử đầu tiên thỏa mãn filter và đi qua map.",
      },
      {
        id: "c",
        text: "It automatically spins up an asynchronous thread pool for each intermediate step and joins them at the terminal operation.",
        explanationVi:
          "Sai: Stream tuần tự (sequential stream) chạy hoàn toàn trên luồng gọi (calling thread), không tạo thêm thread nào.",
      },
      {
        id: "d",
        text: "It compiles the pipeline directly into native C GPU instructions via Project Panama.",
        explanationVi:
          "Sai: Stream API là kiến trúc tầng thư viện chuẩn Java dựa trên Spliterator và Sink pipelines.",
      },
    ],
    correctChoiceIds: ["b"],
    correctExplanationVi:
      "Stream API áp dụng cơ chế Lazy Evaluation kết hợp Loop Fusion: các bước filter và map được hợp nhất vào một lượt duyệt duy nhất trên từng phần tử, và short-circuiting operation (findFirst) sẽ kết thúc xử lý ngay khi tìm thấy phần tử hợp lệ đầu tiên mà không duyệt phần còn lại của danh sách.",
    sourceIds: ["jsr-335-streams"],
  },
  {
    id: "java-q6-parallel-stream-pitfall",
    moduleId: "java-streams-lazy-evaluation",
    domainId: "java",
    type: "multiple-response",
    stem: "Which TWO engineering hazards are associated with executing blocking I/O calls (e.g., HTTP REST calls, slow SQL queries) inside a Java parallel stream (list.parallelStream())? Select TWO.",
    choices: [
      {
        id: "a",
        text: "Parallel streams share the JVM-wide ForkJoinPool.commonPool(). Blocking threads in this pool starves all other parallel streams and CompletableFuture async tasks across the entire application.",
        explanationVi:
          "Chính xác: ForkJoinPool.commonPool() là tài nguyên tĩnh dùng chung cho toàn bộ JVM. Nếu một tác vụ làm nghẽn các worker threads bằng I/O chặn, tất cả các tác vụ song song khác trong hệ thống sẽ bị tê liệt.",
      },
      {
        id: "b",
        text: "Parallel streams automatically disable all thread safety checks in concurrent collections.",
        explanationVi:
          "Sai: Bản thân collection không bị 'vô hiệu hóa' thread safety, nhưng việc biến đổi các trạng thái dùng chung (shared mutable state) trong stream lambda sẽ gây ra race condition.",
      },
      {
        id: "c",
        text: "Parallel streams are designed specifically for CPU-bound computations with low coordination overhead; using them for high-latency I/O destroys throughput due to thread saturation.",
        explanationVi:
          "Chính xác: ForkJoinPool sử dụng thuật toán Work-Stealing tối ưu cho các bài toán phân rã (divide-and-conquer) CPU-bound. Khi gặp I/O blocking, các worker thread không thể trộm việc và bị treo hoàn toàn.",
      },
      {
        id: "d",
        text: "Parallel streams will throw an UnsupportedOperationException if any lambda takes longer than 100 milliseconds.",
        explanationVi:
          "Sai: Java runtime không có cơ chế tự động ném ngoại lệ timeout theo thời gian thực thi của lambda.",
      },
    ],
    correctChoiceIds: ["a", "c"],
    correctExplanationVi:
      "Parallel streams mặc định dùng chung ForkJoinPool.commonPool(), được thiết kế cho các tác vụ tính toán CPU-bound. Việc đưa I/O chặn vào parallel stream sẽ gây cạn kiệt thread pool dùng chung của toàn bộ ứng dụng.",
    sourceIds: ["jsr-335-streams"],
  },

  // Java 21 Virtual Threads Questions
  {
    id: "java-q7-virtual-threads-yield",
    moduleId: "java-virtual-threads-loom",
    domainId: "java",
    type: "single-choice",
    stem: "In Java 21 (Project Loom), what happens when a Virtual Thread executes a blocking network socket read (e.g., Socket.getInputStream().read())?",
    choices: [
      {
        id: "a",
        text: "The underlying OS Carrier Thread is put into an OS kernel BLOCKED state, consuming 1 MB of physical RAM until the network packet arrives.",
        explanationVi:
          "Sai: Đây là hành vi truyền thống của Platform Thread (1:1 OS Thread), không phải của Virtual Thread.",
      },
      {
        id: "b",
        text: "The Virtual Thread's Continuation yields: its execution stack is copied to the JVM heap, it unmounts from the Carrier Thread, and the Carrier Thread is immediately free to execute another Virtual Thread.",
        explanationVi:
          "Chính xác: JEP 444 định nghĩa lại các API I/O chặn trong JDK. Khi không có dữ liệu, Virtual Thread thực hiện Continuation.yield(), unmount khỏi Carrier Thread. Carrier Thread lập tức nhận task khác từ ForkJoinPool.",
      },
      {
        id: "c",
        text: "The JVM automatically throws a SocketTimeoutException to prevent threads from hanging.",
        explanationVi:
          "Sai: Socket read vẫn chặn theo đúng ngữ nghĩa tuần tự (sequential blocking semantics) đối với mã nguồn người dùng, nhưng không làm nghẽn thread của hệ điều hành.",
      },
      {
        id: "d",
        text: "The JVM spins up a new OS kernel thread to take over the waiting socket descriptor.",
        explanationVi:
          "Sai: JVM sử dụng một Poller thread ngầm duy nhất (dựa trên epoll/kqueue) để giám sát các socket descriptor mà không sinh thêm OS thread.",
      },
    ],
    correctChoiceIds: ["b"],
    correctExplanationVi:
      "Khi gặp thao tác I/O chặn, Continuation của Virtual Thread sẽ unmount khỏi OS Carrier Thread và lưu stack frame tạm thời trên Heap. Carrier Thread được giải phóng tức thì để phục vụ các Virtual Thread khác, mang lại khả năng xử lý hàng triệu kết nối đồng thời.",
    sourceIds: ["jep-444-virtual-threads"],
  },
  {
    id: "java-q8-thread-pinning-hazard",
    moduleId: "java-virtual-threads-loom",
    domainId: "java",
    type: "multiple-response",
    stem: "What causes 'Thread Pinning' in Java 21 Virtual Threads, and how should backend engineers resolve it? Select TWO.",
    choices: [
      {
        id: "a",
        text: "Thread Pinning occurs when a Virtual Thread executes a blocking operation inside a synchronized block/method or a native JNI method call.",
        explanationVi:
          "Chính xác: Khi nằm trong khối synchronized hoặc gọi native C frame, HotSpot hiện chưa thể tháo rời call stack khỏi OS thread. Virtual Thread bị ghim (pinned) vào Carrier Thread, khiến Carrier Thread bị nghẽn hoàn toàn.",
      },
      {
        id: "b",
        text: "Replace legacy synchronized blocks protecting blocking I/O with java.util.concurrent.locks.ReentrantLock to allow clean Continuation unmounting.",
        explanationVi:
          "Chính xác: ReentrantLock được hiện thực hóa dựa trên LockSupport.park() và AQS, hoàn toàn tương thích với Virtual Threads và cho phép unmount Carrier Thread sạch sẽ khi chờ khóa.",
      },
      {
        id: "c",
        text: "Increase the number of Carrier Threads to 1,000,000 using the -XX:CarrierThreadMultiplier flag.",
        explanationVi:
          "Sai: Carrier Threads là các OS thread thực tế. Việc tạo hàng triệu OS thread sẽ làm sập hệ thống vì cạn kiệt bộ nhớ ảo và chi phí context switch.",
      },
      {
        id: "d",
        text: "Thread Pinning is a harmless cosmetic warning that has zero impact on application latency or concurrency throughput.",
        explanationVi:
          "Sai: Pinning làm giảm trầm trọng khả năng mở rộng của hệ thống vì các worker của Carrier Pool bị khóa chặt, dẫn đến cạn kiệt pool và tắc nghẽn toàn bộ dịch vụ.",
      },
    ],
    correctChoiceIds: ["a", "b"],
    correctExplanationVi:
      "Thread Pinning xảy ra khi Virtual Thread thực thi I/O chặn bên trong khối 'synchronized' hoặc qua native JNI. Để khắc phục, kỹ sư cần thay thế 'synchronized' bằng 'ReentrantLock' để cho phép Virtual Thread unmount Carrier Thread bình thường.",
    sourceIds: ["jep-444-virtual-threads"],
  },

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
