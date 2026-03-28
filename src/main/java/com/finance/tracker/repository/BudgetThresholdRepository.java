package com.finance.tracker.repository;

import com.finance.tracker.entity.BudgetThreshold;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface BudgetThresholdRepository extends JpaRepository<BudgetThreshold, Long> {

    @Query("""
            select bt
            from BudgetThreshold bt
            where upper(trim(bt.category)) = upper(trim(:category))
            """)
    Optional<BudgetThreshold> findByCategory(String category);
}
