package com.manacommunity.api.personalfinance.repository;

import com.manacommunity.api.personalfinance.model.PersonalInstallment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PersonalInstallmentRepository extends JpaRepository<PersonalInstallment, Long> {
    List<PersonalInstallment> findByUserIdAndStatusOrderByNextDueDateAsc(Long userId, String status);
}
