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

function resolveLocalRef(schema, rootSchema) {
  if (!schema?.$ref) return schema;
  if (typeof schema.$ref !== 'string') return null;
  if (!schema.$ref.startsWith('#/')) return schema;
  return schema.$ref
    .slice(2)
    .split('/')
    .map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'))
    .reduce((node, part) => node?.[part], rootSchema);
}

const MAX_SCHEMA_EVALUATION_DEPTH = 128;
const SAFE_SCHEMA_PATTERNS = new Set([
  '^[a-z][a-z0-9-]*$',
  '^[A-Za-z0-9._-]+$',
  '^.+$',
  '^[a-z][a-z0-9-]{2,40}$',
  '^\\.qa-ai/',
  '^\\.qa-ai/agents/',
  '^[a-z0-9][a-z0-9-]*\\.rules\\.md$',
  '^[a-z][a-z0-9.]*$'
]);
const SUPPORTED_SCHEMA_KEYWORDS = new Set([
  '$schema',
  '$id',
  '$ref',
  '$defs',
  'title',
  'description',
  'type',
  'const',
  'enum',
  'pattern',
  'minLength',
  'minimum',
  'maximum',
  'minItems',
  'uniqueItems',
  'items',
  'required',
  'properties',
  'additionalProperties',
  'allOf',
  'anyOf',
  'if',
  'then',
  'else',
  'not'
]);

function isSchemaNode(value) {
  return typeof value === 'boolean' || (value !== null && typeof value === 'object' && !Array.isArray(value));
}

function validateSchemaStructure(schema, location, errors, rootSchema, visited = new WeakSet()) {
  if (typeof schema === 'boolean') return;
  if (!isSchemaNode(schema)) {
    errors.push(`${location}: schema node must be an object or boolean`);
    return;
  }
  if (visited.has(schema)) return;
  visited.add(schema);

  for (const keyword of Object.keys(schema)) {
    if (!SUPPORTED_SCHEMA_KEYWORDS.has(keyword)) {
      errors.push(`${location}: schema keyword ${keyword} is not supported`);
    }
  }

  if (Object.hasOwn(schema, '$ref')) {
    if (typeof schema.$ref !== 'string' || !schema.$ref.startsWith('#/')) {
      errors.push(`${location}: schema $ref must be a local #/ reference`);
    } else {
      const target = resolveLocalRef(schema, rootSchema);
      if (target === undefined) {
        errors.push(`${location}: schema $ref is unresolved`);
      } else if (!isSchemaNode(target)) {
        errors.push(`${location}: schema $ref must resolve to an object or boolean schema`);
      }
    }
  }

  for (const keyword of ['$schema', '$id', 'title', 'description']) {
    if (schema[keyword] !== undefined && typeof schema[keyword] !== 'string') {
      errors.push(`${location}: schema ${keyword} must be a string`);
    }
  }

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const allowedTypes = new Set(['null', 'boolean', 'number', 'integer', 'string', 'array', 'object']);
    if (types.length === 0 || types.some((type) => typeof type !== 'string' || !allowedTypes.has(type))) {
      errors.push(`${location}: schema type must contain supported JSON types`);
    }
  }
  if (schema.enum !== undefined && !Array.isArray(schema.enum)) {
    errors.push(`${location}: schema enum must be an array`);
  }
  for (const keyword of ['minLength', 'minItems']) {
    if (schema[keyword] !== undefined && (!Number.isInteger(schema[keyword]) || schema[keyword] < 0)) {
      errors.push(`${location}: schema ${keyword} must be a non-negative integer`);
    }
  }
  for (const keyword of ['minimum', 'maximum']) {
    if (schema[keyword] !== undefined && (typeof schema[keyword] !== 'number' || !Number.isFinite(schema[keyword]))) {
      errors.push(`${location}: schema ${keyword} must be a finite number`);
    }
  }
  if (schema.uniqueItems !== undefined && typeof schema.uniqueItems !== 'boolean') {
    errors.push(`${location}: schema uniqueItems must be a boolean`);
  }
  if (schema.pattern !== undefined) {
    if (typeof schema.pattern !== 'string') {
      errors.push(`${location}: schema pattern must be a string`);
    } else if (!SAFE_SCHEMA_PATTERNS.has(schema.pattern)) {
      errors.push(`${location}: schema pattern is outside the safe allowlist`);
    }
  }
  if (
    schema.required !== undefined &&
    (!Array.isArray(schema.required) || schema.required.some((key) => typeof key !== 'string'))
  ) {
    errors.push(`${location}: schema required must be an array of strings`);
  }

  for (const keyword of ['allOf', 'anyOf']) {
    const branches = schema[keyword];
    if (branches === undefined) continue;
    if (!Array.isArray(branches) || (keyword === 'anyOf' && branches.length === 0)) {
      errors.push(`${location}: schema ${keyword} must be ${keyword === 'anyOf' ? 'a non-empty' : 'an'} array`);
      continue;
    }
    branches.forEach((branch, index) => {
      validateSchemaStructure(branch, `${location}.${keyword}[${index}]`, errors, rootSchema, visited);
    });
  }

  for (const keyword of ['if', 'then', 'else', 'not', 'items', 'additionalProperties']) {
    if (schema[keyword] !== undefined) {
      validateSchemaStructure(schema[keyword], `${location}.${keyword}`, errors, rootSchema, visited);
    }
  }

  for (const keyword of ['properties', '$defs']) {
    const entries = schema[keyword];
    if (entries === undefined) continue;
    if (entries === null || typeof entries !== 'object' || Array.isArray(entries)) {
      errors.push(`${location}: schema ${keyword} must be an object`);
      continue;
    }
    for (const [name, childSchema] of Object.entries(entries)) {
      validateSchemaStructure(childSchema, `${location}.${keyword}.${name}`, errors, rootSchema, visited);
    }
  }
}

function isValidAgainst(value, schema, rootSchema, context) {
  const errors = [];
  validateNode(value, schema, context.pathParts, errors, rootSchema, context);
  return errors.length === 0;
}

export function validateNode(
  value,
  schema,
  pathParts,
  errors,
  rootSchema = schema,
  context = { depth: 0, refStack: [] }
) {
  if (schema === true) return;
  if (schema === false) {
    errors.push(`${jsonPath(pathParts)}: value is rejected by a false schema`);
    return;
  }
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    errors.push(`${jsonPath(pathParts)}: schema node must be an object or boolean`);
    return;
  }
  if (context.depth > MAX_SCHEMA_EVALUATION_DEPTH) {
    errors.push(`${jsonPath(pathParts)}: schema evaluation depth exceeds ${MAX_SCHEMA_EVALUATION_DEPTH}`);
    return;
  }

  const nextContext = (nextPath = pathParts) => ({
    depth: context.depth + 1,
    refStack: context.refStack,
    pathParts: nextPath
  });

  const resolved = resolveLocalRef(schema, rootSchema);
  if (Object.hasOwn(schema, '$ref') && typeof schema.$ref !== 'string') {
    errors.push(`${jsonPath(pathParts)}: schema $ref must be a string`);
    return;
  }
  if (schema.$ref?.startsWith('#/')) {
    if (resolved === undefined) errors.push(`${jsonPath(pathParts)}: unresolved schema reference ${schema.$ref}`);
    else {
      const refKey = `${schema.$ref}@${jsonPath(pathParts)}`;
      if (resolved === schema || context.refStack.includes(refKey)) {
        errors.push(`${jsonPath(pathParts)}: cyclic schema reference ${schema.$ref}`);
      } else {
        validateNode(value, resolved, pathParts, errors, rootSchema, {
          ...nextContext(),
          refStack: [...context.refStack, refKey]
        });
      }
    }
    return;
  }

  if (schema.allOf !== undefined && !Array.isArray(schema.allOf)) {
    errors.push(`${jsonPath(pathParts)}: schema allOf must be an array`);
  } else if (schema.allOf?.some((branch) => !isSchemaNode(branch))) {
    errors.push(`${jsonPath(pathParts)}: schema allOf branches must be objects or booleans`);
  } else {
    for (const branch of schema.allOf || []) {
      validateNode(value, branch, pathParts, errors, rootSchema, nextContext());
    }
  }
  if (schema.anyOf !== undefined && (!Array.isArray(schema.anyOf) || schema.anyOf.length === 0)) {
    errors.push(`${jsonPath(pathParts)}: schema anyOf must be a non-empty array`);
  } else if (schema.anyOf?.some((branch) => !isSchemaNode(branch))) {
    errors.push(`${jsonPath(pathParts)}: schema anyOf branches must be objects or booleans`);
  } else if (schema.anyOf) {
    const anyValid = schema.anyOf.some((branch) => isValidAgainst(value, branch, rootSchema, nextContext()));
    if (!anyValid) {
      errors.push(`${jsonPath(pathParts)}: must match at least one anyOf branch`);
    }
  }
  if (schema.if !== undefined && isValidAgainst(value, schema.if, rootSchema, nextContext())) {
    if (schema.then !== undefined) validateNode(value, schema.then, pathParts, errors, rootSchema, nextContext());
  } else if (schema.else !== undefined) {
    validateNode(value, schema.else, pathParts, errors, rootSchema, nextContext());
  }
  if (schema.not !== undefined && isValidAgainst(value, schema.not, rootSchema, nextContext())) {
    errors.push(`${jsonPath(pathParts)}: value matches a forbidden schema`);
  }

  if (schema.enum !== undefined && !Array.isArray(schema.enum)) {
    errors.push(`${jsonPath(pathParts)}: schema enum must be an array`);
  }
  if (schema.pattern !== undefined && typeof schema.pattern !== 'string') {
    errors.push(`${jsonPath(pathParts)}: schema pattern must be a string`);
  } else if (typeof schema.pattern === 'string' && !SAFE_SCHEMA_PATTERNS.has(schema.pattern)) {
    errors.push(`${jsonPath(pathParts)}: schema pattern is outside the safe allowlist`);
  }
  if (schema.items !== undefined && !isSchemaNode(schema.items)) {
    errors.push(`${jsonPath(pathParts)}: schema items must be an object or boolean`);
  }
  if (
    schema.properties !== undefined &&
    (schema.properties === null || typeof schema.properties !== 'object' || Array.isArray(schema.properties))
  ) {
    errors.push(`${jsonPath(pathParts)}: schema properties must be an object`);
  }
  if (schema.required !== undefined && !Array.isArray(schema.required)) {
    errors.push(`${jsonPath(pathParts)}: schema required must be an array`);
  }
  if (schema.additionalProperties !== undefined && !isSchemaNode(schema.additionalProperties)) {
    errors.push(`${jsonPath(pathParts)}: schema additionalProperties must be an object or boolean`);
  }

  const types = expectedTypes(schema);
  if (types.length > 0 && !types.some((type) => typeMatches(value, type))) {
    errors.push(`${jsonPath(pathParts)}: expected ${types.join(' or ')}, got ${typeOf(value)}`);
    return;
  }

  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    errors.push(
      `${jsonPath(pathParts)}: expected one of ${schema.enum.map((item) => JSON.stringify(item)).join(', ')}`
    );
  }

  if (Object.hasOwn(schema, 'const') && value !== schema.const) {
    errors.push(`${jsonPath(pathParts)}: expected ${JSON.stringify(schema.const)}`);
  }

  if (typeof schema.minLength === 'number' && typeof value === 'string' && value.length < schema.minLength) {
    errors.push(`${jsonPath(pathParts)}: must contain at least ${schema.minLength} character(s)`);
  }

  if (typeof schema.minimum === 'number' && typeof value === 'number' && value < schema.minimum) {
    errors.push(`${jsonPath(pathParts)}: must be >= ${schema.minimum}`);
  }

  if (typeof schema.maximum === 'number' && typeof value === 'number' && value > schema.maximum) {
    errors.push(`${jsonPath(pathParts)}: must be <= ${schema.maximum}`);
  }

  if (
    typeof schema.pattern === 'string' &&
    SAFE_SCHEMA_PATTERNS.has(schema.pattern) &&
    schema.pattern &&
    typeof value === 'string'
  ) {
    try {
      if (!new RegExp(schema.pattern).test(value)) {
        errors.push(`${jsonPath(pathParts)}: does not match pattern ${schema.pattern}`);
      }
    } catch {
      errors.push(`${jsonPath(pathParts)}: schema pattern is not a valid regular expression`);
    }
  }

  if (Array.isArray(value)) {
    if (typeof schema.minItems === 'number' && value.length < schema.minItems) {
      errors.push(`${jsonPath(pathParts)}: must contain at least ${schema.minItems} item(s)`);
    }
    if (schema.uniqueItems === true) {
      const serialized = value.map((item) => JSON.stringify(item));
      if (new Set(serialized).size !== serialized.length) {
        errors.push(`${jsonPath(pathParts)}: array items must be unique`);
      }
    }
    if (schema.items !== undefined && isSchemaNode(schema.items)) {
      value.forEach((item, index) => {
        const itemPath = [...pathParts, index];
        validateNode(item, schema.items, itemPath, errors, rootSchema, nextContext(itemPath));
      });
    }
    return;
  }

  if (!typeMatches(value, 'object')) return;

  const properties =
    schema.properties && typeof schema.properties === 'object' && !Array.isArray(schema.properties)
      ? schema.properties
      : {};
  if (Array.isArray(schema.required)) {
    for (const key of schema.required || []) {
      if (!(key in value)) errors.push(`${jsonPath([...pathParts, key])}: required key is missing`);
    }
  }

  for (const [key, child] of Object.entries(value)) {
    if (Object.hasOwn(properties, key)) {
      const childPath = [...pathParts, key];
      validateNode(child, properties[key], childPath, errors, rootSchema, nextContext(childPath));
      continue;
    }

    if (schema.additionalProperties === false) {
      errors.push(`${jsonPath([...pathParts, key])}: unknown key`);
    } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      const childPath = [...pathParts, key];
      validateNode(child, schema.additionalProperties, childPath, errors, rootSchema, nextContext(childPath));
    }
  }
}

export function validateAgainstSchema(data, schema) {
  const errors = [];
  try {
    validateSchemaStructure(schema, '$schema', errors, schema);
    if (errors.length > 0) return { ok: false, errors };
    validateNode(data, schema, [], errors, schema);
  } catch {
    errors.push('$: schema evaluation failed safely');
  }
  return { ok: errors.length === 0, errors };
}
