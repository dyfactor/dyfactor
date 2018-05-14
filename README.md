![Dyfactor](./logo.png)

[![Build Status](https://travis-ci.org/dyfactor/dyfactor.svg?branch=master)](https://travis-ci.org/dyfactor/dyfactor)

Dyfactor is platform for extracting runtime information from applications to inform codemods. By combining runtime information and static analysis, applications are able migrate codebases to new APIs at a much quicker pace.

**See Dyfactor In Action**

<div style="text-align:center">
  <a style="text-align:center" href="https://www.youtube.com/watch?v=_aepVXHceKw"><img alt="Dyfactor Video" src="https://img.youtube.com/vi/_aepVXHceKw/0.jpg" /></a>
</div>

# Install

```bash
$ yarn install dyfactor --dev
```

# Usage

```bash
$ yarn dyfactor --help

  Usage: dyfactor [options] [command]

  Options:

    -h, --help    output usage information

  Commands:

    init          Initializes dyfactor in your project
    run           Runs a plugin against code
    list-plugins  Lists the available plugins
    help [cmd]    display help for [cmd]
```

# Why Dyfactor?

Tools like JSCodeShift and Babel are excellent tools for migrating code from one API to another due to the fact they rely on static analysis. However, it is completely possible for parts of an application to be relying on runtime information to determine execution. In other cases you may have custom DSLs like template laguages that don't have the same static analysis gurantees as JavaScript does. Migrating this type of code typically requires a great deal of developer intervention to sort out what is actually happen. Dyfactor's goal is to shorten this cravase of understanding.

## A Quick Example

In Ember's template layer deverlopers can invoke components with arguments. They also can look at local values on the backing class. A template for a component may look like the following.

```hbs
<h1>{{firstName}} {{lastName}}</h1>
<h2>Info</h2>
<ul>
  <li>Posts: {{postCount}}</li>
  <li>Shares: {{shareCount}}</li>
</ul>
```

While this template is declaritive its not obvious if any of the `MustacheExpressions` (curlys) where arguments to the component or if they are local values on the component class. The only way to know is to go look at the invocation of the component. In doing so we find that `firstName` and `lastName` are passed in as arguments.

```hbs
{{post-info firstName=fName lastName=lName}}
```

The Ember Core has recognized that is extremely problematic as an application grows, so they have allowed arguments to be pre-fixed with `@` and locals to be prefixed with `this.`. The issue is that migrated all the templates in a project would take too long because it requires developers to go seperate these things out.

This is where Dyfactor comes in. By writing a [Dynamic Plugin](#dynamic-plugins) we can instrument the application in such a way that allows us to know how this symbols are being resolved at runtime. From there we can use that information to go manually migrate the code or let Dyfactor attempt to do the migration for us.

# How Does It Work?

At a high level Dyfactor is a runner and plugin system. It currently supports two types of plugins: Static Plugins and Dynamic Plugins.

## Static Plugins

A Static Plugin is meant to be used to perform codemods that only require static analysis and is only single phased. These should be thought as light wrapper around a codemod you would write with jscodeshift or Babel.

### Plugin Interface

```ts
interface StaticPlugin {
  /**
   * An array containing all recursive files and directories
   * under a given directory
   **/
  inputs: string[];
  /**
   * Hook called by the runner where codemod is implimented
   */
  modify(): void;
}
```

### Example:

```js
import { StaticPlugin } from 'dyfactor';
import * as fs from 'fs';
import * as recast from 'recast';

function filesOnly(path) {
  return path.charAt(path.length - 1) !== '/';
}

export default class extends StaticPlugin {
  modify() {
    this.inputs.filter(filesOnly).forEach(input => {
      let content = fs.readFileSync(input, 'utf8');
      let ast = recast.parse(content);
      let add = ast.program.body[0];
      let { builders: b } = recast.types;

      ast.program.body[0] = b.variableDeclaration('var', [
        b.variableDeclarator(
          add.id,
          b.functionExpression(
            null, // Anonymize the function expression.
            add.params,
            add.body
          )
        )
      ]);

      add.params.push(add.params.shift());
      let output = recast.prettyPrint(ast, { tabWidth: 2 }).code;
      fs.writeFileSync(input, output);
    });
  }
}
```

## Dynamic Plugins

A Dynamic Plugin is two-phased.the first phase allows you to safely instrument an application to collect that runtime telemetry data. The instrumented application is then booted with Puppeteer to collect the data. The second phase is responsible for introspecting the runtime telemetry data and applying codemods based on that data. It's important to note that Dynamic Plugins can be run as single phased plugins just to produce the runtime telemetry and write it to disk.

### Plugin Interface

```ts
interface DynamicPlugin {
  /**
   * An array containing all recursive files and directories
   * under a given directory
   **/
  inputs: string[];
  /**
   * Hook called by the runner to instrument the application
   */
  instrument(): void;

  /**
   * Hook called by the runner to apply codemods based on the telemtry
   */
  modify(telemetry: Telemetry): void;
}

interface Telemetry {
  data: any;
}
```

### Example

```js
import { DynamicPlugin, TelemetryBuilder } from 'dyfactor';
import * as fs from 'fs';
import { preprocess, print } from '@glimmer/syntax';
import { transform } from 'babel-core';

function filesOnly(path) {
  return path.charAt(path.length - 1) !== '/';
}

function instrumentCreate(babel) {
  const { types: t } = babel;
  let ident;
  let t = new TelemetryBuilder();
  let template = babel.template(`
    IDENT.reopenClass({
      create(injections) {
        let instance = this._super(injections);
        ${t.preamble()}
        ${t.conditionallyAdd(
          'instance._debugContainerKey',
          () => {
            return `Object.keys(injections.attrs).forEach((arg) => {
            if (!${t.path('instance._debugContainerKey')}.contains(arg)) {
              ${t.path('instance._debugContainerKey')}.push(arg);
            }
          });`;
          },
          () => {
            return `${t.path('instance._debugContainerKey')} = Object.keys(injections.attrs);`;
          }
        )}
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

export default class extends DynamicPlugin {
  instrument() {
    this.inputs.filter(filesOnly).forEach(input => {
      let code = fs.readFileSync(input, 'utf8');
      let content = transform(code, {
        plugins: [instrumentCreate]
      });

      fs.writeFileSync(input, content.code);
    });
  }

  modify(telemetry) {
    telemetry.data.forEach(components => {
      Object.keys(components).forEach(component => {
        let templatePath = this.templateFor(component);
        let template = fs.readFileSync(templatePath, 'utf8');
        let ast = preprocess(template, {
          plugins: {
            ast: [toArgs(components[component])]
          }
        });
        fs.writeFileSync(templatePath, print(ast));
      });
    });
  }

  templateFor(fullName: string) {
    let [, name] = fullName.split(':');
    return this.inputs.find(input => input.includes(`templates/components/${name}`));
  }
}
```
