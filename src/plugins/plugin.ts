import * as walkSync from 'walk-sync';
import { Environment } from '../runtime/environment';

export interface PluginConstructor<T> {
  capabilities: Capabilities;
  new(path: string, env: Environment): T;
}

export type Plugins = StaticPlugin | DynamicPlugin;

export interface PluginDescriptor {
  name: string;
  modes: string[];
}

export interface Plugin {
  inputs: string[];
  env: Environment;
}

export interface Meta {
  data: any;
}

export interface StaticPlugin extends Plugin {
  analyze(): void;
}

export interface DynamicPlugin extends Plugin {
  prepare(): void;
  applyMeta(meta: Meta): void;
}

export interface Capabilities {
  runtime: boolean;
}

export abstract class AbstractHybridPlugin implements DynamicPlugin {
  static capabilities = capabilities({ runtime: true });
  inputs: string[];
  env: Environment;

  constructor(path: string, env: Environment) {
    this.env = env;
    this.inputs = walkSync(path) as string[];
    this.inputs = this.inputs.map(input => `${path}/${input}`);
  }

  abstract prepare(): void;
  abstract applyMeta(meta: Meta): void;
}

export function capabilities(clobber?: Capabilities) {
  return Object.assign({
    runtime: false
  }, clobber);
}