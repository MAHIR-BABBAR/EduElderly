#!/usr/bin/env node
/**
 * Validates every service's OpenAPI document and optionally exports them.
 *
 *   node scripts/validate-openapi.js            # validate only (CI)
 *   node scripts/validate-openapi.js --export   # also write docs/openapi/<service>.json
 *
 * Checks are deliberately structural rather than a full schema validation:
 * every operation must carry a summary, tags, and responses; every `$ref`
 * must resolve; every service must be reachable through a gateway prefix.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SERVICES = ['auth', 'user', 'course', 'enrollment', 'quiz', 'payment', 'notification', 'admin', 'certificate'];
const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options']);
const shouldExport = process.argv.includes('--export');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

const collectRefs = (node, refs = []) => {
  if (Array.isArray(node)) {
    node.forEach((item) => collectRefs(item, refs));
  } else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key === '$ref' && typeof value === 'string') refs.push(value);
      else collectRefs(value, refs);
    }
  }
  return refs;
};

const resolveRef = (spec, ref) => {
  if (!ref.startsWith('#/')) return false;
  return ref
    .slice(2)
    .split('/')
    .reduce((node, segment) => (node && node[segment] !== undefined ? node[segment] : undefined), spec) !== undefined;
};

const validateSpec = (service, spec) => {
  const errors = [];

  if (spec.openapi !== '3.0.3') errors.push('openapi version must be 3.0.3');
  if (!spec.info?.title) errors.push('info.title missing');
  if (!spec.servers?.[0]?.url?.startsWith('/api/v1/')) errors.push('servers[0].url must be a gateway prefix');

  let operations = 0;
  for (const [route, ops] of Object.entries(spec.paths || {})) {
    for (const [method, op] of Object.entries(ops)) {
      if (!HTTP_METHODS.has(method)) continue;
      operations += 1;
      const label = `${method.toUpperCase()} ${route}`;
      if (!op.summary) errors.push(`${label}: summary missing`);
      if (!op.tags?.length) errors.push(`${label}: tags missing`);
      if (!op.responses || Object.keys(op.responses).length === 0) errors.push(`${label}: responses missing`);
      if (!op.security) errors.push(`${label}: security missing (use bearer, service, or publicRoute)`);
      const declaredTags = new Set((spec.tags || []).map((t) => t.name));
      for (const tag of op.tags || []) {
        if (!declaredTags.has(tag)) errors.push(`${label}: tag '${tag}' not declared in spec.tags`);
      }
    }
  }
  if (operations === 0) errors.push('no operations');

  for (const ref of new Set(collectRefs(spec))) {
    if (!resolveRef(spec, ref)) errors.push(`unresolved $ref ${ref}`);
  }

  return { errors, operations };
};

let failed = false;
let totalOps = 0;

for (const service of SERVICES) {
  const specPath = path.join(ROOT, 'services', service, 'src', 'docs', 'openapi.js');
  let spec;
  try {
    spec = require(specPath);
  } catch (error) {
    console.error(`✖ ${service}: cannot load ${path.relative(ROOT, specPath)} — ${error.message}`);
    failed = true;
    continue;
  }

  const { errors, operations } = validateSpec(service, spec);
  totalOps += operations;
  if (errors.length) {
    failed = true;
    console.error(`✖ ${service}: ${errors.length} problem(s)`);
    errors.forEach((e) => console.error(`    - ${e}`));
  } else {
    console.log(`✔ ${service}: ${operations} operations`);
  }

  if (shouldExport && !errors.length) {
    const outDir = path.join(ROOT, 'docs', 'openapi');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, `${service}.json`), `${JSON.stringify(spec, null, 2)}\n`);
  }
}

console.log(`${failed ? 'FAILED' : 'OK'} — ${totalOps} operations across ${SERVICES.length} services`);
process.exit(failed ? 1 : 0);
