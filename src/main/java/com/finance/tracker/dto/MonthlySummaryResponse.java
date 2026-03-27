package com.finance.tracker.dto;

import java.util.Map;

public record MonthlySummaryResponse(Double total, Map<String, Double> categoryTotals) {
}
