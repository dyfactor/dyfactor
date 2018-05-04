import hello from 'refactoring';

QUnit.module('refactoring tests');

QUnit.test('hello', assert => {
  assert.equal(hello(), 'Hello from refactoring');
});
