import {
  Environment,
  ExtractModeImpl,
  ModifyModeImpl,
  StaticModeImpl,
  modeFactory
} from 'dyfactor';
import { MockPlugin, MockProject } from './utils/mocks';

QUnit.module('Modes');

const path = `${process.cwd()}/test/fixtures/project/app`;

QUnit.test('returns analyzer mode', assert => {
  let env = new Environment(new MockProject());
  let mode = modeFactory({ runtime: false }, 'modify', env, new MockPlugin(path, env));
  assert.ok(mode instanceof StaticModeImpl);
});

QUnit.test('returns data mode', assert => {
  let env = new Environment(new MockProject());
  let mode = modeFactory({ runtime: true }, 'extract', env, new MockPlugin(path, env));
  assert.ok(mode instanceof ExtractModeImpl);
});

QUnit.test('returns modify mode', assert => {
  let env = new Environment(new MockProject());
  let mode = modeFactory({ runtime: true }, 'modify', env, new MockPlugin(path, env));
  assert.ok(mode instanceof ModifyModeImpl);
});

QUnit.test('throws if unknown mode', assert => {
  let env = new Environment(new MockProject());
  assert.throws(() => {
    modeFactory({ runtime: true }, 'bongo', env, new MockPlugin(path, env));
  });
});
