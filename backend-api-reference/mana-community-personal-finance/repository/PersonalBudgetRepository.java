package com.manacommunity.api.personalfinance.repository;

import com.manacommunity.api.personalfinance.model.PersonalBudget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PersonalBudgetRepository extends JpaRepository<PersonalBudget, Long> {
    List<PersonalBudget> findByUserIdAndMonthOrderByCategoryNameAsc(Long userId, String month);
}
