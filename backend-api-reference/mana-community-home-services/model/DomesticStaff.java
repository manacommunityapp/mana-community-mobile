package com.manacommunity.api.homeservices.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "domestic_staff")
public class DomesticStaff {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long communityId;
    private String name;
    private String role; // MAID, COOK, DRIVER, NANNY, GARDENER, WATCHMAN, HELPER
    private String phone;
    private String photo;
    @Builder.Default
    private Boolean verified = false;
    @Builder.Default
    private Boolean policeVerified = false;
    @Builder.Default
    private Boolean aadhaarOnFile = false;
    @Builder.Default
    private Double rating = 4.0;
    @Builder.Default
    private Integer reviewCount = 0;
    private String experience;
    private BigDecimal monthlySalary;
    private String workingFlats;
    private String workingTowers;
    private String shiftTime;
    private LocalDate joiningDate;
    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, ON_LEAVE, TERMINATED
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }
}
