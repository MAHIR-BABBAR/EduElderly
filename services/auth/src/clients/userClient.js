const getBaseUrl = () => process.env.USER_SERVICE_URL || 'http://user:3002';

const createUserProfile = async (payload) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${getBaseUrl()}/users/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': process.env.INTERNAL_SERVICE_KEY || '',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`User service responded ${response.status}: ${body}`);
    }

    return response.json();
  } catch (error) {
    console.error('[auth-user] Failed to create user profile:', error.message);
  } finally {
    clearTimeout(timeout);
  }
};

module.exports = { createUserProfile };
