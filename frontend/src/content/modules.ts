import type { LearningModule } from "../domain";

export const learningModules: LearningModule[] = [
  // 1. Java Core & JVM Internals: Memory Management & Generational GC
  {
    id: "java-memory-heap-stack-gc",
    slug: "java-memory-heap-stack-gc",
    domainId: "java",
    title: "Java Memory Management — Stack Frames, Heap Layout & Generational Garbage Collection",
    subtitle:
      "Phân biệt Call Stack vs Heap, Vòng đời Young Gen (Eden, S0/S1), Thăng hạng Tenured và Cơ chế Dọn rác HotSpot",
    governanceStatus: "VERIFIED",
    estimatedMinutes: 25,
    difficulty: "Intermediate",
    simulationId: "java-memory-gc",
    keyTerms: [
      {
        term: "JVM Stack Frame",
        definitionVi:
          "Vùng nhớ được cấp phát trên Thread Stack mỗi khi một phương thức được gọi. Chứa Local Variable Table (biến nguyên thủy và con trỏ tham chiếu), Operand Stack, và Frame Data. Tự động giải phóng ngay khi hàm return với chi phí 0 ns GC.",
      },
      {
        term: "GC Roots",
        definitionVi:
          "Các đối tượng đặc biệt làm điểm bắt đầu truy vết khả năng tiếp cận (Reachability Analysis) của Garbage Collector. Bao gồm: biến cục bộ trong Stack Frame, static fields của loaded classes, JNI global/local references.",
      },
      {
        term: "Weak Generational Hypothesis",
        definitionVi:
          "Giả thuyết thế hệ thực nghiệm chứng minh rằng 95% đến 98% đối tượng trong ứng dụng Java chết ngay sau khi được khởi tạo. Đây là nền tảng cho việc chia tách Heap thành Young Generation và Old Generation.",
      },
      {
        term: "Tenuring Threshold",
        definitionVi:
          "Số chu kỳ Minor GC tối đa mà một đối tượng có thể sống sót trong Survivor Spaces (S0/S1) trước khi được HotSpot GC thăng hạng (promoted) sang Old Generation (Tenured).",
      },
    ],
    stages: {
      what: {
        heading: "1. Khái niệm cốt lõi (WHAT)",
        paragraphs: [
          "Trong kiến trúc Java Virtual Machine (JVM Runtime Data Areas), bộ nhớ thực thi của ứng dụng được chia thành hai vùng chính có vòng đời và hành vi hoàn toàn khác biệt: Thread Call Stack và Heap Memory.",
          "Thread Stack lưu trữ các Stack Frame đại diện cho lời gọi hàm đang hoạt động. Mỗi Stack Frame chứa các biến nguyên thủy (int, long, boolean, double) và các biến tham chiếu (reference pointer) trỏ đến địa chỉ thực của đối tượng. Khi một hàm kết thúc, Stack Frame bị pop và toàn bộ biến cục bộ bị xóa tức thì mà không cần bất kỳ sự can thiệp nào từ Garbage Collector.",
          "Ngược lại, Heap Memory là vùng nhớ dùng chung (shared memory) cho toàn bộ JVM, nơi mọi thể hiện của Object (vd: new Order(), new User()) và mảng (arrays) được cấp phát. Do không thể tự động giải phóng khi hàm kết thúc, JVM sử dụng Garbage Collector (GC) để tự động thu hồi các vùng nhớ không còn được tham chiếu từ GC Roots.",
        ],
        bulletPoints: [
          "Stack: Thread-safe riêng biệt cho từng luồng, truy cập cực nhanh, dung lượng nhỏ (mặc định 1MB), tự hủy khi hàm kết thúc.",
          "Heap: Dùng chung đa luồng, quản lý bởi Garbage Collector, chia thành Young Gen (Eden + S0/S1) và Old Gen (Tenured).",
          "Metaspace: Nằm ở Native Memory ngoài Heap (từ Java 8 thay thế PermGen), lưu trữ Class metadata, Bytecode, và Constant Pool.",
        ],
      },
      why: {
        heading: "2. Tại sao HotSpot chia tách Heap thành các Thế Hệ? (WHY)",
        paragraphs: [
          "Nếu Heap là một không gian phẳng nguyên khối khổng lồ, mỗi lần dọn rác, JVM sẽ phải quét toàn bộ hàng chục Gigabyte bộ nhớ để đánh dấu đối tượng sống (Mark-Sweep-Compact). Quá trình này sẽ gây ra hiện tượng Stop-The-World (STW) kéo dài hàng chục giây hoặc thậm chí hàng phút, làm sập dịch vụ Backend.",
          "Để giải quyết triệt để vấn đề này, các kỹ sư JVM áp dụng Giả thuyết Thế Hệ (Weak Generational Hypothesis):",
        ],
        bulletPoints: [
          "Đa số đối tượng (98%) có vòng đời cực ngắn: chỉ sinh ra để phục vụ tính toán trong một phương thức (vd: StringBuilder, DTO, JSON parser buffer) rồi trở thành rác ngay khi hàm return.",
          "Rất ít đối tượng tồn tại lâu dài: chỉ các singleton beans (Spring @Service, @Repository), connection pool, và in-memory caches mới sống sót qua thời gian.",
        ],
        callout: {
          tone: "note",
          title: "Ý nghĩa của việc phân chia thế hệ",
          body: "Bằng cách dồn các đối tượng mới vào Young Generation (Eden), Minor GC chỉ cần tập trung quét một vùng nhớ nhỏ trong vài mili-giây bằng thuật toán sao chép (Evacuation Copy). Chỉ những đối tượng sống sót qua nhiều chu kỳ (vượt ngưỡng Tenuring Threshold) mới được chuyển sang Old Gen.",
        },
      },
      how: {
        heading: "3. Vòng đời Cấp phát & Chu kỳ Thu gom rác (HOW)",
        paragraphs: [
          "Vòng đời của một đối tượng Java diễn ra tuần tự qua các giai đoạn nghiêm ngặt:",
          "1. Cấp phát trên Eden: Khi từ khóa new được thực thi, đối tượng được cấp phát trực tiếp trên Eden Space. HotSpot sử dụng Thread-Local Allocation Buffer (TLAB) để cấp phát vùng nhớ không cần tranh chấp khóa đa luồng (lock-free bump-the-pointer).",
          "2. Kích hoạt Minor GC (Eden đầy): Khi Eden không còn đủ chỗ chứa đối tượng mới, JVM tạm dừng luồng ứng dụng (Stop-The-World trong thời gian ngắn) để chạy Minor GC.",
          "3. Quét GC Roots & Sơ tán (Evacuation Copy): GC truy vết các đối tượng còn sống bắt đầu từ các GC Roots (biến trên Stack Frame hiện tại). Các đối tượng sống từ Eden và From-Survivor được sao chép sang To-Survivor. Tuổi thọ (tenuringAge) của chúng tăng thêm 1. Toàn bộ đối tượng chết trên Eden và From-Survivor bị quét sạch.",
          "4. Đổi vai trò Survivor (From/To Swap): Hai vùng S0 và S1 hoán đổi vai trò cho nhau. Vùng vừa nhận đối tượng trở thành From-Survivor, vùng còn lại để trống làm To-Survivor cho chu kỳ tới.",
          "5. Thăng hạng sang Old Gen (Promotion): Khi một đối tượng có tenuringAge >= TenuringThreshold (mặc định 15 hoặc tự điều chỉnh), nó được di chuyển vĩnh viễn sang Old Gen.",
          "6. Major / Full GC: Khi Old Gen bị đầy, JVM kích hoạt Major GC (hoặc Full GC) để dọn dẹp và dồn nén bộ nhớ (Compaction). Quá trình này tốn nhiều CPU và thời gian STW dài hơn đáng kể.",
        ],
      },
      internals: {
        heading: "4. Cơ chế nội tại: Object Header, Mark Word & Card Table (INTERNALS)",
        paragraphs: [
          "Mỗi đối tượng trên Java Heap được lưu trữ với một Object Header gồm 2 phần chính:",
          "1. Mark Word (32-bit hoặc 64-bit): Lưu mã băm (identity hashCode), cờ khóa (Locking state: Biased, Lightweight, Heavyweight), và đặc biệt là 4 bit dành cho Tenuring Age (do chỉ có 4 bit nên tuổi tối đa chỉ có thể là 15: 2^4 - 1 = 15).",
          "2. Klass Word: Con trỏ trỏ tới siêu dữ liệu Class Metadata của đối tượng trong Metaspace.",
          "Để tránh việc Minor GC phải quét toàn bộ Old Gen nhằm tìm kiếm các tham chiếu từ Old Gen trỏ ngược về Young Gen, HotSpot sử dụng cấu trúc Card Table kết hợp Write Barrier: mỗi byte trong Card Table đại diện cho một khối 512 byte trong Old Gen. Khi có con trỏ ghi từ Old Gen sang Young Gen, byte tương ứng bị đánh dấu là 'dirty'. Minor GC chỉ cần quét các card bị dirty thay vì toàn bộ Old Gen.",
        ],
        codeSnippet: {
          language: "bash",
          caption: "Các tham số JVM HotSpot thiết yếu để cấu hình bộ nhớ và GC",
          code: `# Thiết lập dung lượng Heap tối thiểu và tối đa bằng nhau để tránh co giãn runtime
java -Xms4g -Xmx4g \\
     -XX:+UseG1GC \\
     -XX:MaxGCPauseMillis=200 \\
     -XX:InitiatingHeapOccupancyPercent=45 \\
     -XX:SurvivorRatio=8 \\
     -XX:MaxTenuringThreshold=15 \\
     -Xlog:gc*,gc+phases=debug:file=/var/log/app/gc.log:time,uptime,pid:filecount=5,filesize=50m \\
     -jar backend-service.jar`,
        },
      },
      tradeOffs: {
        heading: "5. Phân tích đánh đổi giữa các bộ thu gom rác (TRADE-OFFS)",
        paragraphs: [
          "Không có bộ Garbage Collector nào hoàn hảo cho mọi kịch bản. Việc lựa chọn phụ thuộc vào sự cân bằng giữa Throughput (Thông lượng CPU) và Latency (Độ trễ P99 Stop-The-World):",
        ],
        bulletPoints: [
          "Parallel GC (-XX:+UseParallelGC): Tối đa hóa Throughput tính toán batch job (99% thời gian CPU cho app), nhưng thời gian STW pause có thể dài từ vài trăm ms đến vài giây.",
          "G1 GC (-XX:+UseG1GC): Mặc định từ Java 9. Chia heap thành hàng ngàn Region độc lập (~1MB đến 32MB). Cho phép đặt mục tiêu độ trễ tối đa (-XX:MaxGCPauseMillis=200). Cân bằng hoàn hảo cho microservices.",
          "ZGC (-XX:+UseZGC): Bộ thu gom rác thế hệ mới (Generational ZGC trong Java 21). Sử dụng Colored Pointers và Load Barriers để thực hiện dọn dẹp đồng thời (Concurrent). Đạt độ trễ Pause cực thấp (< 1 mili-giây) ngay cả với Heap dung lượng lên tới 16 Terabytes, nhưng tiêu tốn thêm khoảng 2-5% CPU overhead.",
        ],
      },
      failureScenarios: {
        heading: "6. Các kịch bản sự cố bộ nhớ thực tế (FAILURE SCENARIOS)",
        paragraphs: [
          "1. Memory Leak thông qua Static Collection: Thêm đối tượng vào một static List, Map hoặc Cache nội bộ không có cơ chế TTL/Eviction. Do biến static được neo vào ClassLoader (một GC Root vĩnh viễn), các đối tượng này không bao giờ bị thu hồi, dần dần lấp đầy Old Gen và dẫn đến java.lang.OutOfMemoryError: Java heap space.",
          "2. GC Overhead Limit Exceeded: Ứng dụng dành hơn 98% thời gian CPU cho GC nhưng chỉ thu hồi được dưới 2% heap. JVM chủ động ném OutOfMemoryError để ngăn chặn việc ứng dụng đóng băng hoàn toàn.",
          "3. Premature Promotion: Do Eden Space quá nhỏ hoặc tần suất cấp phát đột biến (allocation burst), các đối tượng ngắn ngày bị tràn khỏi Survivor Space và bị đẩy sớm sang Old Gen khi chưa đủ tuổi (tenuring age thấp). Khiến Old Gen nhanh đầy và kích hoạt Full GC thường xuyên.",
        ],
        callout: {
          tone: "warning",
          title: "Cạm bẫy ThreadLocal Memory Leak",
          body: "Trong môi trường Servlet/Tomcat sử dụng Thread Pool, các Worker Thread được tái sử dụng liên tục. Nếu gọi ThreadLocal.set() mà không đảm bảo gọi ThreadLocal.remove() trong khối finally, dữ liệu của request cũ sẽ bị rò rỉ và tồn tại vĩnh viễn trên ThreadLocalMap của worker thread.",
        },
      },
      productionEngineering: {
        heading: "7. Kinh nghiệm vận hành Production (PRODUCTION ENGINEERING)",
        paragraphs: [
          "Để vận hành ứng dụng Java ổn định ở quy mô lớn, kỹ sư Backend cần áp dụng các chuẩn thực hành sau:",
          "1. Luôn cấu hình -Xms bằng -Xmx để ngăn chặn việc JVM phải xin cấp phát thêm bộ nhớ từ hệ điều hành trong quá trình chạy, loại bỏ overhead co giãn heap.",
          "2. Bật GC Logging chi tiết với cờ -Xlog:gc* để phân tích P99 pause times và phân bổ thế hệ thông qua các công cụ như GCeasy hoặc JDK Mission Control.",
          "3. Kích hoạt cờ tự động chụp ảnh Heap Dump khi gặp sự cố: -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/var/dumps/heap_oom.hprof.",
          "4. Với Java 21+, ưu tiên thử nghiệm Generational ZGC (-XX:+UseZGC -XX:+ZGenerational) cho các dịch vụ tài chính, thanh toán hoặc API Gateway yêu cầu độ trễ P99 siêu nghiêm ngặt.",
        ],
      },
    },
    sourceIds: ["jvm-spec-se21"],
    questionIds: ["java-q1-stack-vs-heap", "java-q2-generational-promotion"],
  },

  // 2. Java Core Collections: HashMap Internals & Treeification
  {
    id: "java-hashmap-treeification",
    slug: "java-hashmap-treeification",
    domainId: "java",
    title: "Java Collections — HashMap Internals, Hash Collisions & Red-Black Treeification",
    subtitle:
      "Giải phẫu mảng Node<K,V>[], Hàm băm Perturbation, Ngưỡng Treeify 8 và Thuật toán Tách chuỗi khi Resize x2",
    governanceStatus: "VERIFIED",
    estimatedMinutes: 25,
    difficulty: "Intermediate",
    simulationId: "java-hashmap-treeification",
    keyTerms: [
      {
        term: "Perturbation Function",
        definitionVi:
          "Hàm phân tán bit: (h = key.hashCode()) ^ (h >>> 16). Dịch chuyển và XOR 16 bit bậc cao xuống 16 bit bậc thấp nhằm giảm thiểu va chạm khi bảng băm có kích thước nhỏ.",
      },
      {
        term: "Bitwise Indexing",
        definitionVi:
          "Công thức tính chỉ số bucket: (capacity - 1) & hash. Nhờ dung lượng luôn là lũy thừa của 2, phép toán bitwise AND này cho kết quả tương đương toán học với phép chia dư hash % capacity nhưng thực thi ở tốc độ nano giây.",
      },
      {
        term: "TREEIFY_THRESHOLD (8)",
        definitionVi:
          "Ngưỡng số lượng Node va chạm trong một bucket kích hoạt việc chuyển đổi từ Singly-Linked List thành Cây Đỏ-Đen (Red-Black Tree TreeNode), giảm độ phức tạp tìm kiếm từ O(n) xuống O(log n).",
      },
      {
        term: "Load Factor (0.75)",
        definitionVi:
          "Hệ số tải mặc định 0.75, điểm cân bằng tối ưu giữa chi phí không gian bộ nhớ (space overhead) và thời gian truy xuất (time complexity) theo phân phối Poisson.",
      },
    ],
    stages: {
      what: {
        heading: "1. Khái niệm cốt lõi (WHAT)",
        paragraphs: [
          "java.util.HashMap là cấu trúc dữ liệu bảng băm (hash table) quan trọng nhất trong hệ sinh thái Java. Nó cung cấp các thao tác put(), get(), remove() với độ phức tạp trung bình O(1) dựa trên cặp khóa-giá trị (Key-Value pairs).",
          "Bên trong, HashMap được cấu tạo bởi một mảng các bucket: Node<K,V>[] table. Mỗi bucket là điểm neo của một danh sách liên kết đơn (Singly-Linked List) hoặc một Cây Đỏ-Đen (Red-Black Tree) nhằm giải quyết hiện tượng va chạm băm (Hash Collision) khi hai khóa khác nhau cùng ánh xạ về một chỉ số mảng.",
        ],
        bulletPoints: [
          "Dung lượng ban đầu (DEFAULT_INITIAL_CAPACITY): 16 slots.",
          "Hệ số tải (DEFAULT_LOAD_FACTOR): 0.75.",
          "Ngưỡng mở rộng (Threshold): capacity * loadFactor (16 * 0.75 = 12 phần tử).",
          "Ngưỡng Treeify: 8 phần tử trong một bucket kết hợp dung lượng bảng tối thiểu 64.",
        ],
      },
      why: {
        heading: "2. Tại sao Java 8 giới thiệu Treeification? (WHY)",
        paragraphs: [
          "Trong Java 7 trở về trước, mọi va chạm băm trong một bucket đều được giải quyết đơn thuần bằng danh sách liên kết đơn. Khi kẻ tấn công cố tình tạo ra hàng ngàn chuỗi ký tự khác nhau nhưng có cùng hashCode() (tấn công Hash Collision DoS / HashDOS), toàn bộ dữ liệu sẽ dồn vào một bucket duy nhất.",
          "Hậu quả: Độ phức tạp của thao tác get() và put() thoái hóa nghiêm trọng từ O(1) thành O(n). Một request HTTP chứa 10,000 form parameters va chạm có thể khiến CPU của máy chủ nhảy vọt lên 100% trong hàng chục giây, gây nghẽn toàn bộ dịch vụ Backend.",
        ],
        callout: {
          tone: "warning",
          title: "Giải pháp Red-Black Tree trong Java 8",
          body: "Bắt đầu từ Java 8 (JEP 180), khi số phần tử trong một bucket chạm ngưỡng 8 và dung lượng mảng đạt ít nhất 64, bucket sẽ tự động chuyển hóa thành Cây Đỏ-Đen (TreeNode). Điều này chặn đứng hoàn toàn nguy cơ HashDOS bằng cách đảm bảo thời gian tra cứu tồi nhất luôn là O(log n).",
        },
      },
      how: {
        heading: "3. Quy trình tính toán Băm & Chèn dữ liệu (HOW)",
        paragraphs: [
          "Khi thực hiện put(key, value), HashMap thực thi theo quy trình 4 bước chính xác:",
          "1. Tính mã băm phân tán (Perturbation Hash): Gọi key.hashCode() để lấy số nguyên 32-bit h, sau đó thực hiện XOR với chính nó đã dịch phải 16 bit: hash = (h ^ (h >>> 16)).",
          "2. Tính vị trí Bucket (Index Mapping): Xác định chỉ số mảng qua công thức bitwise: index = (n - 1) & hash (trong đó n là capacity).",
          "3. Duyệt và Xử lý va chạm: Nếu bucket [index] trống, tạo Node mới làm Head. Nếu đã có dữ liệu, duyệt qua chuỗi: nếu tìm thấy key trùng (thỏa mãn p.hash == hash && (p.key == key || key.equals(p.key))), ghi đè value. Nếu không trùng, nối Node mới vào đuôi danh sách (tail-insertion).",
          "4. Kiểm tra ngưỡng Treeify & Resize: Nếu độ dài chuỗi node >= 8, kích hoạt treeifyBin(). Sau đó, nếu tổng số phần tử (size) vượt quá threshold, kích hoạt resize() nhân đôi dung lượng mảng.",
        ],
      },
      internals: {
        heading: "4. Cơ chế nội tại: Phép toán Bitwise & Tách chuỗi khi Resize (INTERNALS)",
        paragraphs: [
          "Hai đột phá kỹ thuật nổi bật nhất trong source code java.util.HashMap của OpenJDK:",
          "1. Tại sao capacity luôn là lũy thừa của 2? Vì khi n là lũy thừa của 2, (n - 1) luôn có dạng nhị phân toàn số 1 (vd: n = 16 = 0001 0000 -> n - 1 = 15 = 0000 1111). Phép toán (n - 1) & hash đóng vai trò như một bộ lọc bit (bitmask), giữ lại các bit thấp nhất. Kết quả hoàn toàn tương đương với hash % n nhưng chạy nhanh hơn gấp hàng chục lần vì thực thi trực tiếp trên mạch logic bit của CPU.",
          "2. Thuật toán tách chuỗi (High-Bit Split) khi Resize: Trong Java 7, khi resize, từng phần tử phải tính lại chỉ số index và chèn ngược vào đầu (head-insertion), gây ra lỗi vòng lặp vô tận (Infinite Loop Deadlock) kinh điển khi chạy đa luồng. Trong Java 8+, HashMap sử dụng tail-insertion kết hợp kiểm tra bit: (e.hash & oldCap) == 0. Nếu bằng 0, node giữ nguyên ở vị trí cũ (index). Nếu khác 0, node chuyển sang vị trí mới chính xác bằng (index + oldCap). Không cần tính toán lại bất kỳ phép toán băm nào!",
        ],
        codeSnippet: {
          language: "java",
          caption: "Trích xuất thuật toán phân tán băm và kiểm tra bit từ OpenJDK HashMap",
          code: `// 1. Hàm phân tán bit bậc cao (Perturbation spread)
static final int hash(Object key) {
    int h;
    return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
}

// 2. Tính vị trí bucket bằng bitwise AND
int index = (capacity - 1) & hash;

// 3. Phân tách chuỗi khi Resize nhân đôi (Java 8+)
Node<K,V> loHead = null, loTail = null; // Giữ nguyên vị trí index cũ
Node<K,V> hiHead = null, hiTail = null; // Chuyển sang (index + oldCap)
do {
    next = e.next;
    if ((e.hash & oldCap) == 0) {
        if (loTail == null) loHead = e; else loTail.next = e;
        loTail = e;
    } else {
        if (hiTail == null) hiHead = e; else hiTail.next = e;
        hiTail = e;
    }
} while ((e = next) != null);`,
        },
      },
      tradeOffs: {
        heading: "5. Phân tích đánh đổi kỹ thuật (TRADE-OFFS)",
        paragraphs: [
          "Treeification mang lại sự bảo mật và tính ổn định thời gian, nhưng đi kèm các đánh đổi:",
        ],
        bulletPoints: [
          "Memory Footprint: Một Node thông thường chỉ gồm 4 trường (hash, key, value, next). Một TreeNode (Red-Black Tree) cần thêm parent, left, right, prev, và boolean red/black, tiêu tốn bộ nhớ gấp đôi. Đây là lý do Java chỉ treeify khi thực sự cần thiết (ngưỡng 8).",
          "Load Factor 0.75: Giảm loadFactor xuống 0.5 giúp giảm tối đa va chạm nhưng lãng phí 50% bộ nhớ. Tăng lên 1.0 tiết kiệm RAM nhưng làm tăng số lượng va chạm và thời gian lookup.",
          "Thread Safety: HashMap KHÔNG thread-safe. Trong môi trường đồng thời, bắt buộc phải sử dụng ConcurrentHashMap thay vì Collections.synchronizedMap() để đạt thông lượng cao nhờ kỹ thuật Lock Striping / CAS trên từng bucket node.",
        ],
      },
      failureScenarios: {
        heading: "6. Các kịch bản sự cố thực tế (FAILURE SCENARIOS)",
        paragraphs: [
          "1. Vi phạm hợp đồng equals() và hashCode(): Ghi đè (override) equals() nhưng quên ghi đè hashCode(). Kết quả: Hai đối tượng có cùng thuộc tính logic nhưng lại sinh ra hai mã băm khác nhau, khiến map.get(key) trả về null ngay sau khi map.put(key, val).",
          "2. Mutable Object làm Key: Đưa một đối tượng có thể thay đổi trạng thái (Mutable) làm Key, sau đó sửa đổi thuộc tính cấu thành hashCode() của đối tượng. Mã băm bị thay đổi khiến HashMap tra cứu sai bucket và làm 'biến mất' phần tử khỏi bảng băm vĩnh viễn (Memory Leak ngầm).",
          "3. Concurrency Race Condition: Dùng HashMap thường trong môi trường đa luồng (multi-threaded). Khi nhiều luồng cùng gọi put() gây resize đồng thời, kích thước size bị sai lệch hoặc mất mát dữ liệu (silent data loss).",
        ],
        callout: {
          tone: "warning",
          title: "Luôn dùng Immutable Object làm Key",
          body: "Luôn sử dụng các kiểu dữ liệu bất biến (Immutable) như String, Integer, UUID, hoặc Java 17+ Record làm Key cho HashMap để đảm bảo mã hashCode() không bao giờ bị biến động sau khi đã đưa vào bảng.",
        },
      },
      productionEngineering: {
        heading: "7. Kinh nghiệm vận hành Production (PRODUCTION ENGINEERING)",
        paragraphs: [
          "Các bài học thực chiến khi làm việc với Collections trong Backend quy mô lớn:",
          "1. Luôn ước lượng và cấu hình initialCapacity: Nếu biết trước map sẽ chứa khoảng 1,000 phần tử, hãy khởi tạo: new HashMap<>(Math.ceil(1000 / 0.75) + 1) tức là 1,334 (làm tròn lên lũy thừa 2 là 2,048). Điều này triệt tiêu hoàn toàn chi phí rehash và resize bảng.",
          "2. Với ConcurrentHashMap trong Java 8+, cơ chế khóa đã chuyển từ Segment locking sang CAS lock-free trên head node rỗng và synchronized chỉ trên first node của bucket va chạm, đạt hiệu năng đọc song song vượt trội.",
          "3. Khi cần bảo toàn thứ tự chèn (insertion order) cho audit trail, sử dụng LinkedHashMap. Khi cần sắp xếp tự nhiên theo Key, sử dụng TreeMap.",
        ],
      },
    },
    sourceIds: ["openjdk-hashmap-source"],
    questionIds: ["java-q3-hashmap-indexing", "java-q4-treeify-threshold"],
  },

  // 3. Java 8+ Functional & Stream API Internals
  {
    id: "java-streams-lazy-evaluation",
    slug: "java-streams-lazy-evaluation",
    domainId: "java",
    title: "Java 8+ — Stream API Internals, Lazy Evaluation & Pipeline Fusion",
    subtitle:
      "Kiến trúc Spliterator, Khác biệt Intermediate vs Terminal Ops, Loop Fusion và Hiểm họa ForkJoinPool.commonPool",
    governanceStatus: "VERIFIED",
    estimatedMinutes: 20,
    difficulty: "Foundational",
    keyTerms: [
      {
        term: "Functional Interface",
        definitionVi:
          "Interface chỉ chứa duy nhất một phương thức trừu tượng (Single Abstract Method - SAM), được đánh dấu bằng @FunctionalInterface (vd: Function<T,R>, Predicate<T>, Consumer<T>, Supplier<T>), làm nền tảng cho cú pháp Lambda Expressions.",
      },
      {
        term: "Lazy Evaluation (Đánh giá Lười biếng)",
        definitionVi:
          "Cơ chế trong Stream API: các thao tác trung gian (filter, map) không hề thực thi ngay khi được khai báo, mà chỉ tạo ra các mô tả pipeline. Việc tính toán chỉ thực sự diễn ra khi một thao tác kết thúc (Terminal Operation) được kích hoạt.",
      },
      {
        term: "Loop Fusion (Hợp nhất Vòng lặp)",
        definitionVi:
          "Kỹ thuật tối ưu hóa của Stream engine: thay vì duyệt qua danh sách nhiều lần và tạo các collection trung gian, Stream hợp nhất tất cả các bước filter, map thành một lượt duyệt duy nhất trên từng phần tử.",
      },
      {
        term: "Short-Circuiting Operation",
        definitionVi:
          "Các thao tác kết thúc cho phép dừng xử lý pipeline ngay khi điều kiện được thỏa mãn (vd: findFirst, anyMatch, limit) mà không cần duyệt hết các phần tử còn lại của nguồn dữ liệu vô hạn.",
      },
    ],
    stages: {
      what: {
        heading: "1. Khái niệm cốt lõi (WHAT)",
        paragraphs: [
          "Được giới thiệu trong Java 8 (JSR 335), Stream API đã cách mạng hóa phong cách lập trình Backend trong Java từ phong cách mệnh lệnh (Imperative Programming) với các vòng lặp for/while lồng nhau sang phong cách khai báo (Declarative / Functional Programming).",
          "Một Java Stream đại diện cho một chuỗi các phần tử (sequence of elements) hỗ trợ các thao tác tính toán tuần tự hoặc song song. Điểm cốt lõi: Stream không phải là một cấu trúc dữ liệu lưu trữ phần tử (nó không sở hữu dữ liệu), mà là một đường ống tính toán (computation pipeline) chuyển giao dữ liệu từ nguồn (Collection, Array, I/O channel) đến đích.",
        ],
        bulletPoints: [
          "Nguồn dữ liệu (Source): Collection.stream(), Arrays.stream(), Stream.of(), Files.lines().",
          "Thao tác trung gian (Intermediate Operations): filter, map, flatMap, distinct, sorted, peek. Luôn trả về một Stream mới và luôn ở trạng thái LAZY.",
          "Thao tác kết thúc (Terminal Operations): forEach, collect, toList, reduce, count, findFirst, anyMatch. Kích hoạt dòng chảy dữ liệu và đóng stream.",
        ],
      },
      why: {
        heading: "2. Tại sao Stream API vượt trội hơn Vòng lặp truyền thống? (WHY)",
        paragraphs: [
          "Khi xử lý tập dữ liệu lớn với nhiều bước biến đổi trong lập trình truyền thống:",
          "1. Lãng phí Bộ nhớ nghiêm trọng: Cách tiếp cận cũ thường tạo ra hàng loạt các danh sách trung gian (vd: list lọc -> new ArrayList -> list biến đổi -> new ArrayList). Với hàng triệu bản ghi, việc này gây áp lực kinh hoàng lên Eden Space và kích hoạt GC liên tục.",
          "2. Không tận dụng được Short-circuiting: Muốn tìm bản ghi hợp lệ đầu tiên sau 3 bước lọc phức tạp, lập trình viên phải tự viết các cờ break rối rắm.",
          "Stream API giải quyết cả hai vấn đề bằng kiến trúc Pipeline Fusion: các phần tử được kéo (pull-based) qua từng tầng xử lý một cách đơn lẻ (element-by-element), loại bỏ 100% các danh sách trung gian.",
        ],
      },
      how: {
        heading: "3. Kiến trúc Vận hành chi tiết: Spliterator & Sink Chain (HOW)",
        paragraphs: [
          "Dưới tầng source code của OpenJDK, một Stream pipeline được xây dựng dựa trên 3 trụ cột:",
          "1. Spliterator (Splitable Iterator): Chịu trách nhiệm phân tách và duyệt qua các phần tử của nguồn. Phương thức tryAdvance() duyệt tuần tự từng phần tử, trong khi trySplit() chia đôi dữ liệu để phục vụ xử lý song song.",
          "2. ReferencePipeline: Mỗi lần gọi .filter() hoặc .map(), một đối tượng StatelessOp hoặc StatefulOp được khởi tạo và liên kết thành một danh sách liên kết kép (Doubly-Linked List) các công đoạn.",
          "3. Sink Chain: Khi thao tác terminal (vd: collect) được gọi, JVM dịch ngược pipeline thành một chuỗi các đối tượng Sink lồng nhau (Sink chain). Dữ liệu từ Spliterator được đẩy qua từng mắt xích của Sink. Nếu một mắt xích từ chối (vd: filter trả về false), phần tử đó bị loại bỏ ngay lập tức trước khi chạm tới các mắt xích phía sau.",
        ],
      },
      internals: {
        heading: "4. Cơ chế nội tại & Hiểm họa ForkJoinPool.commonPool (INTERNALS)",
        paragraphs: [
          "Một trong những tính năng hấp dẫn nhất của Stream API là khả năng chuyển đổi sang xử lý song song chỉ bằng một cú gọi: list.parallelStream().",
          "Tuy nhiên, cơ chế bên dưới của parallelStream() ẩn chứa một hiểm họa kiến trúc lớn: Mặc định, tất cả các parallel stream trong toàn bộ tiến trình JVM đều chia sẻ chung duy nhất một ForkJoinPool tĩnh: ForkJoinPool.commonPool(), với số lượng worker thread bằng (Runtime.getRuntime().availableProcessors() - 1).",
          "ForkJoinPool được thiết kế tối ưu tuyệt đối cho các tác vụ tính toán CPU-bound (chia để trị - divide and conquer). Nếu một lập trình viên vô tình gọi các tác vụ I/O chặn (Blocking I/O như HTTP call, gRPC, hoặc truy vấn JDBC) bên trong parallelStream, các worker thread của commonPool sẽ bị giữ chặt và đóng băng. Toàn bộ các luồng parallel stream khác của toàn bộ ứng dụng (kể cả CompletableFuture async) sẽ bị chết đói (thread starvation).",
        ],
        codeSnippet: {
          language: "java",
          caption: "Mẫu sử dụng Stream Pipeline tối ưu và tách biệt Thread Pool an toàn",
          code: `// 1. Pipeline lười biếng với Short-circuiting (Zero intermediate lists)
Optional<String> firstVip = customers.stream()
    .filter(c -> c.isActive())        // StatelessOp
    .filter(c -> c.isVip())           // StatelessOp
    .map(Customer::getEmail)         // StatelessOp
    .findFirst();                    // Terminal Short-circuit: dừng ngay khi tìm thấy 1 VIP

// 2. Xử lý song song an toàn với Custom ForkJoinPool thay vì dùng commonPool
ForkJoinPool customPool = new ForkJoinPool(4);
try {
    List<OrderResult> results = customPool.submit(() ->
        orders.parallelStream()
            .map(this::heavyCpuCalculation)
            .toList()
    ).get();
} finally {
    customPool.shutdown();
}`,
        },
      },
      tradeOffs: {
        heading: "5. Phân tích đánh đổi kỹ thuật (TRADE-OFFS)",
        paragraphs: [
          "So sánh giữa Stream API và Vòng lặp For truyền thống:",
        ],
        bulletPoints: [
          "Hiệu năng micro-benchmark: Với các danh sách nhỏ (< 1,000 phần tử cơ bản), vòng lặp for truyền thống nhanh hơn Stream API khoảng 10-20% do không có chi phí khởi tạo đối tượng Pipeline, Spliterator, và polymorphic call.",
          "Khả năng bảo trì mã nguồn (Readability): Stream API vượt trội hoàn toàn về độ trong sáng của code nghiệp vụ, giảm thiểu bug off-by-one và dễ dàng composition.",
          "Debugging: Debug một Stream pipeline phức tạp khó khăn hơn nhiều so với đặt breakpoint trong vòng lặp for (dù các IDE hiện đại đã hỗ trợ Stream Trace debugger).",
        ],
      },
      failureScenarios: {
        heading: "6. Các kịch bản sự cố thực tế (FAILURE SCENARIOS)",
        paragraphs: [
          "1. Tái sử dụng Stream đã đóng: Gọi terminal operation hai lần trên cùng một đối tượng Stream. JVM sẽ ném ngoại lệ java.lang.IllegalStateException: stream has already been operated upon or closed.",
          "2. Đột biến trạng thái dùng chung (Shared Mutable State): Truy cập và ghi vào biến bên ngoài từ trong parallelStream mà không có đồng bộ hóa: list.parallelStream().forEach(res::add). Sẽ dẫn đến race condition làm sai lệch kích thước hoặc ném ArrayIndexOutOfBoundsException.",
          "3. Infinite Stream không có Limit: Sử dụng Stream.iterate() hoặc Stream.generate() kết hợp với sorted() hoặc toList() mà quên limit(). Thao tác sorted() là StatefulOp đòi hỏi phải gom đủ toàn bộ phần tử mới có thể sắp xếp, dẫn đến OutOfMemoryError ngay lập tức.",
        ],
        callout: {
          tone: "production",
          title: "Quy tắc vàng với Parallel Streams",
          body: "KHÔNG BAO GIỜ sử dụng parallelStream() cho các tác vụ có dính líu đến I/O mạng hoặc database. Chỉ sử dụng parallelStream() cho các bài toán tính toán CPU thuần túy với số lượng phần tử đủ lớn (> 10,000 items).",
        },
      },
      productionEngineering: {
        heading: "7. Kinh nghiệm vận hành Production (PRODUCTION ENGINEERING)",
        paragraphs: [
          "Thực tiễn tốt nhất khi thiết kế code Backend với Stream API:",
          "1. Từ Java 16+, ưu tiên sử dụng .toList() thay vì .collect(Collectors.toList()) vì .toList() trả về unmodifiable list và tối ưu hóa cấp phát mảng nội bộ.",
          "2. Sử dụng Primitive Streams (IntStream, LongStream, DoubleStream) khi làm việc với số học để tránh chi phí Auto-boxing / Unboxing gây áp lực lên Heap GC.",
          "3. Trong kiến trúc bất đồng bộ (Asynchronous Architecture), kết hợp Stream với CompletableFuture: chuyển các Future thành Stream và dùng CompletableFuture.allOf() để tổng hợp kết quả non-blocking.",
        ],
      },
    },
    sourceIds: ["jsr-335-streams"],
    questionIds: ["java-q5-stream-lazy-fusion", "java-q6-parallel-stream-pitfall"],
  },

  // 4. Java 21 Modern Internals: Virtual Threads (Project Loom)
  {
    id: "java-virtual-threads-loom",
    slug: "java-virtual-threads-loom",
    domainId: "java",
    title: "Java 21 — Virtual Threads (Project Loom), Carrier Scheduling & Concurrency Internals",
    subtitle:
      "Mô hình M:N Threads, Cơ chế Continuation Yield khi I/O Chặn, và Cạm bẫy Thread Pinning với khối Synchronized",
    governanceStatus: "VERIFIED",
    estimatedMinutes: 30,
    difficulty: "Senior / Staff",
    simulationId: "java-virtual-threads",
    keyTerms: [
      {
        term: "Virtual Thread (JEP 444)",
        definitionVi:
          "Luồng người dùng (user-mode lightweight thread) do JVM quản lý trực tiếp thay vì hệ điều hành. Có chi phí khởi tạo siêu rẻ và kích thước stack co giãn trên Heap (vài KB), cho phép chạy hàng triệu luồng đồng thời.",
      },
      {
        term: "Carrier Thread",
        definitionVi:
          "Luồng hệ điều hành thực tế (OS Platform Thread) thuộc một ForkJoinPool ngầm của JVM, đóng vai trò 'vật mang' để mount và thực thi mã byte của Virtual Thread trên CPU core.",
      },
      {
        term: "Continuation.yield()",
        definitionVi:
          "Cơ chế cốt lõi của Project Loom: khi Virtual Thread gặp thao tác I/O chặn (Socket read/write), JVM tạm dừng luồng, lưu stack frame hiện tại lên Heap và unmount khỏi Carrier Thread, giải phóng Carrier Thread tức thì cho luồng khác.",
      },
      {
        term: "Thread Pinning",
        definitionVi:
          "Hiện tượng tiêu cực khi Virtual Thread thực thi I/O chặn bên trong khối synchronized hoặc qua native JNI call. JVM không thể unmount call stack, khiến Carrier Thread bị 'ghim chặt' và đóng băng, làm nghẽn toàn bộ Carrier Pool.",
      },
    ],
    stages: {
      what: {
        heading: "1. Khái niệm cốt lõi (WHAT)",
        paragraphs: [
          "Trong suốt 25 năm lịch sử của Java, mô hình luồng java.lang.Thread luôn là ánh xạ 1:1 trực tiếp với Luồng Hệ Điều Hành (OS Kernel Thread / Platform Thread). Mỗi khi tạo một new Thread(), hệ điều hành phải cấp phát một vùng nhớ Call Stack cố định (mặc định 1MB) và thực hiện chuyển đổi ngữ cảnh (Context Switching) đắt đỏ qua kernel space.",
          "Chính vì vậy, trong mô hình Thread-per-Request truyền thống của các web server như Tomcat/Spring Boot, một máy chủ chỉ có thể duy trì tối đa vài ngàn luồng trước khi cạn kiệt RAM và CPU do thrashing.",
          "Java 21 LTS chính thức giới thiệu Virtual Threads (Project Loom - JEP 444). Virtual Threads là mô hình luồng M:N: hàng triệu luồng ảo người dùng (Virtual Threads) được ánh xạ linh hoạt lên một số lượng nhỏ các luồng hệ điều hành (Carrier Threads).",
        ],
        bulletPoints: [
          "Platform Thread: 1:1 OS thread, ngốn 1MB RAM cố định, giới hạn ~2,000 - 5,000 threads/server.",
          "Virtual Thread: M:N user thread, ngốn ~1-2 KB Heap, co giãn động, có thể tạo 1,000,000+ threads dễ dàng.",
          "Mã nguồn không thay đổi: Vẫn viết code tuần tự (blocking sequential style) quen thuộc mà không cần Reactive programming phức tạp (WebFlux/RxJava).",
        ],
      },
      why: {
        heading: "2. Tại sao Virtual Threads thay thế Reactive Programming? (WHY)",
        paragraphs: [
          "Để đạt được thông lượng cao (High Throughput) với hàng chục ngàn kết nối đồng thời trên luồng truyền thống, cộng đồng Backend từng phải chuyển sang các framework Reactive (Spring WebFlux, Project Reactor, Vert.x) dựa trên kiến trúc Non-blocking Event Loop.",
          "Tuy nhiên, Reactive Programming mang lại cái giá quá đắt về trải nghiệm kỹ thuật (Developer Experience):",
        ],
        bulletPoints: [
          "Stack trace bị vỡ vụn: Khi có lỗi xảy ra, stack trace chỉ toàn các hàm nội bộ của Reactor (Flux.publishOn, Mono.flatMap) mà không thể hiện được luồng nghiệp vụ thực tế.",
          "Không thể dùng ThreadLocal: Làm tê liệt các cơ chế truyền context kinh điển như Spring Security context, Distributed Tracing (MDC, Zipkin, OpenTelemetry).",
          "Đường cong học tập dốc đứng: Buộc kỹ sư phải từ bỏ các cấu trúc if/else, try/catch/finally quen thuộc.",
        ],
        callout: {
          tone: "note",
          title: "Cuộc cách mạng của Project Loom",
          body: "Virtual Threads mang lại 'sự kỳ diệu': Giữ nguyên mô hình lập trình tuần tự đơn giản, debug dễ dàng với stack trace hoàn chỉnh, nhưng đạt được thông lượng ngang ngửa hoặc vượt trội hơn Reactive Programming!",
        },
      },
      how: {
        heading: "3. Cơ chế Lên lịch & Tạm dừng (Mount / Unmount / Yield) (HOW)",
        paragraphs: [
          "Cách thức Virtual Threads vận hành bên dưới tầng HotSpot JVM:",
          "1. Mount: Khi một Virtual Thread sẵn sàng chạy, JVM chọn một Carrier Thread rảnh từ ForkJoinPool nội bộ và 'mount' luồng ảo vào. Con trỏ stack của Virtual Thread được ánh xạ vào stack của Carrier Thread và CPU bắt đầu thực thi.",
          "2. Phát hiện I/O Chặn (Blocking Call): Khi Virtual Thread gọi một phương thức chặn (vd: Socket.read, Database query qua JDBC, Thread.sleep, LockSupport.park), JDK đã viết lại toàn bộ các thư viện mạng nội bộ để chuyển thành non-blocking.",
          "3. Unmount & Yield Continuation: Thay vì block luồng OS, HotSpot gọi Continuation.yield(): sao chép các stack frame đang thực thi của Virtual Thread vào JVM Heap. Virtual Thread được tháo dỡ (unmount) khỏi Carrier Thread.",
          "4. Giải phóng Carrier Thread: Carrier Thread được tự do NGAY LẬP TỨC để quay lại hàng đợi và nhận một Virtual Thread khác đang chờ.",
          "5. Unpark & Resume: Một luồng ngầm Poller (dựa trên epoll của Linux hoặc kqueue của macOS) giám sát socket descriptor. Khi dữ liệu mạng tới, Poller đánh thức Virtual Thread, đưa nó trở lại hàng đợi Runnable. Virtual Thread sau đó được mount vào BẤT KỲ Carrier Thread nào đang rảnh để tiếp tục chạy từ đúng điểm đã tạm dừng.",
        ],
      },
      internals: {
        heading: "4. Cơ chế nội tại & Hiểm họa Thread Pinning (INTERNALS)",
        paragraphs: [
          "Dù Virtual Threads mang lại thông lượng đột phá, các kỹ sư Backend bắt buộc phải nắm vững khái niệm Thread Pinning (Ghim luồng).",
          "Thread Pinning là tình trạng xảy ra khi một Virtual Thread thực hiện một thao tác I/O chặn trong khi đang ở một trong hai trường hợp:",
          "1. Nằm bên trong một khối hoặc phương thức có từ khóa synchronized.",
          "2. Đang thực thi một phương thức Native (thông qua JNI hoặc Foreign Function & Memory API).",
          "Khi bị Pinning, HotSpot hiện tại chưa thể tháo rời call stack ra khỏi luồng OS. Hậu quả: Virtual Thread không thể unmount và buộc phải GIỮ CHẶT Carrier Thread trong trạng thái bị block. Nếu có 10 Virtual Threads cùng bị pinned bên trong synchronized block khi gọi database, toàn bộ Carrier Pool (thường chỉ có 8 worker threads trên máy 8-core) sẽ bị đóng băng hoàn toàn. Mọi Virtual Thread khác trong hệ thống sẽ bị chết đói (starvation).",
        ],
        codeSnippet: {
          language: "java",
          caption: "Khắc phục Thread Pinning: Thay thế synchronized bằng ReentrantLock",
          code: `// KHÔNG NÊN: Gây Thread Pinning làm nghẽn Carrier Thread Pool!
public synchronized String fetchLegacyData(String url) {
    return restTemplate.getForObject(url, String.class); // I/O chặn bên trong synchronized
}

// KHUYÊN DÙNG TRONG JAVA 21: Sử dụng ReentrantLock hoàn toàn tương thích với Virtual Threads
private final ReentrantLock lock = new ReentrantLock();

public String fetchModernData(String url) {
    lock.lock();
    try {
        return restTemplate.getForObject(url, String.class); // Unmount an toàn khi chặn I/O!
    } finally {
        lock.unlock();
    }
}

// Khởi chạy Virtual Thread Per Request Executor trong Spring Boot 3.2+
@Bean(TomcatProtocolHandlerCustomizer.class)
public TomcatProtocolHandlerCustomizer<?> protocolHandlerVirtualThreadExecutorCustomizer() {
    return protocolHandler -> {
        protocolHandler.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
    };
}`,
        },
      },
      tradeOffs: {
        heading: "5. Phân tích đánh đổi kỹ thuật (TRADE-OFFS)",
        paragraphs: [
          "Virtual Threads không phải là viên đạn bạc cho mọi bài toán hiệu năng:",
        ],
        bulletPoints: [
          "Tác vụ I/O-bound (Rất phù hợp): Web APIs, Microservices gọi Database, Kafka, REST downstream services. Thông lượng có thể tăng từ 200% đến 500% mà không tốn thêm RAM.",
          "Tác vụ CPU-bound (Không có lợi ích): Xử lý video, mã hóa crypto, tính toán ma trận lớn. Vì CPU-bound bị giới hạn bởi số core vật lý, Virtual Threads không làm tăng tốc độ tính toán mà còn tốn thêm chi phí điều phối.",
          "Tuyệt đối không 'Pool' Virtual Threads: Tạo Virtual Thread Pool (như ThreadPoolExecutor(200)) là một Anti-Pattern. Virtual Threads được thiết kế để sinh ra theo từng tác vụ (Task-per-Thread) rồi tự hủy.",
        ],
      },
      failureScenarios: {
        heading: "6. Các kịch bản sự cố thực tế (FAILURE SCENARIOS)",
        paragraphs: [
          "1. Carrier Pool Exhaustion do Thread Pinning: Sử dụng thư viện JDBC driver cũ hoặc code legacy chứa synchronized block bao quanh lệnh gọi socket. Khi traffic tăng cao, các Carrier Threads bị ghim hết khiến hệ thống ngưng trệ.",
          "2. Cạn kiệt Database Connection Pool: Khi Tomcat có thể mở 50,000 request đồng thời nhờ Virtual Threads, nếu tất cả cùng lao vào xin connection từ HikariCP (vốn chỉ có maxPoolSize=20), hàng chục ngàn Virtual Threads sẽ bị kẹt chờ kết nối, gây tràn bộ nhớ queue của connection pool.",
          "3. Lạm dụng ThreadLocal ngốn bộ nhớ Heap: Nếu mỗi Virtual Thread lưu một object 1MB vào ThreadLocal, khi có 100,000 Virtual Threads chạy đồng thời, bộ nhớ Heap sẽ bị nuốt chửng 100GB dẫn đến OutOfMemoryError.",
        ],
        callout: {
          tone: "warning",
          title: "Truy vết Thread Pinning trong Production",
          body: "Luôn khởi chạy ứng dụng với cờ JVM: -Djdk.tracePinnedThreads=full. HotSpot sẽ in cảnh báo chi tiết cùng stack trace mỗi khi có một Virtual Thread bị pin trên Carrier Thread.",
        },
      },
      productionEngineering: {
        heading: "7. Kinh nghiệm vận hành Production (PRODUCTION ENGINEERING)",
        paragraphs: [
          "Các nguyên tắc vàng khi đưa Virtual Threads vào sản phẩm:",
          "1. Bật tính năng Virtual Threads trong Spring Boot 3.2+: Chỉ cần thêm cấu hình spring.threads.virtual.enabled=true trong file application.yml.",
          "2. Quản trị áp lực hạ tầng (Backpressure & Rate Limiting): Sử dụng Semaphore để giới hạn số lượng truy vấn đồng thời tới các tài nguyên hữu hạn (như Database Connection Pool hoặc Payment Gateway bên ngoài).",
          "3. Thay thế ThreadLocal bằng Scoped Values (JEP 446 / Java 21 preview) để chia sẻ dữ liệu bất biến giữa các tác vụ con một cách an toàn và tiết kiệm bộ nhớ.",
          "4. Đảm bảo toàn bộ dependencies và JDBC Drivers đã được nâng cấp lên phiên bản mới nhất hỗ trợ Loom (PostgreSQL JDBC driver 42.6+, MySQL Connector/J 8.2+).",
        ],
      },
    },
    sourceIds: ["jep-444-virtual-threads"],
    questionIds: ["java-q7-virtual-threads-yield", "java-q8-thread-pinning-hazard"],
  },

  // Existing Flagship Deep-Dive: Kafka Consumer Groups & Rebalancing
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
