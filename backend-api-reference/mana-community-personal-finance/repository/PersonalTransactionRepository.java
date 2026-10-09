package com.manacommunity.api.personalfinance.repository;

import com.manacommunity.api.personalfinance.model.PersonalTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface PersonalTransactionRepository extends JpaRepository<PersonalTransaction, Long> {
    Page<PersonalTransaction> findByUserIdOrderByDateDesc(Long userId, Pageable pageable);
    Page<PersonalTransaction> findByUserIdAndTypeOrderByDateDesc(Long userId, String type, Pageable pageable);
    List<PersonalTransaction> findByUserIdAndDateBetweenOrderByDateDesc(Long userId, LocalDate start, LocalDate end);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM PersonalTransaction t WHERE t.userId = :userId AND t.type = :type AND t.date BETWEEN :start AND :end")
    BigDecimal sumByUserIdAndTypeAndDateBetween(Long userId, String type, LocalDate start, LocalDate end);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM PersonalTransaction t WHERE t.userId = :userId AND t.type = :type AND t.categoryId = :categoryId AND t.date BETWEEN :start AND :end")
    BigDecimal sumByCategory(Long userId, String type, Long categoryId, LocalDate start, LocalDate end);
}
