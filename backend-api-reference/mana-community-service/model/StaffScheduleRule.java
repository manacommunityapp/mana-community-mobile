package com.manacommunity.api.service.model;

import jakarta.persistence.*;
import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "staff_schedule_rules")
public class StaffScheduleRule {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long societyId;
    private Long staffId;
    private String staffName;
    private String role;
    private String allowedStartTime;
    private String allowedEndTime;
    private String allowedDaysOfWeek; // JSON array
    @Builder.Default
    private Boolean isActive = true;
}
