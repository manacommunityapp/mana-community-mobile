package com.manacommunity.api.personalfinance.repository;

import com.manacommunity.api.personalfinance.model.PersonalBill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PersonalBillRepository extends JpaRepository<PersonalBill, Long> {
    List<PersonalBill> findByUserIdOrderByDueDateAsc(Long userId);
    List<PersonalBill> findByUserIdAndIsPaidFalseOrderByDueDateAsc(Long userId);
}
