import { AnalyzeMode, DataMode, Environment, ModifyMode, modeFactory } from 'dyfactor';
import { MockPlugin, MockProject } from './utils/mocks';

QUnit.module('Modes');

const path = `${process.cwd()}/test/fixtures/project/app`;

QUnit.test('returns analyzer mode', assert => {
  let env = new Environment(new MockProject());
  let mode = modeFactory('analyze', env, new MockPlugin(path, env));
  assert.ok(mode instanceof AnalyzeMode);
});

QUnit.test('returns data mode', assert => {
  let env = new Environment(new MockProject());
  let mode = modeFactory('export-data', env, new MockPlugin(path, env));
  assert.ok(mode instanceof DataMode);
});

QUnit.test('returns modify mode', assert => {
  let env = new Environment(new MockProject());
  let mode = modeFactory('modify', env, new MockPlugin(path, env));
  assert.ok(mode instanceof ModifyMode);
});

QUnit.test('throws if unknown mode', assert => {
  let env = new Environment(new MockProject());
  assert.throws(() => {
    modeFactory('bongo', env, new MockPlugin(path, env));
  });
});
