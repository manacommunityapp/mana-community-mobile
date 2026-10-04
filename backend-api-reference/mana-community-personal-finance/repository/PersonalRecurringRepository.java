package com.manacommunity.api.personalfinance.repository;

import com.manacommunity.api.personalfinance.model.PersonalRecurring;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PersonalRecurringRepository extends JpaRepository<PersonalRecurring, Long> {
    List<PersonalRecurring> findByUserIdAndIsActiveTrueOrderByNextDueDateAsc(Long userId);
}
