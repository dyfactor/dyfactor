import { DynamicPlugin, Meta, Plugins, StaticPlugin } from '../plugins/plugin';
import { Environment } from './environment';
export declare const enum Modes {
    analyze = 0,
    data = 1,
    safe = 2,
    havoc = 3,
}
export declare function modeFactory(mode: number, env: Environment, plugin: Plugins): AnalyzeMode | DataMode;
export interface ModeConstructor<T> {
    new (env: Environment, plugin: T): BaseMode<T>;
}
export interface Mode {
    analyze(): void;
    apply(meta: Meta): void;
    prepare(): Promise<void>;
    run(): Promise<Meta>;
}
export declare class BaseMode<T> implements Mode {
    protected env: Environment;
    protected plugin: T;
    constructor(env: Environment, plugin: T);
    analyze(): void;
    apply(_meta: Meta): void;
    prepare(): Promise<void>;
    run(): Promise<Meta>;
}
export declare class AnalyzeMode extends BaseMode<StaticPlugin> {
    analyze(): void;
}
export declare class DataMode extends BaseMode<DynamicPlugin> {
    private workingBranch;
    private spinner;
    prepare(): Promise<void>;
    run(): Promise<Meta>;
    apply(meta: Meta): void;
}
export declare class HavocMode extends DataMode {
    apply(meta: Meta): void;
}
