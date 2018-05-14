import * as walkSync from 'walk-sync';
import { Environment } from '../runtime/environment';
import { Option } from '../util/core';

export interface PluginConstructor<T> {
  capabilities: Capabilities;
  new (path: string, env: Environment): T;
}

export type PluginType = StaticPlugin | DynamicPlugin;

export interface DyfactorConfig {
  name: string;
  type: string;
  levels: string[];
  packageName: Option<string>;
}

export interface Plugin {
  inputs: string[];
  env: Environment;
}

export interface Telemetry {
  data: any;
}

export interface StaticPlugin extends Plugin {
  modify(): void;
}

export interface DynamicPlugin extends Plugin {
  instrument(): void;
  modify(telemetry: Telemetry): void;
}

export interface Capabilities {
  runtime: boolean;
}

export class BasePlugin implements Plugin {
  inputs: string[];
  env: Environment;

  constructor(path: string, env: Environment) {
    this.env = env;
    this.inputs = walkSync(path) as string[];
    this.inputs = this.inputs.map(input => `${path}/${input}`);
  }
}

export abstract class AbstractHybridPlugin extends BasePlugin implements DynamicPlugin {
  static capabilities = capabilities({ runtime: true });
  abstract instrument(): void;
  abstract modify(telemetry: Telemetry): void;
}

export abstract class AbstractStaticPlugin extends BasePlugin implements StaticPlugin {
  static capabilities = capabilities();
  abstract modify(): void;
}

export function capabilities(clobber?: Capabilities) {
  return Object.assign(
    {
      runtime: false
    },
    clobber
  );
}
