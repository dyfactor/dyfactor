import { Environment } from '../runtime/environment';
export interface PluginConstructor<T> {
    capabilities: Capabilities;
    new (path: string, env: Environment): T;
}
export declare type Plugins = StaticPlugin | DynamicPlugin;
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
export declare abstract class AbstractHybridPlugin implements DynamicPlugin {
    static capabilities: {
        runtime: boolean;
    } & Capabilities;
    inputs: string[];
    env: Environment;
    constructor(path: string, env: Environment);
    abstract prepare(): void;
    abstract applyMeta(meta: Meta): void;
}
export declare function capabilities(clobber?: Capabilities): {
    runtime: boolean;
} & Capabilities;
