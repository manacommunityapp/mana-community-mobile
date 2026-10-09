package com.manacommunity.api.personalfinance.repository;

import com.manacommunity.api.personalfinance.model.PersonalGoal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PersonalGoalRepository extends JpaRepository<PersonalGoal, Long> {
    List<PersonalGoal> findByUserIdAndIsCompletedFalseOrderByTargetDateAsc(Long userId);
    List<PersonalGoal> findByUserIdOrderByTargetDateAsc(Long userId);
}
