import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  // Simulate 500 concurrent users over a 1-minute period
  stages: [
    { duration: '15s', target: 100 },
    { duration: '30s', target: 500 },
    { duration: '15s', target: 0 },
  ],
  thresholds: {
    // 95% of requests must complete below 2 seconds
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const baseUrl = __ENV.BASE_URL || 'http://127.0.0.1:3000';
  const res = http.get(baseUrl);
  
  check(res, {
    'is status 200': (r) => r.status === 200,
    'body size is > 0': (r) => r.body.length > 0,
  });

  // Simulate user think time
  sleep(1);
}
