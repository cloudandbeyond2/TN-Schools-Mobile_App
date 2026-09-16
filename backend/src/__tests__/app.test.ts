import request from 'supertest';
import app from '../index'; // Import the Express app

// We mock process.env.VERCEL to prevent app.listen from running during tests
// which can cause port conflict issues.
process.env.VERCEL = 'true';

describe('API Health Check', () => {
  it('should return a 200 OK status for the root endpoint', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('message', 'TN Schools AI Ecosystem API');
  });
});
