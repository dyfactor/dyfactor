"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const syntax_1 = require("@glimmer/syntax");
const babel_core_1 = require("babel-core");
const execa_1 = require("execa");
const fs = require("fs");
const path = require("path");
const plugin_1 = require("../plugins/plugin");
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
class Disambiguate extends plugin_1.AbstractHybridPlugin {
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
                let ast = syntax_1.preprocess(template, {
                    plugins: {
                        ast: [toArgs(components[component])]
                    }
                });
                fs.writeFileSync(p, syntax_1.print(ast));
            });
        });
    }
    templateFor(fullName) {
        let [, name] = fullName.split(':');
        return this.inputs.find(input => input.includes(`templates/components/${name}`));
    }
}
class Environment {
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
        return babel_core_1.transform;
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
    scratchBranch(name) {
        return __awaiter(this, void 0, void 0, function* () {
            let scratchName = this._currentScratchBranch = this._scratchBranchName(name);
            return this.git(`checkout -b ${scratchName}`);
        });
    }
    get scratchBranchName() {
        return this._currentScratchBranch;
    }
    commit() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.git('add .');
            return this.git(`commit -m "done"`);
        });
    }
    deleteScratchBranch() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.git(`branch -D ${this._currentScratchBranch}`);
        });
    }
    checkoutBranch(name) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.git(`checkout ${name}`);
        });
    }
    currentBranch() {
        return __awaiter(this, void 0, void 0, function* () {
            let branches = yield this.git(`branch`);
            let branch = branches.split('\n').find((b) => b.charAt(0) === '*');
            return branch.slice(2, branch.length);
        });
    }
    build() {
        return __awaiter(this, void 0, void 0, function* () {
            return exec(this.buildCmd);
        });
    }
    _scratchBranchName(name) {
        return `scratch-${name}-${this.guid++}`;
    }
    git(command) {
        return __awaiter(this, void 0, void 0, function* () {
            return exec(`git ${command}`);
        });
    }
}
exports.Environment = Environment;
function exec(cmd) {
    return __awaiter(this, void 0, void 0, function* () {
        return execa_1.shell(cmd).then((result) => {
            return result.stdout;
        }, (r) => {
            // tslint:disable:no-console
            console.log(r.stdout);
            console.error(r.stderr);
            throw new Error(`failed: ${cmd}`);
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnQuanMiLCJzb3VyY2VSb290IjoiL1VzZXJzL2NoaWV0YWxhL0NvZGUvZHlmYWN0b3IvIiwic291cmNlcyI6WyJydW50aW1lL2Vudmlyb25tZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSw0Q0FBMEU7QUFDMUUsMkNBQXVDO0FBQ3ZDLGlDQUE0QztBQUM1Qyx5QkFBeUI7QUFDekIsNkJBQTZCO0FBRTdCLDhDQUEyRjtBQUUzRiwwQkFBMEIsS0FBVTtJQUNsQyxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEtBQUssQ0FBQztJQUMzQixJQUFJLEtBQVUsQ0FBQztJQUNmLElBQUksUUFBUSxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUM7Ozs7Ozs7OztHQVM3QixDQUFDLENBQUM7SUFDSCxNQUFNLENBQUM7UUFDTCxJQUFJLEVBQUUsbUJBQW1CO1FBQ3pCLE9BQU8sRUFBRTtZQUNQLE9BQU8sRUFBRTtnQkFDUCxLQUFLLENBQUMsQ0FBTTtvQkFDVixLQUFLLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDcEQsQ0FBQztnQkFDRCxJQUFJLENBQUMsQ0FBTTtvQkFDVCxJQUFJLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztvQkFDdkIsSUFBSSxHQUFHLEdBQUcsUUFBUSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7b0JBQ3JDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUNwRCxDQUFDO2FBQ0Y7WUFDRCx3QkFBd0IsQ0FBQyxDQUFNO2dCQUM3QixJQUFJLFdBQVcsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQztnQkFDckMsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDLGtCQUFrQixDQUFD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LENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN0QixPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN4QixNQUFNLElBQUksS0FBSyxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUNwQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFTVFBsdWdpbkVudmlyb25tZW50LCBwcmVwcm9jZXNzLCBwcmludCB9IGZyb20gJ0BnbGltbWVyL3N5bnRheCc7XG5pbXBvcnQgeyB0cmFuc2Zvcm0gfSBmcm9tICdiYWJlbC1jb3JlJztcbmltcG9ydCB7IEV4ZWNhUmV0dXJucywgc2hlbGwgfSBmcm9tICdleGVjYSc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgTmF2aWdhdGlvbk9wdGlvbnMgfSBmcm9tICdwdXBwZXRlZXInO1xuaW1wb3J0IHsgQWJzdHJhY3RIeWJyaWRQbHVnaW4sIE1ldGEsIFBsdWdpbkNvbnN0cnVjdG9yLCBQbHVnaW5zIH0gZnJvbSAnLi4vcGx1Z2lucy9wbHVnaW4nO1xuXG5mdW5jdGlvbiBpbnN0cnVtZW50Q3JlYXRlKGJhYmVsOiBhbnkpIHtcbiAgY29uc3QgeyB0eXBlczogdCB9ID0gYmFiZWw7XG4gIGxldCBpZGVudDogYW55O1xuICBsZXQgdGVtcGxhdGUgPSBiYWJlbC50ZW1wbGF0ZShgXG4gICAgSURFTlQucmVvcGVuQ2xhc3Moe1xuICAgICAgY3JlYXRlKGluamVjdGlvbnMpIHtcbiAgICAgICAgbGV0IGluc3RhbmNlID0gdGhpcy5fc3VwZXIoaW5qZWN0aW9ucyk7XG4gICAgICAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHsgW2luc3RhbmNlLl9kZWJ1Z0NvbnRhaW5lcktleVxuICAgICAgICBdOiBPYmplY3Qua2V5cyhpbmplY3Rpb25zLmF0dHJzKSB9KSk7XG4gICAgICAgIHJldHVybiBpbnN0YW5jZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgYCk7XG4gIHJldHVybiB7XG4gICAgbmFtZTogJ2luc3RydW1lbnQtY3JlYXRlJyxcbiAgICB2aXNpdG9yOiB7XG4gICAgICBQcm9ncmFtOiB7XG4gICAgICAgIGVudGVyKHA6IGFueSkge1xuICAgICAgICAgIGlkZW50ID0gcC5zY29wZS5nZW5lcmF0ZVVpZElkZW50aWZpZXIoJ3JlZmFjdG9yJyk7XG4gICAgICAgIH0sXG4gICAgICAgIGV4aXQocDogYW55KSB7XG4gICAgICAgICAgbGV0IGJvZHkgPSBwLm5vZGUuYm9keTtcbiAgICAgICAgICBsZXQgYXN0ID0gdGVtcGxhdGUoeyBJREVOVDogaWRlbnQgfSk7XG4gICAgICAgICAgYm9keS5wdXNoKGFzdCwgdC5leHBvcnREZWZhdWx0RGVjbGFyYXRpb24oaWRlbnQpKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIEV4cG9ydERlZmF1bHREZWNsYXJhdGlvbihwOiBhbnkpIHtcbiAgICAgICAgbGV0IGRlY2xhcmF0aW9uID0gcC5ub2RlLmRlY2xhcmF0aW9uO1xuICAgICAgICBsZXQgZGVjbGFyYXRvciA9IHQudmFyaWFibGVEZWNsYXJhdG9yKGlkZW50LCBkZWNsYXJhdGlvbik7XG4gICAgICAgIGxldCB2YXJEZWNsID0gdC52YXJpYWJsZURlY2xhcmF0aW9uKCdjb25zdCcsIFtkZWNsYXJhdG9yXSk7XG4gICAgICAgIHAucmVwbGFjZVdpdGgodmFyRGVjbCk7XG4gICAgICB9XG4gICAgfVxuICB9O1xufVxuXG5mdW5jdGlvbiB0b0FyZ3MoYXJnczogYW55KSB7XG4gIHJldHVybiAoeyBzeW50YXggfTogQVNUUGx1Z2luRW52aXJvbm1lbnQpID0+IHtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogJ3RvLUBhcmdzJyxcbiAgICAgIHZpc2l0b3I6IHtcbiAgICAgICAgTXVzdGFjaGVTdGF0ZW1lbnQobm9kZTogYW55KSB7XG4gICAgICAgICAgaWYgKGFyZ3MuaW5jbHVkZXMobm9kZS5wYXRoLnBhcnRzLmpvaW4oJy4nKSkpIHtcbiAgICAgICAgICAgIG5vZGUucGF0aCA9ICBzeW50YXguYnVpbGRlcnMucGF0aChgQCR7bm9kZS5wYXRoLnBhcnRzLmpvaW4oJy4nKX1gLCBub2RlLnBhdGgubG9jKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICB9O1xufVxuXG5jbGFzcyBEaXNhbWJpZ3VhdGUgZXh0ZW5kcyBBYnN0cmFjdEh5YnJpZFBsdWdpbiB7XG4gIHByZXBhcmUoKSB7XG4gICAgbGV0IGNvbXBpbGVyID0gdGhpcy5lbnYuZ2V0Q29tcGlsZXIoJ2pzJyk7XG4gICAgcmV0dXJuIHRoaXMuaW5wdXRzLmZpbHRlcihpbnB1dCA9PiB7XG4gICAgICBsZXQgZXh0ID0gcGF0aC5leHRuYW1lKGlucHV0KTtcbiAgICAgIHJldHVybiBpbnB1dC5jaGFyQXQoaW5wdXQubGVuZ3RoIC0gMSkgIT09ICcvJyAmJlxuICAgICAgICAgICAgIGlucHV0LmluY2x1ZGVzKCdjb21wb25lbnRzLycpICYmXG4gICAgICAgICAgICAgZXh0ID09PSAnLmpzJztcbiAgICB9KS5mb3JFYWNoKGlucHV0ID0+IHtcbiAgICAgIGxldCBjb2RlID0gZnMucmVhZEZpbGVTeW5jKGlucHV0LCAndXRmOCcpO1xuICAgICAgbGV0IGNvbnRlbnQgPSBjb21waWxlcihjb2RlLCB7XG4gICAgICAgIHBsdWdpbnM6IFtpbnN0cnVtZW50Q3JlYXRlXVxuICAgICAgfSk7XG5cbiAgICAgIGZzLndyaXRlRmlsZVN5bmMoaW5wdXQsIGNvbnRlbnQuY29kZSk7XG4gICAgfSk7XG4gIH1cblxuICBhcHBseU1ldGEobWV0YTogTWV0YSkge1xuICAgIG1ldGEuZGF0YS5mb3JFYWNoKChkOiBzdHJpbmcpID0+IHtcbiAgICAgIGxldCBjb21wb25lbnRzID0gSlNPTi5wYXJzZShkKTtcbiAgICAgIE9iamVjdC5rZXlzKGNvbXBvbmVudHMpLmZvckVhY2goY29tcG9uZW50ID0+IHtcbiAgICAgICAgbGV0IHAgPSB0aGlzLnRlbXBsYXRlRm9yKGNvbXBvbmVudCk7XG4gICAgICAgIGxldCB0ZW1wbGF0ZSA9IGZzLnJlYWRGaWxlU3luYyhwISwgJ3V0ZjgnKTtcbiAgICAgICAgbGV0IGFzdCA9IHByZXByb2Nlc3ModGVtcGxhdGUsIHtcbiAgICAgICAgICBwbHVnaW5zOiB7XG4gICAgICAgICAgICBhc3Q6IFt0b0FyZ3MoY29tcG9uZW50c1tjb21wb25lbnRdKV1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBmcy53cml0ZUZpbGVTeW5jKHAhLCBwcmludChhc3QpKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSB0ZW1wbGF0ZUZvcihmdWxsTmFtZTogc3RyaW5nKSB7XG4gICAgbGV0IFssIG5hbWVdID0gZnVsbE5hbWUuc3BsaXQoJzonKTtcbiAgICByZXR1cm4gdGhpcy5pbnB1dHMuZmluZChpbnB1dCA9PiBpbnB1dC5pbmNsdWRlcyhgdGVtcGxhdGVzL2NvbXBvbmVudHMvJHtuYW1lfWApKTtcbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbmZpZyB7XG4gIG5hdmlnYXRpb24/OiBOYXZpZ2F0aW9uO1xuICBidWlsZD86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBOYXZpZ2F0aW9uIHtcbiAgdXJsczogc3RyaW5nW107XG4gIG9wdGlvbnM/OiBOYXZpZ2F0aW9uT3B0aW9ucztcbn1cblxuZXhwb3J0IGNsYXNzIEVudmlyb25tZW50IHtcbiAgbmF2aWdhdGlvbj86IE5hdmlnYXRpb247XG4gIHByaXZhdGUgX3BsdWdpbnM6IE1hcDxzdHJpbmcsIE1hcDxzdHJpbmcsIFBsdWdpbkNvbnN0cnVjdG9yPFBsdWdpbnM+Pj4gPSBuZXcgTWFwKCk7XG4gIHByaXZhdGUgYnVpbGRDbWQgPSAneWFybiBzdGFydCc7XG4gIHByaXZhdGUgZ3VpZCA9IDA7XG4gIHByaXZhdGUgX2N1cnJlbnRTY3JhdGNoQnJhbmNoID0gJyc7XG5cbiAgY29uc3RydWN0b3IoY29uZmlnOiBDb25maWcpIHtcbiAgICBpZiAoY29uZmlnLm5hdmlnYXRpb24pIHtcbiAgICAgIHRoaXMubmF2aWdhdGlvbiA9IGNvbmZpZy5uYXZpZ2F0aW9uO1xuICAgIH1cblxuICAgIGlmIChjb25maWcuYnVpbGQpIHtcbiAgICAgIHRoaXMuYnVpbGRDbWQgPSBjb25maWcuYnVpbGQ7XG4gICAgfVxuXG4gICAgdGhpcy5sb2FkUGx1Z2lucygpO1xuICB9XG5cbiAgZ2V0Q29tcGlsZXIoX25hbWU6IHN0cmluZykge1xuICAgIHJldHVybiB0cmFuc2Zvcm07XG4gIH1cblxuICBnZXQgdHlwZXMoKSB7XG4gICAgbGV0IGtleXMgPSB0aGlzLl9wbHVnaW5zLmtleXMoKTtcbiAgICBsZXQgdHlwZXM6IHN0cmluZ1tdID0gW107XG4gICAgZm9yIChsZXQga2V5IG9mIGtleXMpIHtcbiAgICAgIHR5cGVzLnB1c2goa2V5KTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHlwZXM7XG4gIH1cblxuICBnZXQgcGx1Z2lucygpIHtcbiAgICByZXR1cm4gWy4uLnRoaXMudHlwZXMubWFwKHR5cGUgPT4ge1xuICAgICAgbGV0IHBsdWdpbnMgPSB0aGlzLl9wbHVnaW5zLmdldCh0eXBlKSEua2V5cygpO1xuXG4gICAgICBmb3IgKGxldCBwbHVnaW4gb2YgcGx1Z2lucykge1xuICAgICAgICBsZXQgeyBjYXBhYmlsaXRpZXMgfSA9IHRoaXMuX3BsdWdpbnMuZ2V0KHR5cGUpIS5nZXQocGx1Z2luKSE7XG4gICAgICAgIGlmIChjYXBhYmlsaXRpZXMucnVudGltZSkge1xuICAgICAgICAgIHJldHVybiB7IG5hbWU6IHBsdWdpbiwgbW9kZXM6IFsnZGF0YScsICdoYXZvYyddIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIHsgbmFtZTogcGx1Z2luLCBtb2RlczogWydhbmFseXplJ10gfTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9KV07XG4gIH1cblxuICBsb2FkUGx1Z2lucygpIHtcbiAgICBsZXQgdGVtcGxhdGVQbHVnaW5zOiBNYXA8c3RyaW5nLCBQbHVnaW5Db25zdHJ1Y3RvcjxQbHVnaW5zPj4gPSBuZXcgTWFwKCk7XG4gICAgdGVtcGxhdGVQbHVnaW5zLnNldCgnZGlzYW1iaWd1YXRlJywgRGlzYW1iaWd1YXRlKTtcbiAgICB0aGlzLl9wbHVnaW5zLnNldCgndGVtcGxhdGUnLCB0ZW1wbGF0ZVBsdWdpbnMpO1xuICB9XG5cbiAgbG9va3VwUGx1Z2luKHR5cGU6IHN0cmluZywgcGx1Z2luOiBzdHJpbmcpIHtcbiAgICBsZXQgdHlwZXMgPSB0aGlzLl9wbHVnaW5zLmdldCh0eXBlKTtcblxuICAgIGlmICghdHlwZXMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gdHlwZSBcIiR7dHlwZX1cIiBmb3VuZC5gKTtcbiAgICB9XG5cbiAgICBsZXQgcGx1Z2luQ29uc3RydWN0b3IgPSB0eXBlcy5nZXQocGx1Z2luKTtcblxuICAgIGlmICghcGx1Z2luQ29uc3RydWN0b3IpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gcGx1Z2luIGNhbGxlZCBcIiR7cGx1Z2lufVwiIHdhcyBmb3VuZC5gKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcGx1Z2luQ29uc3RydWN0b3I7XG4gIH1cblxuICBhc3luYyBzY3JhdGNoQnJhbmNoKG5hbWU6IHN0cmluZykge1xuICAgIGxldCBzY3JhdGNoTmFtZSA9IHRoaXMuX2N1cnJlbnRTY3JhdGNoQnJhbmNoID0gdGhpcy5fc2NyYXRjaEJyYW5jaE5hbWUobmFtZSk7XG4gICAgcmV0dXJuIHRoaXMuZ2l0KGBjaGVja291dCAtYiAke3NjcmF0Y2hOYW1lfWApO1xuICB9XG5cbiAgZ2V0IHNjcmF0Y2hCcmFuY2hOYW1lKCkge1xuICAgIHJldHVybiB0aGlzLl9jdXJyZW50U2NyYXRjaEJyYW5jaDtcbiAgfVxuXG4gIGFzeW5jIGNvbW1pdCgpIHtcbiAgICBhd2FpdCB0aGlzLmdpdCgnYWRkIC4nKTtcbiAgICByZXR1cm4gdGhpcy5naXQoYGNvbW1pdCAtbSBcImRvbmVcImApO1xuICB9XG5cbiAgYXN5bmMgZGVsZXRlU2NyYXRjaEJyYW5jaCgpIHtcbiAgICByZXR1cm4gYXdhaXQgdGhpcy5naXQoYGJyYW5jaCAtRCAke3RoaXMuX2N1cnJlbnRTY3JhdGNoQnJhbmNofWApO1xuICB9XG5cbiAgYXN5bmMgY2hlY2tvdXRCcmFuY2gobmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2l0KGBjaGVja291dCAke25hbWV9YCk7XG4gIH1cblxuICBhc3luYyBjdXJyZW50QnJhbmNoKCkge1xuICAgIGxldCBicmFuY2hlcyA9IGF3YWl0IHRoaXMuZ2l0KGBicmFuY2hgKTtcbiAgICBsZXQgYnJhbmNoID0gYnJhbmNoZXMuc3BsaXQoJ1xcbicpLmZpbmQoKGI6IHN0cmluZykgPT4gYi5jaGFyQXQoMCkgPT09ICcqJykhO1xuICAgIHJldHVybiBicmFuY2guc2xpY2UoMiwgYnJhbmNoLmxlbmd0aCk7XG4gIH1cblxuICBhc3luYyBidWlsZCgpIHtcbiAgICByZXR1cm4gZXhlYyh0aGlzLmJ1aWxkQ21kKTtcbiAgfVxuXG4gIHByaXZhdGUgX3NjcmF0Y2hCcmFuY2hOYW1lKG5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBgc2NyYXRjaC0ke25hbWV9LSR7dGhpcy5ndWlkKyt9YDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZ2l0KGNvbW1hbmQ6IHN0cmluZykge1xuICAgIHJldHVybiBleGVjKGBnaXQgJHtjb21tYW5kfWApO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGV4ZWMoY21kOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHNoZWxsKGNtZCkudGhlbigocmVzdWx0OiBFeGVjYVJldHVybnMpID0+IHtcbiAgICByZXR1cm4gcmVzdWx0LnN0ZG91dDtcbiAgfSwgKHI6IEV4ZWNhUmV0dXJucykgPT4ge1xuICAgIC8vIHRzbGludDpkaXNhYmxlOm5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhyLnN0ZG91dCk7XG4gICAgY29uc29sZS5lcnJvcihyLnN0ZGVycik7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBmYWlsZWQ6ICR7Y21kfWApO1xuICB9KTtcbn1cbiJdfQ==