package com.finance.tracker.controller;

import com.finance.tracker.entity.BudgetThreshold;
import com.finance.tracker.service.BudgetThresholdService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "http://localhost:5173")
@RequestMapping("/threshold")
public class BudgetThresholdController {

    private final BudgetThresholdService budgetThresholdService;

    public BudgetThresholdController(BudgetThresholdService budgetThresholdService) {
        this.budgetThresholdService = budgetThresholdService;
    }

    @PostMapping
    public BudgetThreshold setThreshold(@Valid @RequestBody BudgetThreshold budgetThreshold) {
        return budgetThresholdService.setThreshold(budgetThreshold);
    }

    @GetMapping
    public BudgetThreshold getThreshold(@RequestParam String category) {
        return budgetThresholdService.getThreshold(category);
    }
}
