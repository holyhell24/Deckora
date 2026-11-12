const assert = require('node:assert/strict');
const test = require('node:test');
const {
  isValidNickname,
  isValidPassword,
  isValidUsername,
} = require('./validation');

test('usernames and nicknames allow 3–15 alphanumeric characters', () => {
  for (const isValid of [isValidUsername, isValidNickname]) {
    assert.equal(isValid('abc'), true);
    assert.equal(isValid('NiCKname'), true);
    assert.equal(isValid('a'.repeat(15)), true);
    assert.equal(isValid('ab'), false);
    assert.equal(isValid('a'.repeat(16)), false);
    assert.equal(isValid('user_name'), false);
  }
});

test('passwords accept short values but reject empty and oversized values', () => {
  assert.equal(isValidPassword('1'), true);
  assert.equal(isValidPassword('123'), true);
  assert.equal(isValidPassword(''), false);
  assert.equal(isValidPassword('x'.repeat(129)), false);
});
