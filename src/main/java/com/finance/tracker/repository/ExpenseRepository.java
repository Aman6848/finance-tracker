package com.finance.tracker.repository;

import com.finance.tracker.dto.CategoryTotalView;
import com.finance.tracker.entity.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long>, JpaSpecificationExecutor<Expense> {
    List<Expense> findByCategory(String category);

    @Query("""
            select coalesce(sum(e.amount), 0)
            from Expense e
            where upper(trim(coalesce(e.category, ''))) = upper(trim(:category))
            """)
    Double getTotalByCategory(String category);

    List<Expense> findAllByCreatedAtBetweenOrderByCreatedAtAsc(LocalDateTime startDate, LocalDateTime endDate);

    @Query("select coalesce(sum(e.amount), 0) from Expense e")
    Double getTotalExpenseAmount();

    @Query("""
            select coalesce(sum(e.amount), 0)
            from Expense e
            where e.createdAt >= :startDate and e.createdAt <= :endDate
            """)
    Double getTotalExpenseAmountBetween(LocalDateTime startDate, LocalDateTime endDate);

    @Query("""
            select coalesce(e.category, 'Uncategorized') as category, coalesce(sum(e.amount), 0) as total
            from Expense e
            where e.createdAt >= :startDate and e.createdAt <= :endDate
            group by e.category
            order by total desc
            """)
    List<CategoryTotalView> getCategoryTotalsBetween(LocalDateTime startDate, LocalDateTime endDate);
}
