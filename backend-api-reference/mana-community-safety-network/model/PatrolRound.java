package com.manacommunity.api.safety.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "patrol_rounds")
public class PatrolRound {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long communityId;
    private Long guardId;
    private String guardName;
    private String routeName;
    @Builder.Default
    private String status = "IN_PROGRESS"; // IN_PROGRESS, COMPLETED, MISSED
    private Integer totalCheckpoints;
    @Builder.Default
    private Integer completedCheckpoints = 0;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;

    @OneToMany(cascade = CascadeType.ALL)
    @JoinColumn(name = "round_id")
    private List<PatrolCheckpoint> checkpoints;
}
