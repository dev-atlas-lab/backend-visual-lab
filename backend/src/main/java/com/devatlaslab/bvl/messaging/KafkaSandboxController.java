package com.devatlaslab.bvl.messaging;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/labs/kafka")
public class KafkaSandboxController {

    public record RebalancePreviewRequest(
            @NotBlank String topic,
            @Min(1) @Max(24) int partitions,
            @Min(1) @Max(12) int consumers,
            @NotBlank String assignor
    ) {}

    public record RebalancePreviewResponse(
            String topic,
            String assignor,
            int generationId,
            String groupState,
            Map<String, List<Integer>> assignments
    ) {}

    @PostMapping("/rebalance-preview")
    public RebalancePreviewResponse computeRebalance(@Valid @RequestBody RebalancePreviewRequest request) {
        Map<String, List<Integer>> assignments = new LinkedHashMap<>();
        for (int c = 1; c <= request.consumers(); c++) {
            assignments.put("consumer-" + c, new ArrayList<>());
        }

        if ("RangeAssignor".equalsIgnoreCase(request.assignor())) {
            int minPerConsumer = request.partitions() / request.consumers();
            int extra = request.partitions() % request.consumers();
            int cursor = 0;
            for (int i = 0; i < request.consumers(); i++) {
                int count = minPerConsumer + (i < extra ? 1 : 0);
                List<Integer> owned = assignments.get("consumer-" + (i + 1));
                for (int p = 0; p < count; p++) {
                    owned.add(cursor++);
                }
            }
        } else {
            for (int p = 0; p < request.partitions(); p++) {
                int ownerIdx = (p % request.consumers()) + 1;
                assignments.get("consumer-" + ownerIdx).add(p);
            }
        }

        return new RebalancePreviewResponse(
                request.topic(),
                request.assignor(),
                1,
                "Stable",
                assignments
        );
    }
}
