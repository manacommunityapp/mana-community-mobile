package com.manacommunity.api.personalfinance.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "personal_categories")
public class PersonalCategory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long userId;
    private String name;
    private String icon;
    private String color;
    private String type; // INCOME, EXPENSE
    private Long parentId;

    @OneToMany(fetch = FetchType.EAGER)
    @JoinColumn(name = "parentId", insertable = false, updatable = false)
    private List<PersonalCategory> subcategories;
}
