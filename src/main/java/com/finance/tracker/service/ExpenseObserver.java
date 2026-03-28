package com.finance.tracker.service;

public interface ExpenseObserver {
    void onExpenseChanged(String category);
}
