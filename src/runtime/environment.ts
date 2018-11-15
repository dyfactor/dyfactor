import chalk from 'chalk';
import { ExecaReturns, shell } from 'execa';
import * as resolve from 'resolve';
import * as SilentError from 'silent-error';
import { DyfactorConfig, PluginConstructor, PluginType } from '../plugins/plugin';
import { Dict } from '../util/core';
import error from '../util/error';
import { Navigation, Page, Project, ProjectImpl } from './project';

function normalizePages(page: string | Page): Page {
  if (typeof page === 'string') {
    return { url: page };
  }
  return page;
}

export class Environment {
  static create() {
    let project = new ProjectImpl();
    return new this(project);
  }

  navigation: Navigation;
  private guid = 0;
  private _currentScratchBranch = '';
  private project: Project;

  constructor(project: Project) {
    this.project = project;
    let { config } = project;
    let normalized = config.navigation.pages.map(normalizePages);
    this.navigation = Object.assign({}, config.navigation, { pages: normalized });
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

    let resolved = resolve.sync(selectedPlugin!.packageName!, {
      basedir: process.cwd()
    });

    return require(resolved).default;
  }

  async scratchBranch(name: string): Promise<string> {
    let scratchName = (this._currentScratchBranch = this._scratchBranchName(name));
    let branch;
    try {
      branch = this.git(`checkout -b ${scratchName}`);
    } catch (e) {
      console.warn('retrying branch');
      return this.scratchBranch(name);
    }
    return branch;
  }

  get scratchBranchName() {
    return this._currentScratchBranch;
  }

  async commit() {
    await this.git('add .');
    return this.git(`commit --no-verify -m "done"`);
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
      let err = new Error(r.stderr);
      if (err.stack) {
        err.stack = err.stack!.replace('Error:', chalk.red('Error:'));
      }
      throw new SilentError(err);
    }
  );
}
