import * as fs from 'fs';
import { NavigationOptions } from 'puppeteer';
import { DyfactorConfig } from '../plugins/plugin';
import error from '../util/error';

export interface Navigation {
  urls: string[];
  options?: NavigationOptions;
}

export interface Config {
  navigation?: Navigation;
  build?: string;
}

export interface PackageJSON {
  name: string;
  devDependencies: Dependencies;
  dependencies: Dependencies;
  dyfactor?: DyfactorConfig;
}

export interface Dependencies {
  [key: string]: string;
}

export interface PluginTypes {
  [key: string]: DyfactorConfig[];
}

export interface Plugins {
  [key: string]: DyfactorConfig;
}

export interface Project {
  config: Config;
  plugins: Plugins;
  pluginsByType(): PluginTypes;
}

export class ProjectImpl implements Project {
  private pkg: PackageJSON;
  private _pluginsByType: PluginTypes = {};
  config: Config;
  plugins: Plugins = {};
  constructor() {
    const dyfactorPath = `${process.cwd()}/.dyfactor.json`;

    if (!fs.statSync(dyfactorPath)) {
      error('.dyfactor.json not found in the root of the project. Please run `dyfactor init`.');
    }

    this.config = JSON.parse(fs.readFileSync(dyfactorPath, 'utf8'));
    this.pkg = JSON.parse(fs.readFileSync(`${process.cwd()}/package.json`, 'utf8'));
    this.discoverPlugins();
  }

  pluginsByType() {
    Object.keys(this.plugins).forEach(plugin => {
      let type = this.plugins[plugin].type;
      if (!this._pluginsByType[type]) {
        this._pluginsByType[type] = [];
      }

      this._pluginsByType[type].push(this.plugins[plugin]);
    });

    return this._pluginsByType;
  }

  private discoverPlugins() {
    let { pkg } = this;
    let deps = Object.assign({}, pkg.dependencies, pkg.devDependencies);
    Object.keys(deps).forEach(dep => {
      let pkg: PackageJSON = JSON.parse(
        fs.readFileSync(`${process.cwd()}/node_modules/${dep}/package.json`, 'utf8')
      );
      if (pkg.dyfactor) {
        this.plugins[pkg.dyfactor.name] = Object.assign(
          {},
          { packageName: pkg.name },
          pkg.dyfactor
        );
      }
    });
  }
}
