package com.manacommunity.api.personalfinance.repository;

import com.manacommunity.api.personalfinance.model.PersonalAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PersonalAccountRepository extends JpaRepository<PersonalAccount, Long> {
    List<PersonalAccount> findByUserIdAndIsActiveTrueOrderByNameAsc(Long userId);
}
