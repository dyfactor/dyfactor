import { AbstractHybridPlugin, Project, Telemetry } from 'dyfactor';

export class MockProject implements Project {
  config = {};
  plugins = {};
  pluginsByType() {
    return {};
  }
}

export class MockPlugin extends AbstractHybridPlugin {
  instrument(): void {}
  modify(_telemetry: Telemetry): void {}
}
