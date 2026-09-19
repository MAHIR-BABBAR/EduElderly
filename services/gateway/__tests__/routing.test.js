/**
 * Route matching at the gateway.
 *
 * These pin two behaviours that were previously wrong and are easy to break
 * again, because both fail silently rather than loudly:
 *
 *   1. A public route written as `prefix: '/'` has to match the service root
 *      itself, not only paths below it. `GET /api/v1/categories` was returning
 *      401 while `GET /api/v1/categories/x` was allowed.
 *
 *   2. Express strips the mount path before the proxy sees a request, so a
 *      service mounted on a sub-path of its target needs the base path
 *      prepended. `/api/v1/categories` was silently proxying to the course
 *      service root and returning the course list.
 */
const { isPublicRoute, matchesPrefix, endpointPathFor } = require('../src/authValidation');
const { ROUTES_CONFIG } = require('../routes.config');

describe('gateway prefix matching', () => {
  it('matches a service prefix exactly or at a path boundary', () => {
    expect(matchesPrefix('/api/v1/courses', '/api/v1/courses')).toBe(true);
    expect(matchesPrefix('/api/v1/courses/abc', '/api/v1/courses')).toBe(true);
  });

  it('does not match a different route that merely starts with the same text', () => {
    expect(matchesPrefix('/api/v1/coursesXYZ', '/api/v1/courses')).toBe(false);
  });

  it('normalises the service root to "/"', () => {
    expect(endpointPathFor('/api/v1/categories', '/api/v1/categories')).toBe('/');
    expect(endpointPathFor('/api/v1/categories/abc', '/api/v1/categories')).toBe('/abc');
  });
});

describe('public route rules', () => {
  it('treats the service root as public when the rule is a "/" prefix', () => {
    expect(isPublicRoute('GET', '/api/v1/categories')).toBe(true);
    expect(isPublicRoute('GET', '/api/v1/categories/abc')).toBe(true);
    expect(isPublicRoute('GET', '/api/v1/stats')).toBe(true);
  });

  it('keeps the course catalog public but its writes protected', () => {
    expect(isPublicRoute('GET', '/api/v1/courses')).toBe(true);
    expect(isPublicRoute('GET', '/api/v1/courses/abc-123')).toBe(true);
    expect(isPublicRoute('POST', '/api/v1/courses')).toBe(false);
    expect(isPublicRoute('DELETE', '/api/v1/courses/abc-123')).toBe(false);
  });

  it('leaves learner data behind authentication', () => {
    expect(isPublicRoute('GET', '/api/v1/enrollments')).toBe(false);
    expect(isPublicRoute('GET', '/api/v1/users/profile')).toBe(false);
    expect(isPublicRoute('GET', '/api/v1/admin/dashboard')).toBe(false);
    expect(isPublicRoute('GET', '/api/v1/payments/transactions/me')).toBe(false);
  });

  it('exposes only the documented public auth routes', () => {
    expect(isPublicRoute('POST', '/api/v1/auth/login')).toBe(true);
    expect(isPublicRoute('POST', '/api/v1/auth/register')).toBe(true);
    expect(isPublicRoute('POST', '/api/v1/auth/change-password')).toBe(false);
  });

  it('allows the signed payment webhook through without a JWT', () => {
    expect(isPublicRoute('POST', '/api/v1/payments/webhook')).toBe(true);
  });

  it('allows public certificate verification only', () => {
    expect(isPublicRoute('GET', '/api/v1/certificates/abc-123/verify')).toBe(true);
    expect(isPublicRoute('GET', '/api/v1/certificates/me')).toBe(false);
  });
});

describe('proxy target configuration', () => {
  it('gives every routed service a target', () => {
    for (const [name, service] of Object.entries(ROUTES_CONFIG)) {
      if (name === 'health') continue;
      expect(service.target).toBeTruthy();
      expect(service.prefix.startsWith('/api/v1/')).toBe(true);
    }
  });

  it('declares a base path for services mounted under a sub-path of their target', () => {
    // Both share a target with another prefix, so without a base path they
    // would proxy to that service's root.
    expect(ROUTES_CONFIG.categories.targetBasePath).toBe('/categories');
    expect(ROUTES_CONFIG.stats.targetBasePath).toBe('/public-stats');
    expect(ROUTES_CONFIG.courses.targetBasePath).toBeUndefined();
  });
});
