package com.manacommunity.api.homeservices.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "staff_job_posts")
public class StaffJobPost {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long communityId;
    private Long postedById;
    private String title;
    private String role; // MAID, COOK, DRIVER, NANNY, etc.
    @Column(columnDefinition = "TEXT")
    private String description;
    private String requirements; // JSON array
    private String salaryRange;
    private String shiftPreference;
    private String tower;
    private String flatNumber;
    private String postedBy;
    @Builder.Default
    private String status = "OPEN"; // OPEN, FILLED, CLOSED
    @Builder.Default
    private Integer applicantCount = 0;
    private LocalDateTime postedAt;

    @PrePersist
    protected void onCreate() { postedAt = LocalDateTime.now(); }
}
