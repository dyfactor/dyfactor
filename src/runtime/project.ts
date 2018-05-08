import * as fs from 'fs';
import { DyfactorConfig } from '../plugins/plugin';
import { Dict } from '../util/core';

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

export class Project {
  pkg: PackageJSON;
  plugins: Dict<DyfactorConfig> = {};
  _pluginsByType: PluginTypes = {};
  constructor() {
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
        this.plugins[name] = Object.assign({}, { packageName: pkg.name }, pkg.dyfactor);
      }
    });
  }
}
