import { ASTPluginEnvironment, preprocess, print } from '@glimmer/syntax';
import { transform } from 'babel-core';
import { ExecaReturns, shell } from 'execa';
import * as fs from 'fs';
import * as path from 'path';
import { NavigationOptions } from 'puppeteer';
import { AbstractHybridPlugin, Meta, PluginConstructor, Plugins } from '../plugins/plugin';

function instrumentCreate(babel: any) {
  const { types: t } = babel;
  let ident: any;
  let template = babel.template(`
    IDENT.reopenClass({
      create(injections) {
        let instance = this._super(injections);
        console.log(JSON.stringify({ [instance._debugContainerKey
        ]: Object.keys(injections.attrs) }));
        return instance;
      }
    });
  `);
  return {
    name: 'instrument-create',
    visitor: {
      Program: {
        enter(p: any) {
          ident = p.scope.generateUidIdentifier('refactor');
        },
        exit(p: any) {
          let body = p.node.body;
          let ast = template({ IDENT: ident });
          body.push(ast, t.exportDefaultDeclaration(ident));
        }
      },
      ExportDefaultDeclaration(p: any) {
        let declaration = p.node.declaration;
        let declarator = t.variableDeclarator(ident, declaration);
        let varDecl = t.variableDeclaration('const', [declarator]);
        p.replaceWith(varDecl);
      }
    }
  };
}

function toArgs(args: any) {
  return ({ syntax }: ASTPluginEnvironment) => {
    return {
      name: 'to-@args',
      visitor: {
        MustacheStatement(node: any) {
          if (args.includes(node.path.parts.join('.'))) {
            node.path =  syntax.builders.path(`@${node.path.parts.join('.')}`, node.path.loc);
          }
        }
      }
    };
  };
}

class Disambiguate extends AbstractHybridPlugin {
  prepare() {
    let compiler = this.env.getCompiler('js');
    return this.inputs.filter(input => {
      let ext = path.extname(input);
      return input.charAt(input.length - 1) !== '/' &&
             input.includes('components/') &&
             ext === '.js';
    }).forEach(input => {
      let code = fs.readFileSync(input, 'utf8');
      let content = compiler(code, {
        plugins: [instrumentCreate]
      });

      fs.writeFileSync(input, content.code);
    });
  }

  applyMeta(meta: Meta) {
    meta.data.forEach((d: string) => {
      let components = JSON.parse(d);
      Object.keys(components).forEach(component => {
        let p = this.templateFor(component);
        let template = fs.readFileSync(p!, 'utf8');
        let ast = preprocess(template, {
          plugins: {
            ast: [toArgs(components[component])]
          }
        });
        fs.writeFileSync(p!, print(ast));
      });
    });
  }

  private templateFor(fullName: string) {
    let [, name] = fullName.split(':');
    return this.inputs.find(input => input.includes(`templates/components/${name}`));
  }
}

export interface Config {
  navigation?: Navigation;
  build?: string;
}

export interface Navigation {
  urls: string[];
  options?: NavigationOptions;
}

export class Environment {
  navigation?: Navigation;
  private _plugins: Map<string, Map<string, PluginConstructor<Plugins>>> = new Map();
  private buildCmd = 'yarn start';
  private guid = 0;
  private _currentScratchBranch = '';

  constructor(config: Config) {
    if (config.navigation) {
      this.navigation = config.navigation;
    }

    if (config.build) {
      this.buildCmd = config.build;
    }

    this.loadPlugins();
  }

  getCompiler(_name: string) {
    return transform;
  }

  get types() {
    let keys = this._plugins.keys();
    let types: string[] = [];
    for (let key of keys) {
      types.push(key);
    }

    return types;
  }

  get plugins() {
    return [...this.types.map(type => {
      let plugins = this._plugins.get(type)!.keys();

      for (let plugin of plugins) {
        let { capabilities } = this._plugins.get(type)!.get(plugin)!;
        if (capabilities.runtime) {
          return { name: plugin, modes: ['data', 'havoc'] };
        } else {
          return { name: plugin, modes: ['analyze'] };
        }
      }

      return null;
    })];
  }

  loadPlugins() {
    let templatePlugins: Map<string, PluginConstructor<Plugins>> = new Map();
    templatePlugins.set('disambiguate', Disambiguate);
    this._plugins.set('template', templatePlugins);
  }

  lookupPlugin(type: string, plugin: string) {
    let types = this._plugins.get(type);

    if (!types) {
      throw new Error(`No type "${type}" found.`);
    }

    let pluginConstructor = types.get(plugin);

    if (!pluginConstructor) {
      throw new Error(`No plugin called "${plugin}" was found.`);
    }

    return pluginConstructor;
  }

  async scratchBranch(name: string) {
    let scratchName = this._currentScratchBranch = this._scratchBranchName(name);
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
  return shell(cmd).then((result: ExecaReturns) => {
    return result.stdout;
  }, (r: ExecaReturns) => {
    // tslint:disable:no-console
    console.log(r.stdout);
    console.error(r.stderr);
    throw new Error(`failed: ${cmd}`);
  });
}
