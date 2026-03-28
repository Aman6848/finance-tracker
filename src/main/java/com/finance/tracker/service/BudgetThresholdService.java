package com.finance.tracker.service;

import com.finance.tracker.entity.BudgetThreshold;
import com.finance.tracker.repository.BudgetThresholdRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BudgetThresholdService {

    private final BudgetThresholdRepository budgetThresholdRepository;
    private final NotificationService notificationService;

    public BudgetThresholdService(
            BudgetThresholdRepository budgetThresholdRepository,
            NotificationService notificationService
    ) {
        this.budgetThresholdRepository = budgetThresholdRepository;
        this.notificationService = notificationService;
    }

    public BudgetThreshold setThreshold(BudgetThreshold budgetThreshold) {
        String category = normalizeCategory(budgetThreshold.getCategory());
        double thresholdAmount = budgetThreshold.getThresholdAmount() != null
                ? budgetThreshold.getThresholdAmount()
                : -1;

        if (category == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category must not be empty");
        }

        if (thresholdAmount < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Threshold amount must be zero or greater");
        }

        BudgetThreshold threshold = budgetThresholdRepository.findByCategory(category)
                .orElseGet(BudgetThreshold::new);
        threshold.setCategory(category);
        threshold.setThresholdAmount(thresholdAmount);

        BudgetThreshold savedThreshold = budgetThresholdRepository.save(threshold);
        notificationService.checkThreshold(category);
        return savedThreshold;
    }

    public BudgetThreshold getThreshold(String category) {
        String normalizedCategory = normalizeCategory(category);
        if (normalizedCategory == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category must not be empty");
        }

        return budgetThresholdRepository.findByCategory(normalizedCategory)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Threshold not found for category " + normalizedCategory
                ));
    }

    private String normalizeCategory(String category) {
        if (category == null) {
            return null;
        }

        String normalizedCategory = category.trim();
        return normalizedCategory.isEmpty() ? null : normalizedCategory.toUpperCase();
    }
}
