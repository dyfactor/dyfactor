import { ProjectImpl } from 'dyfactor';

let cwd = process.cwd();
QUnit.module('Project', {
  beforeEach() {
    process.chdir(`${process.cwd()}/test/fixtures/project`);
  },
  afterEach() {
    process.chdir(cwd);
  }
});

QUnit.test('Cannot create a project if missing .dyfactor.json', assert => {
  process.chdir(`../project-missing-dyfactor`);
  assert.throws(() => {
    new ProjectImpl();
  }, '.dyfactor.json not found in the root of the project. Please run `dyfactor init`.');
});

QUnit.test('aggregates plugins by name', assert => {
  let project = new ProjectImpl();
  assert.deepEqual(project.plugins, {
    a: {
      packageName: 'plugin-a',
      name: 'a',
      type: 'javascript',
      levels: ['extract', 'modify']
    },
    b: {
      packageName: 'plugin-b',
      name: 'b',
      type: 'template',
      levels: ['modify']
    }
  });
});

QUnit.test('aggregates plugins by types', assert => {
  let project = new ProjectImpl();
  assert.deepEqual(project.pluginsByType(), {
    javascript: [
      {
        packageName: 'plugin-a',
        name: 'a',
        type: 'javascript',
        levels: ['extract', 'modify']
      }
    ],
    template: [
      {
        packageName: 'plugin-b',
        name: 'b',
        type: 'template',
        levels: ['modify']
      }
    ]
  });
});
