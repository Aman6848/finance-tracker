package com.finance.tracker.repository;

import com.finance.tracker.entity.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    List<Expense> findByCategory(String category);

    @Query("select coalesce(sum(e.amount), 0) from Expense e")
    Double getTotalExpenseAmount();
}
