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
  // We hit the hosting URL (assuming it's deployed or running locally)
  // Since we don't have the final hosting URL yet, we mock with localhost
  // Replace with your real Firebase Hosting URL before the pitch!
  const url = 'http://localhost:5173';
  
  const res = http.get(url);
  
  check(res, {
    'is status 200': (r) => r.status === 200,
    'body size is > 0': (r) => r.body.length > 0,
  });

  // Simulate user think time
  sleep(1);
}
