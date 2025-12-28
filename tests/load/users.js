/**
 * k6 load test for Users endpoints
 * 
 * Usage:
 *   k6 run tests/load/users.js
 * 
 * Options:
 *   - VUS: Number of virtual users (default: 10)
 *   - DURATION: Test duration (default: 30s)
 * 
 * Example:
 *   k6 run --vus 20 --duration 60s tests/load/users.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const userProfileDuration = new Trend('user_profile_duration');
const userSearchDuration = new Trend('user_search_duration');
const userRankingsDuration = new Trend('user_rankings_duration');

// Configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },    // Stay at 10 users
    { duration: '30s', target: 20 },   // Ramp up to 20 users
    { duration: '1m', target: 20 },    // Stay at 20 users
    { duration: '30s', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests < 500ms, 99% < 1s
    http_req_failed: ['rate<0.01'],                 // Error rate < 1%
    errors: ['rate<0.01'],                          // Custom error rate < 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const USER_AGENT = 'K6LoadTest/1.0 (loadtest@example.com)';

// Test user IDs (adjust based on your test data)
const TEST_USER_IDS = [1, 2, 3, 4, 5, 10, 20, 50, 100, 200];

export default function () {
  const headers = {
    'User-Agent': USER_AGENT,
  };

  // Test 1: Get user profile
  const userId = TEST_USER_IDS[Math.floor(Math.random() * TEST_USER_IDS.length)];
  const profileStart = Date.now();
  const profileRes = http.get(`${BASE_URL}/api/v1/users/${userId}`, { headers });
  const profileDuration = Date.now() - profileStart;
  
  const profileCheck = check(profileRes, {
    'user profile status is 200': (r) => r.status === 200,
    'user profile has user_id': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.user_id === userId;
      } catch {
        return false;
      }
    },
  });
  
  errorRate.add(!profileCheck);
  userProfileDuration.add(profileDuration);
  
  sleep(1);

  // Test 2: Search users (random query)
  const searchStart = Date.now();
  const searchRes = http.get(`${BASE_URL}/api/v1/search/users?limit=10&page=1`, { headers });
  const searchDuration = Date.now() - searchStart;
  
  const searchCheck = check(searchRes, {
    'user search status is 200': (r) => r.status === 200,
    'user search returns data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.data);
      } catch {
        return false;
      }
    },
  });
  
  errorRate.add(!searchCheck);
  userSearchDuration.add(searchDuration);
  
  sleep(1);

  // Test 3: Get user rankings
  const rankingsStart = Date.now();
  const rankingsRes = http.get(`${BASE_URL}/api/v1/users/rankings?limit=10&sort=history_whole_open&order=desc`, { headers });
  const rankingsDuration = Date.now() - rankingsStart;
  
  const rankingsCheck = check(rankingsRes, {
    'user rankings status is 200': (r) => r.status === 200,
    'user rankings returns data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.data);
      } catch {
        return false;
      }
    },
  });
  
  errorRate.add(!rankingsCheck);
  userRankingsDuration.add(rankingsDuration);
  
  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'tests/load/results/users-summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  const indent = options.indent || ' ';
  const enableColors = options.enableColors || false;
  
  let summary = '\n';
  summary += `${indent}User Endpoints Load Test Summary\n`;
  summary += `${indent}================================\n\n`;
  
  // HTTP metrics
  summary += `${indent}HTTP Metrics:\n`;
  summary += `${indent}  Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `${indent}  Failed Requests: ${data.metrics.http_req_failed.values.rate * 100}%\n`;
  summary += `${indent}  Avg Duration: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `${indent}  P95 Duration: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `${indent}  P99 Duration: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n\n`;
  
  // Custom metrics
  summary += `${indent}Custom Metrics:\n`;
  summary += `${indent}  Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%\n`;
  summary += `${indent}  Avg User Profile Duration: ${data.metrics.user_profile_duration.values.avg.toFixed(2)}ms\n`;
  summary += `${indent}  Avg User Search Duration: ${data.metrics.user_search_duration.values.avg.toFixed(2)}ms\n`;
  summary += `${indent}  Avg User Rankings Duration: ${data.metrics.user_rankings_duration.values.avg.toFixed(2)}ms\n\n`;
  
  return summary;
}
