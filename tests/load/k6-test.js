import http from 'k6/http';
import { check, sleep } from 'k6';

// k6 Options: configure load progression up to 500 concurrent users (VUs)
export const options = {
  stages: [
    { duration: '30s', target: 100 }, // ramp-up to 100 users
    { duration: '1m', target: 500 },  // ramp-up to 500 users
    { duration: '2m', target: 500 },  // stay at 500 users for 2 minutes (peak load)
    { duration: '30s', target: 100 }, // ramp-down to 100 users
    { duration: '15s', target: 0 },   // ramp-down to 0 users
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],   // error rate must be less than 1%
    http_req_duration: ['p(95)<1500'], // 95% of requests must complete under 1.5s
  },
};

// Base URL will be overridden via environment variable (defaulting to localhost:3000)
const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3000';

export default function () {
  // 1. Simulate user visiting the main app landing page
  const mainRes = http.get(BASE_URL, {
    tags: { name: 'MainAppPage' },
  });
  
  check(mainRes, {
    'status is 200': (r) => r.status === 200,
    'body contains app container': (r) => r.body && r.body.includes('id="root"'),
  });

  sleep(1); // simulate user thinking time (1 second)

  // 2. Simulate requesting core static resources (assets/bundles)
  const bundleRes = http.get(`${BASE_URL}/index.html`, {
    tags: { name: 'AssetsBundle' },
  });

  check(bundleRes, {
    'assets return 200': (r) => r.status === 200,
  });

  sleep(2); // simulate user active interaction time
}
