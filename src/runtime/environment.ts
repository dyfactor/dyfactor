import { transform } from 'babel-core';
import { ExecaReturns, shell } from 'execa';
import * as fs from 'fs';
import { NavigationOptions } from 'puppeteer';
import { DyfactorConfig, PluginConstructor, PluginType } from '../plugins/plugin';
import { Dict } from '../util/core';
import error from '../util/error';
import { Project } from './project';

export interface Config {
  navigation?: Navigation;
  build?: string;
}

export interface Navigation {
  urls: string[];
  options?: NavigationOptions;
}

export class Environment {
  static create() {
    const dyfactorPath = `${process.cwd()}/.dyfactor.json`;

    if (!fs.statSync(dyfactorPath)) {
      error('.dyfactor.json not found in the root of the project. Please run `dyfactor init`.');
    }

    let project = new Project();

    let config: Config = JSON.parse(fs.readFileSync(dyfactorPath, 'utf8'));
    return new this(project, config);
  }

  navigation?: Navigation;
  private buildCmd = 'yarn start';
  private guid = 0;
  private _currentScratchBranch = '';
  private project: Project;

  constructor(project: Project, config: Config) {
    this.project = project;
    if (config.navigation) {
      this.navigation = config.navigation;
    }

    if (config.build) {
      this.buildCmd = config.build;
    }
  }

  getCompiler(_name: string) {
    return transform;
  }

  get types() {
    let { project } = this;
    return Object.keys(project.plugins).map(plugin => {
      return project.plugins[plugin].type;
    });
  }

  get plugins(): Dict<DyfactorConfig> {
    let { project } = this;
    return project.plugins;
  }

  lookupPlugin(type: string, plugin: string): PluginConstructor<PluginType> {
    let { project } = this;
    let types = project.pluginsByType();

    if (!types[type]) {
      error(`No type "${type}" found.`);
    }

    let selectedPlugin = types[type].find(p => {
      return p.name === plugin;
    });

    if (!selectedPlugin) {
      error(`No plugin called "${plugin}" was found.`);
    }

    return require(selectedPlugin!.packageName!);
  }

  async scratchBranch(name: string) {
    let scratchName = (this._currentScratchBranch = this._scratchBranchName(name));
    return this.git(`checkout -b ${scratchName}`);
  }

  get scratchBranchName() {
    return this._currentScratchBranch;
  }

  async commit() {
    await this.git('add .');
    return this.git(`commit -m "done"`);
  }

  async deleteScratchBranch() {
    return await this.git(`branch -D ${this._currentScratchBranch}`);
  }

  async checkoutBranch(name: string) {
    return this.git(`checkout ${name}`);
  }

  async currentBranch() {
    let branches = await this.git(`branch`);
    let branch = branches.split('\n').find((b: string) => b.charAt(0) === '*')!;
    return branch.slice(2, branch.length);
  }

  async build() {
    return exec(this.buildCmd);
  }

  private _scratchBranchName(name: string) {
    return `scratch-${name}-${this.guid++}`;
  }

  private async git(command: string) {
    return exec(`git ${command}`);
  }
}

async function exec(cmd: string) {
  return shell(cmd).then(
    (result: ExecaReturns) => {
      return result.stdout;
    },
    (r: ExecaReturns) => {
      // tslint:disable:no-console
      console.log(r.stdout);
      console.error(r.stderr);
      throw new Error(`failed: ${cmd}`);
    }
  );
}
