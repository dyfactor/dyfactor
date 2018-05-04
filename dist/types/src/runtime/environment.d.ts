import { transform } from 'babel-core';
import { NavigationOptions } from 'puppeteer';
import { PluginConstructor, Plugins } from '../plugins/plugin';
export interface Config {
    navigation?: Navigation;
    build?: string;
}
export interface Navigation {
    urls: string[];
    options?: NavigationOptions;
}
export declare class Environment {
    navigation?: Navigation;
    private _plugins;
    private buildCmd;
    private guid;
    private _currentScratchBranch;
    constructor(config: Config);
    getCompiler(_name: string): typeof transform;
    readonly types: string[];
    readonly plugins: ({
        name: string;
        modes: string[];
    } | null)[];
    loadPlugins(): void;
    lookupPlugin(type: string, plugin: string): PluginConstructor<Plugins>;
    scratchBranch(name: string): Promise<string>;
    readonly scratchBranchName: string;
    commit(): Promise<string>;
    deleteScratchBranch(): Promise<string>;
    checkoutBranch(name: string): Promise<string>;
    currentBranch(): Promise<string>;
    build(): Promise<string>;
    private _scratchBranchName(name);
    private git(command);
}
