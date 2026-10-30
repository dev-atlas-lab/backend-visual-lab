package com.devatlaslab.bvl.catalog;

import java.time.Instant;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/catalog")
public class CatalogController {

    public record DomainSummaryDto(
            String id,
            String title,
            String status,
            int publishedLabs
    ) {}

    public record PlatformStatusDto(
            String service,
            String architecture,
            String javaVersion,
            Instant timestamp,
            List<DomainSummaryDto> domains
    ) {}

    @GetMapping("/status")
    public PlatformStatusDto getStatus() {
        return new PlatformStatusDto(
                "backend-visual-lab-api",
                "Spring Boot 3.4 Modular Monolith",
                System.getProperty("java.version", "21"),
                Instant.now(),
                List.of(
                        new DomainSummaryDto("java", "Java Core & JVM Internals", "VERIFIED", 4),
                        new DomainSummaryDto("messaging", "Messaging & Event Streaming", "VERIFIED", 1),
                        new DomainSummaryDto("caching", "Caching & Redis", "VERIFIED", 1),
                        new DomainSummaryDto("databases", "Databases (PostgreSQL)", "VERIFIED", 1),
                        new DomainSummaryDto("distributed-systems", "Distributed Systems & Microservices", "PLANNED", 0),
                        new DomainSummaryDto("design-patterns", "Backend Design Patterns", "PLANNED", 0),
                        new DomainSummaryDto("system-design", "Production System Design", "PLANNED", 0)
                )
        );
    }
}
