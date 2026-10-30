package com.devatlaslab.bvl;

import com.devatlaslab.bvl.catalog.CatalogController;
import com.devatlaslab.bvl.messaging.KafkaSandboxController;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class BackendVisualLabApplicationTests {

    @Test
    void catalogControllerReturnsSixCoreDomains() {
        CatalogController controller = new CatalogController();
        CatalogController.PlatformStatusDto status = controller.getStatus();
        assertNotNull(status);
        assertEquals(6, status.domains().size());
        assertEquals("messaging", status.domains().getFirst().id());
    }

    @Test
    void kafkaSandboxComputesDeterministicPartitionAssignment() {
        KafkaSandboxController controller = new KafkaSandboxController();
        var response = controller.computeRebalance(
                new KafkaSandboxController.RebalancePreviewRequest("orders.v1", 6, 3, "RangeAssignor")
        );
        assertEquals("Stable", response.groupState());
        assertEquals(List.of(0, 1), response.assignments().get("consumer-1"));
        assertEquals(List.of(2, 3), response.assignments().get("consumer-2"));
        assertEquals(List.of(4, 5), response.assignments().get("consumer-3"));
    }
}
