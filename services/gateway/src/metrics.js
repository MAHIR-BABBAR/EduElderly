/**
 * Prometheus metrics for the gateway.
 *
 * Exposes Node process defaults plus two HTTP series labelled by the service
 * prefix a request was routed to (never the full path, so cardinality stays
 * bounded), method, and status code. Scrape `/metrics`; open in development,
 * admin JWT in production unless METRICS_PUBLIC=true.
 */

const client = require('prom-client');
const { ROUTES_CONFIG } = require('../routes.config');

const registry = new client.Registry();
registry.setDefaultLabels({ service: 'gateway' });
client.collectDefaultMetrics({ register: registry });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Requests handled by the gateway',
  labelNames: ['route', 'method', 'status'],
  registers: [registry],
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Gateway request latency including the proxied upstream call',
  labelNames: ['route', 'method', 'status'],
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

const PREFIXES = Object.values(ROUTES_CONFIG)
  .map((service) => service.prefix)
  .sort((a, b) => b.length - a.length);

const routeLabel = (path) => {
  if (path === '/metrics' || path === '/docs' || path.startsWith('/docs/')) return path.split('/')[1];
  const prefix = PREFIXES.find((p) => path === p || path.startsWith(`${p}/`));
  return prefix || 'other';
};

const metricsMiddleware = (req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    const labels = { route: routeLabel(req.path), method: req.method, status: String(res.statusCode) };
    httpRequestsTotal.inc(labels);
    end(labels);
  });
  next();
};

const metricsHandler = async (_req, res) => {
  res.set('Content-Type', registry.contentType);
  res.send(await registry.metrics());
};

module.exports = { metricsMiddleware, metricsHandler, registry, routeLabel };
