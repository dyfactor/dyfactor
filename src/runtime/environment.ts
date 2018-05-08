import { ExecaReturns, shell } from 'execa';
import { DyfactorConfig, PluginConstructor, PluginType } from '../plugins/plugin';
import { Dict } from '../util/core';
import error from '../util/error';
import { Navigation, Project, ProjectImpl } from './project';

export class Environment {
  static create() {
    let project = new ProjectImpl();
    return new this(project);
  }

  navigation?: Navigation;
  private buildCmd = 'yarn start';
  private guid = 0;
  private _currentScratchBranch = '';
  private project: Project;

  constructor(project: Project) {
    this.project = project;
    let { config } = project;
    if (config.navigation) {
      this.navigation = config.navigation;
    }

    if (config.build) {
      this.buildCmd = config.build;
    }
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
