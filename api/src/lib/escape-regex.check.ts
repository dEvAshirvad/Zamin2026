import assert from 'node:assert/strict';

import { escapeRegex } from './escape-regex';

assert.equal(escapeRegex('a.b+c'), String.raw`a\.b\+c`);
assert.equal(escapeRegex('(x)'), String.raw`\(x\)`);
console.log('escape-regex: ok');
