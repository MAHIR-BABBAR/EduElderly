const request = require('supertest');
const { createApp } = require('../src/index');
const { UserProfile } = require('../src/models/UserProfile');
const { ROLES } = require('@eduelderly/shared/constants/roles');

const app = createApp();
const SERVICE_KEY = 'test_internal_key';

describe('Auth ↔ User integration', () => {
  it('should create profile via internal API and read via gateway-style headers', async () => {
    const createRes = await request(app)
      .post('/internal/profile')
      .set('X-Service-Key', SERVICE_KEY)
      .send({
        userId: 'integration-user-1',
        name: 'Integration User',
        email: 'integration@test.com',
        role: ROLES.LEARNER,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.userId).toBe('integration-user-1');

    const profileRes = await request(app)
      .get('/profile')
      .set({
        'x-user-id': 'integration-user-1',
        'x-user-role': ROLES.LEARNER,
      });

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.data.email).toBe('integration@test.com');
    expect(profileRes.body.data.name).toBe('Integration User');

    const stored = await UserProfile.findOne({ userId: 'integration-user-1' });
    expect(stored).toBeTruthy();
    expect(stored.isActive).toBe(true);
  });
});
