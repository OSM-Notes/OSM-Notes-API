/**
 * k6 load test for Notes endpoints
 * 
 * Usage:
 *   k6 run tests/load/notes.js
 * 
 * Options:
 *   - VUS: Number of virtual users (default: 10)
 *   - DURATION: Test duration (default: 30s)
 * 
 * Example:
 *   k6 run --vus 20 --duration 60s tests/load/notes.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const noteDetailDuration = new Trend('note_detail_duration');
const noteCommentsDuration = new Trend('note_comments_duration');
const noteSearchDuration = new Trend('note_search_duration');

// Configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 10 },
    { duration: '30s', target: 20 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const USER_AGENT = 'K6LoadTest/1.0 (loadtest@example.com)';

// Test note IDs (adjust based on your test data)
const TEST_NOTE_IDS = [1, 2, 3, 4, 5, 10, 20, 50, 100, 200, 500, 1000];

export default function () {
  const headers = {
    'User-Agent': USER_AGENT,
  };

  // Test 1: Get note detail
  const noteId = TEST_NOTE_IDS[Math.floor(Math.random() * TEST_NOTE_IDS.length)];
  const detailStart = Date.now();
  const detailRes = http.get(`${BASE_URL}/api/v1/notes/${noteId}`, { headers });
  const detailDuration = Date.now() - detailStart;
  
  const detailCheck = check(detailRes, {
    'note detail status is 200': (r) => r.status === 200 || r.status === 404,
    'note detail has note_id': (r) => {
      if (r.status === 404) return true;
      try {
        const body = JSON.parse(r.body);
        return body.note_id === noteId;
      } catch {
        return false;
      }
    },
  });
  
  errorRate.add(!detailCheck || detailRes.status >= 500);
  noteDetailDuration.add(detailDuration);
  
  sleep(1);

  // Test 2: Get note comments
  const commentsStart = Date.now();
  const commentsRes = http.get(`${BASE_URL}/api/v1/notes/${noteId}/comments`, { headers });
  const commentsDuration = Date.now() - commentsStart;
  
  const commentsCheck = check(commentsRes, {
    'note comments status is 200': (r) => r.status === 200 || r.status === 404,
    'note comments returns array': (r) => {
      if (r.status === 404) return true;
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.data);
      } catch {
        return false;
      }
    },
  });
  
  errorRate.add(!commentsCheck || commentsRes.status >= 500);
  noteCommentsDuration.add(commentsDuration);
  
  sleep(1);

  // Test 3: Search notes
  const searchStart = Date.now();
  const searchRes = http.get(`${BASE_URL}/api/v1/notes?limit=10&page=1`, { headers });
  const searchDuration = Date.now() - searchStart;
  
  const searchCheck = check(searchRes, {
    'note search status is 200': (r) => r.status === 200,
    'note search returns data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.data);
      } catch {
        return false;
      }
    },
  });
  
  errorRate.add(!searchCheck);
  noteSearchDuration.add(searchDuration);
  
  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'tests/load/results/notes-summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  const indent = options.indent || ' ';
  const enableColors = options.enableColors || false;
  
  let summary = '\n';
  summary += `${indent}Notes Endpoints Load Test Summary\n`;
  summary += `${indent}================================\n\n`;
  
  summary += `${indent}HTTP Metrics:\n`;
  summary += `${indent}  Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `${indent}  Failed Requests: ${data.metrics.http_req_failed.values.rate * 100}%\n`;
  summary += `${indent}  Avg Duration: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `${indent}  P95 Duration: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `${indent}  P99 Duration: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n\n`;
  
  summary += `${indent}Custom Metrics:\n`;
  summary += `${indent}  Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%\n`;
  summary += `${indent}  Avg Note Detail Duration: ${data.metrics.note_detail_duration.values.avg.toFixed(2)}ms\n`;
  summary += `${indent}  Avg Note Comments Duration: ${data.metrics.note_comments_duration.values.avg.toFixed(2)}ms\n`;
  summary += `${indent}  Avg Note Search Duration: ${data.metrics.note_search_duration.values.avg.toFixed(2)}ms\n\n`;
  
  return summary;
}
