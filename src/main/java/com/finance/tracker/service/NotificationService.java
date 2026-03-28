package com.finance.tracker.service;

import com.finance.tracker.entity.BudgetThreshold;
import com.finance.tracker.repository.BudgetThresholdRepository;
import com.finance.tracker.repository.ExpenseRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class NotificationService implements ExpenseObserver {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final ExpenseRepository expenseRepository;
    private final BudgetThresholdRepository budgetThresholdRepository;

    public NotificationService(
            ExpenseRepository expenseRepository,
            BudgetThresholdRepository budgetThresholdRepository
    ) {
        this.expenseRepository = expenseRepository;
        this.budgetThresholdRepository = budgetThresholdRepository;
    }

    public void checkThreshold(String category) {
        String normalizedCategory = normalizeCategory(category);
        if (normalizedCategory == null) {
            return;
        }

        BudgetThreshold threshold = budgetThresholdRepository.findByCategory(normalizedCategory)
                .orElse(null);

        if (threshold == null) {
            return;
        }

        Double total = expenseRepository.getTotalByCategory(normalizedCategory);
        double thresholdAmount = threshold.getThresholdAmount() != null ? threshold.getThresholdAmount() : 0.0;
        double totalAmount = total != null ? total : 0.0;

        if (totalAmount > thresholdAmount) {
            log.warn(
                    "Budget exceeded for category {}. Total: {}, Threshold: {}",
                    threshold.getCategory(),
                    totalAmount,
                    thresholdAmount
            );
        }
    }

    @Override
    public void onExpenseChanged(String category) {
        checkThreshold(category);
    }

    private String normalizeCategory(String category) {
        if (category == null) {
            return null;
        }

        String normalizedCategory = category.trim();
        return normalizedCategory.isEmpty() ? null : normalizedCategory.toUpperCase();
    }
}
