export function jsonPath(parts) {
  if (parts.length === 0) return '$';
  return `$${parts.map((part) => (String(part).match(/^[A-Za-z_$][\w$-]*$/) ? `.${part}` : `[${JSON.stringify(part)}]`)).join('')}`;
}

function typeOf(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

function typeMatches(value, expected) {
  if (expected === 'null') return value === null;
  if (expected === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (expected === 'integer') return Number.isInteger(value);
  if (expected === 'array') return Array.isArray(value);
  if (expected === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  return typeof value === expected;
}

function expectedTypes(schema) {
  return Array.isArray(schema.type) ? schema.type : [schema.type].filter(Boolean);
}

export function validateNode(value, schema, pathParts, errors) {
  if (!schema || typeof schema !== 'object') return;

  const types = expectedTypes(schema);
  if (types.length > 0 && !types.some((type) => typeMatches(value, type))) {
    errors.push(`${jsonPath(pathParts)}: expected ${types.join(' or ')}, got ${typeOf(value)}`);
    return;
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(
      `${jsonPath(pathParts)}: expected one of ${schema.enum.map((item) => JSON.stringify(item)).join(', ')}`
    );
  }

  if (typeof schema.minimum === 'number' && typeof value === 'number' && value < schema.minimum) {
    errors.push(`${jsonPath(pathParts)}: must be >= ${schema.minimum}`);
  }

  if (typeof schema.maximum === 'number' && typeof value === 'number' && value > schema.maximum) {
    errors.push(`${jsonPath(pathParts)}: must be <= ${schema.maximum}`);
  }

  if (schema.pattern && typeof value === 'string' && !new RegExp(schema.pattern).test(value)) {
    errors.push(`${jsonPath(pathParts)}: does not match pattern ${schema.pattern}`);
  }

  if (Array.isArray(value)) {
    if (typeof schema.minItems === 'number' && value.length < schema.minItems) {
      errors.push(`${jsonPath(pathParts)}: must contain at least ${schema.minItems} item(s)`);
    }
    if (schema.items) {
      value.forEach((item, index) => validateNode(item, schema.items, [...pathParts, index], errors));
    }
    return;
  }

  if (!typeMatches(value, 'object')) return;

  const properties = schema.properties || {};
  for (const key of schema.required || []) {
    if (!(key in value)) errors.push(`${jsonPath([...pathParts, key])}: required key is missing`);
  }

  for (const [key, child] of Object.entries(value)) {
    if (Object.hasOwn(properties, key)) {
      validateNode(child, properties[key], [...pathParts, key], errors);
      continue;
    }

    if (schema.additionalProperties === false) {
      errors.push(`${jsonPath([...pathParts, key])}: unknown key`);
    } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      validateNode(child, schema.additionalProperties, [...pathParts, key], errors);
    }
  }
}

export function validateAgainstSchema(data, schema) {
  const errors = [];
  validateNode(data, schema, [], errors);
  return { ok: errors.length === 0, errors };
}
