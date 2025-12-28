/**
 * k6 load test for all endpoints (comprehensive)
 * 
 * Usage:
 *   k6 run tests/load/all-endpoints.js
 * 
 * This test covers all major endpoints to simulate realistic usage patterns.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 20 },
    { duration: '3m', target: 20 },
    { duration: '1m', target: 40 },
    { duration: '3m', target: 40 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.02'], // Allow 2% error rate for comprehensive test
    errors: ['rate<0.02'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const USER_AGENT = 'K6LoadTest/1.0 (loadtest@example.com)';

const TEST_USER_IDS = [1, 2, 3, 4, 5, 10, 20, 50];
const TEST_COUNTRY_IDS = [42, 43, 44, 45];
const TEST_NOTE_IDS = [1, 2, 3, 4, 5, 10, 20, 50];

export default function () {
  const headers = {
    'User-Agent': USER_AGENT,
  };

  // Random endpoint selection to simulate realistic usage
  const endpointType = Math.random();

  if (endpointType < 0.3) {
    // 30% - User endpoints
    const userId = TEST_USER_IDS[Math.floor(Math.random() * TEST_USER_IDS.length)];
    const res = http.get(`${BASE_URL}/api/v1/users/${userId}`, { headers });
    check(res, {
      'user endpoint status': (r) => r.status === 200 || r.status === 404,
    });
    errorRate.add(res.status >= 500);
  } else if (endpointType < 0.5) {
    // 20% - Country endpoints
    const countryId = TEST_COUNTRY_IDS[Math.floor(Math.random() * TEST_COUNTRY_IDS.length)];
    const res = http.get(`${BASE_URL}/api/v1/countries/${countryId}`, { headers });
    check(res, {
      'country endpoint status': (r) => r.status === 200 || r.status === 404,
    });
    errorRate.add(res.status >= 500);
  } else if (endpointType < 0.7) {
    // 20% - Note endpoints
    const noteId = TEST_NOTE_IDS[Math.floor(Math.random() * TEST_NOTE_IDS.length)];
    const res = http.get(`${BASE_URL}/api/v1/notes/${noteId}`, { headers });
    check(res, {
      'note endpoint status': (r) => r.status === 200 || r.status === 404,
    });
    errorRate.add(res.status >= 500);
  } else if (endpointType < 0.85) {
    // 15% - Search endpoints
    const searchType = Math.random() < 0.5 ? 'users' : 'countries';
    const res = http.get(`${BASE_URL}/api/v1/search/${searchType}?limit=10&page=1`, { headers });
    check(res, {
      'search endpoint status': (r) => r.status === 200,
    });
    errorRate.add(res.status >= 500);
  } else {
    // 15% - Analytics endpoints
    const res = http.get(`${BASE_URL}/api/v1/analytics/global`, { headers });
    check(res, {
      'analytics endpoint status': (r) => r.status === 200,
    });
    errorRate.add(res.status >= 500);
  }

  sleep(Math.random() * 2 + 1); // Random sleep between 1-3 seconds
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'tests/load/results/all-endpoints-summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  const indent = options.indent || ' ';
  
  let summary = '\n';
  summary += `${indent}Comprehensive Load Test Summary (All Endpoints)\n`;
  summary += `${indent}==============================================\n\n`;
  
  summary += `${indent}HTTP Metrics:\n`;
  summary += `${indent}  Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `${indent}  Failed Requests: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n`;
  summary += `${indent}  Avg Duration: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `${indent}  Min Duration: ${data.metrics.http_req_duration.values.min.toFixed(2)}ms\n`;
  summary += `${indent}  Max Duration: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms\n`;
  summary += `${indent}  P50 Duration: ${data.metrics.http_req_duration.values['p(50)'].toFixed(2)}ms\n`;
  summary += `${indent}  P95 Duration: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `${indent}  P99 Duration: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n\n`;
  
  summary += `${indent}Custom Metrics:\n`;
  summary += `${indent}  Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%\n\n`;
  
  return summary;
}
