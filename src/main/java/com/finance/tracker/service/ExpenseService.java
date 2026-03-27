package com.finance.tracker.service;

import com.finance.tracker.dto.MonthlySummaryResponse;
import com.finance.tracker.entity.Expense;
import com.finance.tracker.repository.ExpenseRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.YearMonth;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ExpenseService {

    private final ExpenseRepository expenseRepository;

    public ExpenseService(ExpenseRepository expenseRepository) {
        this.expenseRepository = expenseRepository;
    }

    public Expense createExpense(Expense expense) {
        if(expense.getCreatedAt()==null){
            expense.setCreatedAt(LocalDateTime.now());
        }
        return expenseRepository.save(expense);
    }

    public Page<Expense> getAllExpenses(Pageable pageable) {
        return expenseRepository.findAll(pageable);
    }

    public List<Expense> getExpensesByCategory(String category) {
        return expenseRepository.findByCategory(category);
    }

    public Page<Expense> getFilteredExpenses(String category, LocalDateTime startDate, LocalDateTime endDate, Pageable pageable) {
        return expenseRepository.findAll(buildExpenseSpecification(category, startDate, endDate), pageable);
    }

    public Map<String, List<Expense>> getExpensesGroupedByDay(LocalDateTime startDate, LocalDateTime endDate) {
        LocalDateTime effectiveStartDate = startDate != null ? startDate : LocalDateTime.MIN;
        LocalDateTime effectiveEndDate = endDate != null ? endDate : LocalDateTime.MAX;

        if (effectiveStartDate.isAfter(effectiveEndDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "startDate must be before endDate");
        }

        return expenseRepository.findAllByCreatedAtBetweenOrderByCreatedAtAsc(effectiveStartDate, effectiveEndDate)
                .stream()
                .collect(Collectors.groupingBy(
                        expense -> expense.getCreatedAt().toLocalDate().toString(),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));
    }

    public MonthlySummaryResponse getMonthlySummary(int year, int month) {
        YearMonth yearMonth;
        try {
            yearMonth = YearMonth.of(year, month);
        } catch (RuntimeException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid year or month", exception);
        }

        LocalDateTime startDate = yearMonth.atDay(1).atStartOfDay();
        LocalDateTime endDate = yearMonth.atEndOfMonth().atTime(23, 59, 59, 999_999_999);

        Map<String, Double> categoryTotals = expenseRepository.getCategoryTotalsBetween(startDate, endDate)
                .stream()
                .collect(Collectors.toMap(
                        categoryTotal -> categoryTotal.getCategory() != null
                                ? categoryTotal.getCategory()
                                : "Uncategorized",
                        categoryTotal -> categoryTotal.getTotal() != null
                                ? categoryTotal.getTotal()
                                : 0.0,
                        (left, right) -> right,
                        LinkedHashMap::new
                ));

        Double total = expenseRepository.getTotalExpenseAmountBetween(startDate, endDate);
        return new MonthlySummaryResponse(total != null ? total : 0.0, categoryTotals);
    }

    public Double getTotalExpenses() {
        return expenseRepository.getTotalExpenseAmount();
    }

    public Expense updateExpense(Long id, Expense expense) {
        Expense existingExpense = expenseRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Expense not found with id " + id));

        existingExpense.setTitle(expense.getTitle());
        existingExpense.setAmount(expense.getAmount());
        existingExpense.setCategory(expense.getCategory());
        existingExpense.setCreatedAt(expense.getCreatedAt() != null ? expense.getCreatedAt() : existingExpense.getCreatedAt());

        return expenseRepository.save(existingExpense);
    }

    public String deleteExpense(Long id) {
        Expense existingExpense = expenseRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Expense not found with id " + id));

        expenseRepository.delete(existingExpense);
        return "Expense deleted successfully";
    }

    private Specification<Expense> buildExpenseSpecification(String category, LocalDateTime startDate, LocalDateTime endDate) {
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "startDate must be before endDate");
        }

        Specification<Expense> specification = (root, query, criteriaBuilder) ->
                criteriaBuilder.conjunction();

        if (category != null && !category.isBlank()) {
            specification = specification.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("category"), category));
        }

        if (startDate != null) {
            specification = specification.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.greaterThanOrEqualTo(root.get("createdAt"), startDate));
        }

        if (endDate != null) {
            specification = specification.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.lessThanOrEqualTo(root.get("createdAt"), endDate));
        }

        return specification;
    }
}
