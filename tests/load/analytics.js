/**
 * k6 load test for Analytics endpoints
 * 
 * Usage:
 *   k6 run tests/load/analytics.js
 * 
 * Options:
 *   - VUS: Number of virtual users (default: 10)
 *   - DURATION: Test duration (default: 30s)
 * 
 * Example:
 *   k6 run --vus 20 --duration 60s tests/load/analytics.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const globalAnalyticsDuration = new Trend('global_analytics_duration');
const trendsDuration = new Trend('trends_duration');
const comparisonDuration = new Trend('comparison_duration');

// Configuration
export const options = {
  stages: [
    { duration: '30s', target: 5 },   // Lower VUS for analytics (heavier queries)
    { duration: '1m', target: 5 },
    { duration: '30s', target: 10 },
    { duration: '1m', target: 10 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'], // Analytics can be slower
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const USER_AGENT = 'K6LoadTest/1.0 (loadtest@example.com)';

// Test user/country IDs for comparison
const TEST_USER_IDS = [1, 2, 3, 4, 5];
const TEST_COUNTRY_IDS = [42, 43, 44, 45, 46];

export default function () {
  const headers = {
    'User-Agent': USER_AGENT,
  };

  // Test 1: Get global analytics
  const globalStart = Date.now();
  const globalRes = http.get(`${BASE_URL}/api/v1/analytics/global`, { headers });
  const globalDuration = Date.now() - globalStart;
  
  const globalCheck = check(globalRes, {
    'global analytics status is 200': (r) => r.status === 200,
    'global analytics returns data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body !== null && typeof body === 'object';
      } catch {
        return false;
      }
    },
  });
  
  errorRate.add(!globalCheck);
  globalAnalyticsDuration.add(globalDuration);
  
  sleep(2);

  // Test 2: Get trends
  const trendsStart = Date.now();
  const trendsRes = http.get(`${BASE_URL}/api/v1/analytics/trends?type=users&ids=${TEST_USER_IDS[0]}`, { headers });
  const trendsDuration = Date.now() - trendsStart;
  
  const trendsCheck = check(trendsRes, {
    'trends status is 200': (r) => r.status === 200,
    'trends returns data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.trends);
      } catch {
        return false;
      }
    },
  });
  
  errorRate.add(!trendsCheck);
  trendsDuration.add(trendsDuration);
  
  sleep(2);

  // Test 3: Get comparison
  const userIds = TEST_USER_IDS.slice(0, 2).join(',');
  const comparisonStart = Date.now();
  const comparisonRes = http.get(`${BASE_URL}/api/v1/analytics/comparison?type=users&ids=${userIds}`, { headers });
  const comparisonDuration = Date.now() - comparisonStart;
  
  const comparisonCheck = check(comparisonRes, {
    'comparison status is 200': (r) => r.status === 200,
    'comparison returns data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.entities);
      } catch {
        return false;
      }
    },
  });
  
  errorRate.add(!comparisonCheck);
  comparisonDuration.add(comparisonDuration);
  
  sleep(2);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'tests/load/results/analytics-summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  const indent = options.indent || ' ';
  
  let summary = '\n';
  summary += `${indent}Analytics Endpoints Load Test Summary\n`;
  summary += `${indent}=====================================\n\n`;
  
  summary += `${indent}HTTP Metrics:\n`;
  summary += `${indent}  Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `${indent}  Failed Requests: ${data.metrics.http_req_failed.values.rate * 100}%\n`;
  summary += `${indent}  Avg Duration: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `${indent}  P95 Duration: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `${indent}  P99 Duration: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n\n`;
  
  summary += `${indent}Custom Metrics:\n`;
  summary += `${indent}  Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%\n`;
  summary += `${indent}  Avg Global Analytics Duration: ${data.metrics.global_analytics_duration.values.avg.toFixed(2)}ms\n`;
  summary += `${indent}  Avg Trends Duration: ${data.metrics.trends_duration.values.avg.toFixed(2)}ms\n`;
  summary += `${indent}  Avg Comparison Duration: ${data.metrics.comparison_duration.values.avg.toFixed(2)}ms\n\n`;
  
  return summary;
}
