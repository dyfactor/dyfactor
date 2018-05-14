import { AbstractDynamicPlugin, Project, Telemetry } from 'dyfactor';

export class MockProject implements Project {
  config = {};
  plugins = {};
  pluginsByType() {
    return {};
  }
}

export class MockPlugin extends AbstractDynamicPlugin {
  instrument(): void {}
  modify(_telemetry: Telemetry): void {}
}
