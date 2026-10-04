package com.manacommunity.api.homeservices.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "staff_attendance")
public class StaffAttendance {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long staffId;
    private String staffName;
    private String role;
    private LocalDate date;
    private LocalTime checkInTime;
    private String checkInGate;
    private LocalTime checkOutTime;
    private String checkOutGate;
    @Builder.Default
    private String status = "NOT_MARKED"; // CHECKED_IN, CHECKED_OUT, ABSENT, ON_LEAVE, NOT_MARKED
    private String markedBy;
    private String photoUrl;
}
