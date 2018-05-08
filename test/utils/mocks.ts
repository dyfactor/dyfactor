import { AbstractHybridPlugin, Meta, Project } from 'dyfactor';

export class MockProject implements Project {
  config = {};
  plugins = {};
  pluginsByType() {
    return {};
  }
}

export class MockPlugin extends AbstractHybridPlugin {
  instrument(): void {}
  modify(_meta: Meta): void {}
}
