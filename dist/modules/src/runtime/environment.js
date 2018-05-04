import { preprocess, print } from '@glimmer/syntax';
import { transform } from 'babel-core';
import { shell } from 'execa';
import * as fs from 'fs';
import * as path from 'path';
import { AbstractHybridPlugin } from '../plugins/plugin';
function instrumentCreate(babel) {
    const { types: t } = babel;
    let ident;
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
                enter(p) {
                    ident = p.scope.generateUidIdentifier('refactor');
                },
                exit(p) {
                    let body = p.node.body;
                    let ast = template({ IDENT: ident });
                    body.push(ast, t.exportDefaultDeclaration(ident));
                }
            },
            ExportDefaultDeclaration(p) {
                let declaration = p.node.declaration;
                let declarator = t.variableDeclarator(ident, declaration);
                let varDecl = t.variableDeclaration('const', [declarator]);
                p.replaceWith(varDecl);
            }
        }
    };
}
function toArgs(args) {
    return ({ syntax }) => {
        return {
            name: 'to-@args',
            visitor: {
                MustacheStatement(node) {
                    if (args.includes(node.path.parts.join('.'))) {
                        node.path = syntax.builders.path(`@${node.path.parts.join('.')}`, node.path.loc);
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
    applyMeta(meta) {
        meta.data.forEach((d) => {
            let components = JSON.parse(d);
            Object.keys(components).forEach(component => {
                let p = this.templateFor(component);
                let template = fs.readFileSync(p, 'utf8');
                let ast = preprocess(template, {
                    plugins: {
                        ast: [toArgs(components[component])]
                    }
                });
                fs.writeFileSync(p, print(ast));
            });
        });
    }
    templateFor(fullName) {
        let [, name] = fullName.split(':');
        return this.inputs.find(input => input.includes(`templates/components/${name}`));
    }
}
export class Environment {
    constructor(config) {
        this._plugins = new Map();
        this.buildCmd = 'yarn start';
        this.guid = 0;
        this._currentScratchBranch = '';
        if (config.navigation) {
            this.navigation = config.navigation;
        }
        if (config.build) {
            this.buildCmd = config.build;
        }
        this.loadPlugins();
    }
    getCompiler(_name) {
        return transform;
    }
    get types() {
        let keys = this._plugins.keys();
        let types = [];
        for (let key of keys) {
            types.push(key);
        }
        return types;
    }
    get plugins() {
        return [...this.types.map(type => {
                let plugins = this._plugins.get(type).keys();
                for (let plugin of plugins) {
                    let { capabilities } = this._plugins.get(type).get(plugin);
                    if (capabilities.runtime) {
                        return { name: plugin, modes: ['data', 'havoc'] };
                    }
                    else {
                        return { name: plugin, modes: ['analyze'] };
                    }
                }
                return null;
            })];
    }
    loadPlugins() {
        let templatePlugins = new Map();
        templatePlugins.set('disambiguate', Disambiguate);
        this._plugins.set('template', templatePlugins);
    }
    lookupPlugin(type, plugin) {
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
    async scratchBranch(name) {
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
    async checkoutBranch(name) {
        return this.git(`checkout ${name}`);
    }
    async currentBranch() {
        let branches = await this.git(`branch`);
        let branch = branches.split('\n').find((b) => b.charAt(0) === '*');
        return branch.slice(2, branch.length);
    }
    async build() {
        return exec(this.buildCmd);
    }
    _scratchBranchName(name) {
        return `scratch-${name}-${this.guid++}`;
    }
    async git(command) {
        return exec(`git ${command}`);
    }
}
async function exec(cmd) {
    return shell(cmd).then((result) => {
        return result.stdout;
    }, (r) => {
        // tslint:disable:no-console
        console.log(r.stdout);
        console.error(r.stderr);
        throw new Error(`failed: ${cmd}`);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnQuanMiLCJzb3VyY2VSb290IjoiL1VzZXJzL2NoaWV0YWxhL0NvZGUvZHlmYWN0b3IvIiwic291cmNlcyI6WyJydW50aW1lL2Vudmlyb25tZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBd0IsVUFBVSxFQUFFLEtBQUssRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDdkMsT0FBTyxFQUFnQixLQUFLLEVBQUUsTUFBTSxPQUFPLENBQUM7QUFDNUMsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxLQUFLLElBQUksTUFBTSxNQUFNLENBQUM7QUFFN0IsT0FBTyxFQUFFLG9CQUFvQixFQUFvQyxNQUFNLG1CQUFtQixDQUFDO0FBRTNGLDBCQUEwQixLQUFVO0lBQ2xDLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsS0FBSyxDQUFDO0lBQzNCLElBQUksS0FBVSxDQUFDO0lBQ2YsSUFBSSxRQUFRLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQzs7Ozs7Ozs7O0dBUzdCLENBQUMsQ0FBQztJQUNILE1BQU0sQ0FBQztRQUNMLElBQUksRUFBRSxtQkFBbUI7UUFDekIsT0FBTyxFQUFFO1lBQ1AsT0FBTyxFQUFFO2dCQUNQLEtBQUssQ0FBQyxDQUFNO29CQUNWLEtBQUssR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUNwRCxDQUFDO2dCQUNELElBQUksQ0FBQyxDQUFNO29CQUNULElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO29CQUN2QixJQUFJLEdBQUcsR0FBRyxRQUFRLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztvQkFDckMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFD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LEdBQVc7SUFDN0IsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFvQixFQUFFLEVBQUU7UUFDOUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7SUFDdkIsQ0FBQyxFQUFFLENBQUMsQ0FBZSxFQUFFLEVBQUU7UUFDckIsNEJBQTRCO1FBQzVCLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3RCLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3hCLE1BQU0sSUFBSSxLQUFLLENBQUMsV0FBVyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQ3BDLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFTVFBsdWdpbkVudmlyb25tZW50LCBwcmVwcm9jZXNzLCBwcmludCB9IGZyb20gJ0BnbGltbWVyL3N5bnRheCc7XG5pbXBvcnQgeyB0cmFuc2Zvcm0gfSBmcm9tICdiYWJlbC1jb3JlJztcbmltcG9ydCB7IEV4ZWNhUmV0dXJucywgc2hlbGwgfSBmcm9tICdleGVjYSc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgTmF2aWdhdGlvbk9wdGlvbnMgfSBmcm9tICdwdXBwZXRlZXInO1xuaW1wb3J0IHsgQWJzdHJhY3RIeWJyaWRQbHVnaW4sIE1ldGEsIFBsdWdpbkNvbnN0cnVjdG9yLCBQbHVnaW5zIH0gZnJvbSAnLi4vcGx1Z2lucy9wbHVnaW4nO1xuXG5mdW5jdGlvbiBpbnN0cnVtZW50Q3JlYXRlKGJhYmVsOiBhbnkpIHtcbiAgY29uc3QgeyB0eXBlczogdCB9ID0gYmFiZWw7XG4gIGxldCBpZGVudDogYW55O1xuICBsZXQgdGVtcGxhdGUgPSBiYWJlbC50ZW1wbGF0ZShgXG4gICAgSURFTlQucmVvcGVuQ2xhc3Moe1xuICAgICAgY3JlYXRlKGluamVjdGlvbnMpIHtcbiAgICAgICAgbGV0IGluc3RhbmNlID0gdGhpcy5fc3VwZXIoaW5qZWN0aW9ucyk7XG4gICAgICAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHsgW2luc3RhbmNlLl9kZWJ1Z0NvbnRhaW5lcktleVxuICAgICAgICBdOiBPYmplY3Qua2V5cyhpbmplY3Rpb25zLmF0dHJzKSB9KSk7XG4gICAgICAgIHJldHVybiBpbnN0YW5jZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgYCk7XG4gIHJldHVybiB7XG4gICAgbmFtZTogJ2luc3RydW1lbnQtY3JlYXRlJyxcbiAgICB2aXNpdG9yOiB7XG4gICAgICBQcm9ncmFtOiB7XG4gICAgICAgIGVudGVyKHA6IGFueSkge1xuICAgICAgICAgIGlkZW50ID0gcC5zY29wZS5nZW5lcmF0ZVVpZElkZW50aWZpZXIoJ3JlZmFjdG9yJyk7XG4gICAgICAgIH0sXG4gICAgICAgIGV4aXQocDogYW55KSB7XG4gICAgICAgICAgbGV0IGJvZHkgPSBwLm5vZGUuYm9keTtcbiAgICAgICAgICBsZXQgYXN0ID0gdGVtcGxhdGUoeyBJREVOVDogaWRlbnQgfSk7XG4gICAgICAgICAgYm9keS5wdXNoKGFzdCwgdC5leHBvcnREZWZhdWx0RGVjbGFyYXRpb24oaWRlbnQpKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIEV4cG9ydERlZmF1bHREZWNsYXJhdGlvbihwOiBhbnkpIHtcbiAgICAgICAgbGV0IGRlY2xhcmF0aW9uID0gcC5ub2RlLmRlY2xhcmF0aW9uO1xuICAgICAgICBsZXQgZGVjbGFyYXRvciA9IHQudmFyaWFibGVEZWNsYXJhdG9yKGlkZW50LCBkZWNsYXJhdGlvbik7XG4gICAgICAgIGxldCB2YXJEZWNsID0gdC52YXJpYWJsZURlY2xhcmF0aW9uKCdjb25zdCcsIFtkZWNsYXJhdG9yXSk7XG4gICAgICAgIHAucmVwbGFjZVdpdGgodmFyRGVjbCk7XG4gICAgICB9XG4gICAgfVxuICB9O1xufVxuXG5mdW5jdGlvbiB0b0FyZ3MoYXJnczogYW55KSB7XG4gIHJldHVybiAoeyBzeW50YXggfTogQVNUUGx1Z2luRW52aXJvbm1lbnQpID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogJ3RvLUBhcmdzJyxcbiAgICAgIHZpc2l0b3I6IHtcbiAgICAgICAgTXVzdGFjaGVTdGF0ZW1lbnQobm9kZTogYW55KSB7XG4gICAgICAgICAgaWYgKGFyZ3MuaW5jbHVkZXMobm9kZS5wYXRoLnBhcnRzLmpvaW4oJy4nKSkpIHtcbiAgICAgICAgICAgIG5vZGUucGF0aCA9ICBzeW50YXguYnVpbGRlcnMucGF0aChgQCR7bm9kZS5wYXRoLnBhcnRzLmpvaW4oJy4nKX1gLCBub2RlLnBhdGgubG9jKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICB9O1xufVxuXG5jbGFzcyBEaXNhbWJpZ3VhdGUgZXh0ZW5kcyBBYnN0cmFjdEh5YnJpZFBsdWdpbiB7XG4gIHByZXBhcmUoKSB7XG4gICAgbGV0IGNvbXBpbGVyID0gdGhpcy5lbnYuZ2V0Q29tcGlsZXIoJ2pzJyk7XG4gICAgcmV0dXJuIHRoaXMuaW5wdXRzLmZpbHRlcihpbnB1dCA9PiB7XG4gICAgICBsZXQgZXh0ID0gcGF0aC5leHRuYW1lKGlucHV0KTtcbiAgICAgIHJldHVybiBpbnB1dC5jaGFyQXQoaW5wdXQubGVuZ3RoIC0gMSkgIT09ICcvJyAmJlxuICAgICAgICAgICAgIGlucHV0LmluY2x1ZGVzKCdjb21wb25lbnRzLycpICYmXG4gICAgICAgICAgICAgZXh0ID09PSAnLmpzJztcbiAgICB9KS5mb3JFYWNoKGlucHV0ID0+IHtcbiAgICAgIGxldCBjb2RlID0gZnMucmVhZEZpbGVTeW5jKGlucHV0LCAndXRmOCcpO1xuICAgICAgbGV0IGNvbnRlbnQgPSBjb21waWxlcihjb2RlLCB7XG4gICAgICAgIHBsdWdpbnM6IFtpbnN0cnVtZW50Q3JlYXRlXVxuICAgICAgfSk7XG5cbiAgICAgIGZzLndyaXRlRmlsZVN5bmMoaW5wdXQsIGNvbnRlbnQuY29kZSk7XG4gICAgfSk7XG4gIH1cblxuICBhcHBseU1ldGEobWV0YTogTWV0YSkge1xuICAgIG1ldGEuZGF0YS5mb3JFYWNoKChkOiBzdHJpbmcpID0+IHtcbiAgICAgIGxldCBjb21wb25lbnRzID0gSlNPTi5wYXJzZShkKTtcbiAgICAgIE9iamVjdC5rZXlzKGNvbXBvbmVudHMpLmZvckVhY2goY29tcG9uZW50ID0+IHtcbiAgICAgICAgbGV0IHAgPSB0aGlzLnRlbXBsYXRlRm9yKGNvbXBvbmVudCk7XG4gICAgICAgIGxldCB0ZW1wbGF0ZSA9IGZzLnJlYWRGaWxlU3luYyhwISwgJ3V0ZjgnKTtcbiAgICAgICAgbGV0IGFzdCA9IHByZXByb2Nlc3ModGVtcGxhdGUsIHtcbiAgICAgICAgICBwbHVnaW5zOiB7XG4gICAgICAgICAgICBhc3Q6IFt0b0FyZ3MoY29tcG9uZW50c1tjb21wb25lbnRdKV1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBmcy53cml0ZUZpbGVTeW5jKHAhLCBwcmludChhc3QpKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSB0ZW1wbGF0ZUZvcihmdWxsTmFtZTogc3RyaW5nKSB7XG4gICAgbGV0IFssIG5hbWVdID0gZnVsbE5hbWUuc3BsaXQoJzonKTtcbiAgICByZXR1cm4gdGhpcy5pbnB1dHMuZmluZChpbnB1dCA9PiBpbnB1dC5pbmNsdWRlcyhgdGVtcGxhdGVzL2NvbXBvbmVudHMvJHtuYW1lfWApKTtcbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbmZpZyB7XG4gIG5hdmlnYXRpb24/OiBOYXZpZ2F0aW9uO1xuICBidWlsZD86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBOYXZpZ2F0aW9uIHtcbiAgdXJsczogc3RyaW5nW107XG4gIG9wdGlvbnM/OiBOYXZpZ2F0aW9uT3B0aW9ucztcbn1cblxuZXhwb3J0IGNsYXNzIEVudmlyb25tZW50IHtcbiAgbmF2aWdhdGlvbj86IE5hdmlnYXRpb247XG4gIHByaXZhdGUgX3BsdWdpbnM6IE1hcDxzdHJpbmcsIE1hcDxzdHJpbmcsIFBsdWdpbkNvbnN0cnVjdG9yPFBsdWdpbnM+Pj4gPSBuZXcgTWFwKCk7XG4gIHByaXZhdGUgYnVpbGRDbWQgPSAneWFybiBzdGFydCc7XG4gIHByaXZhdGUgZ3VpZCA9IDA7XG4gIHByaXZhdGUgX2N1cnJlbnRTY3JhdGNoQnJhbmNoID0gJyc7XG5cbiAgY29uc3RydWN0b3IoY29uZmlnOiBDb25maWcpIHtcbiAgICBpZiAoY29uZmlnLm5hdmlnYXRpb24pIHtcbiAgICAgIHRoaXMubmF2aWdhdGlvbiA9IGNvbmZpZy5uYXZpZ2F0aW9uO1xuICAgIH1cblxuICAgIGlmIChjb25maWcuYnVpbGQpIHtcbiAgICAgIHRoaXMuYnVpbGRDbWQgPSBjb25maWcuYnVpbGQ7XG4gICAgfVxuXG4gICAgdGhpcy5sb2FkUGx1Z2lucygpO1xuICB9XG5cbiAgZ2V0Q29tcGlsZXIoX25hbWU6IHN0cmluZykge1xuICAgIHJldHVybiB0cmFuc2Zvcm07XG4gIH1cblxuICBnZXQgdHlwZXMoKSB7XG4gICAgbGV0IGtleXMgPSB0aGlzLl9wbHVnaW5zLmtleXMoKTtcbiAgICBsZXQgdHlwZXM6IHN0cmluZ1tdID0gW107XG4gICAgZm9yIChsZXQga2V5IG9mIGtleXMpIHtcbiAgICAgIHR5cGVzLnB1c2goa2V5KTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHlwZXM7XG4gIH1cblxuICBnZXQgcGx1Z2lucygpIHtcbiAgICByZXR1cm4gWy4uLnRoaXMudHlwZXMubWFwKHR5cGUgPT4ge1xuICAgICAgbGV0IHBsdWdpbnMgPSB0aGlzLl9wbHVnaW5zLmdldCh0eXBlKSEua2V5cygpO1xuXG4gICAgICBmb3IgKGxldCBwbHVnaW4gb2YgcGx1Z2lucykge1xuICAgICAgICBsZXQgeyBjYXBhYmlsaXRpZXMgfSA9IHRoaXMuX3BsdWdpbnMuZ2V0KHR5cGUpIS5nZXQocGx1Z2luKSE7XG4gICAgICAgIGlmIChjYXBhYmlsaXRpZXMucnVudGltZSkge1xuICAgICAgICAgIHJldHVybiB7IG5hbWU6IHBsdWdpbiwgbW9kZXM6IFsnZGF0YScsICdoYXZvYyddIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIHsgbmFtZTogcGx1Z2luLCBtb2RlczogWydhbmFseXplJ10gfTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9KV07XG4gIH1cblxuICBsb2FkUGx1Z2lucygpIHtcbiAgICBsZXQgdGVtcGxhdGVQbHVnaW5zOiBNYXA8c3RyaW5nLCBQbHVnaW5Db25zdHJ1Y3RvcjxQbHVnaW5zPj4gPSBuZXcgTWFwKCk7XG4gICAgdGVtcGxhdGVQbHVnaW5zLnNldCgnZGlzYW1iaWd1YXRlJywgRGlzYW1iaWd1YXRlKTtcbiAgICB0aGlzLl9wbHVnaW5zLnNldCgndGVtcGxhdGUnLCB0ZW1wbGF0ZVBsdWdpbnMpO1xuICB9XG5cbiAgbG9va3VwUGx1Z2luKHR5cGU6IHN0cmluZywgcGx1Z2luOiBzdHJpbmcpIHtcbiAgICBsZXQgdHlwZXMgPSB0aGlzLl9wbHVnaW5zLmdldCh0eXBlKTtcblxuICAgIGlmICghdHlwZXMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gdHlwZSBcIiR7dHlwZX1cIiBmb3VuZC5gKTtcbiAgICB9XG5cbiAgICBsZXQgcGx1Z2luQ29uc3RydWN0b3IgPSB0eXBlcy5nZXQocGx1Z2luKTtcblxuICAgIGlmICghcGx1Z2luQ29uc3RydWN0b3IpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gcGx1Z2luIGNhbGxlZCBcIiR7cGx1Z2lufVwiIHdhcyBmb3VuZC5gKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcGx1Z2luQ29uc3RydWN0b3I7XG4gIH1cblxuICBhc3luYyBzY3JhdGNoQnJhbmNoKG5hbWU6IHN0cmluZykge1xuICAgIGxldCBzY3JhdGNoTmFtZSA9IHRoaXMuX2N1cnJlbnRTY3JhdGNoQnJhbmNoID0gdGhpcy5fc2NyYXRjaEJyYW5jaE5hbWUobmFtZSk7XG4gICAgcmV0dXJuIHRoaXMuZ2l0KGBjaGVja291dCAtYiAke3NjcmF0Y2hOYW1lfWApO1xuICB9XG5cbiAgZ2V0IHNjcmF0Y2hCcmFuY2hOYW1lKCkge1xuICAgIHJldHVybiB0aGlzLl9jdXJyZW50U2NyYXRjaEJyYW5jaDtcbiAgfVxuXG4gIGFzeW5jIGNvbW1pdCgpIHtcbiAgICBhd2FpdCB0aGlzLmdpdCgnYWRkIC4nKTtcbiAgICByZXR1cm4gdGhpcy5naXQoYGNvbW1pdCAtbSBcImRvbmVcImApO1xuICB9XG5cbiAgYXN5bmMgZGVsZXRlU2NyYXRjaEJyYW5jaCgpIHtcbiAgICByZXR1cm4gYXdhaXQgdGhpcy5naXQoYGJyYW5jaCAtRCAke3RoaXMuX2N1cnJlbnRTY3JhdGNoQnJhbmNofWApO1xuICB9XG5cbiAgYXN5bmMgY2hlY2tvdXRCcmFuY2gobmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2l0KGBjaGVja291dCAke25hbWV9YCk7XG4gIH1cblxuICBhc3luYyBjdXJyZW50QnJhbmNoKCkge1xuICAgIGxldCBicmFuY2hlcyA9IGF3YWl0IHRoaXMuZ2l0KGBicmFuY2hgKTtcbiAgICBsZXQgYnJhbmNoID0gYnJhbmNoZXMuc3BsaXQoJ1xcbicpLmZpbmQoKGI6IHN0cmluZykgPT4gYi5jaGFyQXQoMCkgPT09ICcqJykhO1xuICAgIHJldHVybiBicmFuY2guc2xpY2UoMiwgYnJhbmNoLmxlbmd0aCk7XG4gIH1cblxuICBhc3luYyBidWlsZCgpIHtcbiAgICByZXR1cm4gZXhlYyh0aGlzLmJ1aWxkQ21kKTtcbiAgfVxuXG4gIHByaXZhdGUgX3NjcmF0Y2hCcmFuY2hOYW1lKG5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBgc2NyYXRjaC0ke25hbWV9LSR7dGhpcy5ndWlkKyt9YDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZ2l0KGNvbW1hbmQ6IHN0cmluZykge1xuICAgIHJldHVybiBleGVjKGBnaXQgJHtjb21tYW5kfWApO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGV4ZWMoY21kOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHNoZWxsKGNtZCkudGhlbigocmVzdWx0OiBFeGVjYVJldHVybnMpID0+IHtcbiAgICByZXR1cm4gcmVzdWx0LnN0ZG91dDtcbiAgfSwgKHI6IEV4ZWNhUmV0dXJucykgPT4ge1xuICAgIC8vIHRzbGludDpkaXNhYmxlOm5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhyLnN0ZG91dCk7XG4gICAgY29uc29sZS5lcnJvcihyLnN0ZGVycik7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBmYWlsZWQ6ICR7Y21kfWApO1xuICB9KTtcbn1cbiJdfQ==