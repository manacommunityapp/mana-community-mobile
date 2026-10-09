package com.manacommunity.api.personalfinance.repository;

import com.manacommunity.api.personalfinance.model.PersonalCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PersonalCategoryRepository extends JpaRepository<PersonalCategory, Long> {
    List<PersonalCategory> findByUserIdAndParentIdIsNullOrderByNameAsc(Long userId);
    List<PersonalCategory> findByUserIdAndTypeAndParentIdIsNullOrderByNameAsc(Long userId, String type);
}
