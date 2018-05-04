abstract class CallWrapper<T> {
  abstract wrap(node: T): T;
}
// refactorings
//   template
///    disambiguate
//       transforms
//       index.js
//   javascript
//     es-classes.js
// plugins
//   ast
//     template
//       glimmer.js
//   runtime
//     template
//       glimmer.js
//
// refactor template disambiguate ./app/templates/

/*
  - Instrument
  - Collect
  - Static Analysis

  interface Meta {
    data: any;
  }

  interface HybridPlugin {
    prepare(path: string): File;
    analyze(metadata: Meta): File;
  }

  interface ASTPlugin {
    analyze(): File;
  }

  interface File {
    path: string;
    ext: string;
    constructor(path: string, ast: any);
    set instrumented(ast: any);
    get ast(): any;
    materialize(): string;
  }

  // Instrument creates draft branch
  // Runs plugins
  // Launches pupeteer
  // discardges branch and goes to working branch
  // calls analize hook

  function disambiguate(env: Env) {
    let GlimmerPlugin = env.getRuntimePlugin('template', 'glimmer');
    let parser = new GlimmerParser();

    return requiresSideEffects(new class Disambiguate extends GlimmerPlugin {
      instrument(path: string) {
        let content = fs.readFileSync(path, 'utf8');
        let componentPair = resolvePairFromPath(path);

        if (componentPair.component) {
          let js = fs.readFileSync(componentPair.component, 'utf8');
          let wrapped = transform(js, {
            filename: componentPair.component,
            babelrc: false,
            plugins: [captureArgs]
          }).code;
          fs.writeFileSync(componentPair.component, wrapped);
        }

        return env.createFile(path, parser.parse(content));
      }

      analyze(meta) {
        let { data } = meta;
        let Object.keys(data).forEach(fullName => {
          let { template } = resolvePairFromFullName(fullName);
          let { ast, path } = env.getFile(template);
          let transformed = glimmerTransformAst(ast, {
            plugins: [
              toAtNames(data[fullName].args),
              toThisNames(data[fullName].locals),
            ]
          });

          fs.writeFileSynce(path, transformed);
        });
      }
    })
  }

*/
