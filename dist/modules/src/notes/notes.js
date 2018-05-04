"use strict";
class CallWrapper {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZXMuanMiLCJzb3VyY2VSb290IjoiL1VzZXJzL2NoaWV0YWxhL0NvZGUvZHlmYWN0b3IvIiwic291cmNlcyI6WyJub3Rlcy9ub3Rlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Q0FFQztBQUNELGVBQWU7QUFDZixhQUFhO0FBQ2IsbUJBQW1CO0FBQ25CLG1CQUFtQjtBQUNuQixpQkFBaUI7QUFDakIsZUFBZTtBQUNmLG9CQUFvQjtBQUNwQixVQUFVO0FBQ1YsUUFBUTtBQUNSLGVBQWU7QUFDZixtQkFBbUI7QUFDbkIsWUFBWTtBQUNaLGVBQWU7QUFDZixtQkFBbUI7QUFDbkIsRUFBRTtBQUNGLGtEQUFrRDtBQUVsRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztFQXlFRSIsInNvdXJjZXNDb250ZW50IjpbImFic3RyYWN0IGNsYXNzIENhbGxXcmFwcGVyPFQ+IHtcbiAgYWJzdHJhY3Qgd3JhcChub2RlOiBUKTogVDtcbn1cbi8vIHJlZmFjdG9yaW5nc1xuLy8gICB0ZW1wbGF0ZVxuLy8vICAgIGRpc2FtYmlndWF0ZVxuLy8gICAgICAgdHJhbnNmb3Jtc1xuLy8gICAgICAgaW5kZXguanNcbi8vICAgamF2YXNjcmlwdFxuLy8gICAgIGVzLWNsYXNzZXMuanNcbi8vIHBsdWdpbnNcbi8vICAgYXN0XG4vLyAgICAgdGVtcGxhdGVcbi8vICAgICAgIGdsaW1tZXIuanNcbi8vICAgcnVudGltZVxuLy8gICAgIHRlbXBsYXRlXG4vLyAgICAgICBnbGltbWVyLmpzXG4vL1xuLy8gcmVmYWN0b3IgdGVtcGxhdGUgZGlzYW1iaWd1YXRlIC4vYXBwL3RlbXBsYXRlcy9cblxuLypcbiAgLSBJbnN0cnVtZW50XG4gIC0gQ29sbGVjdFxuICAtIFN0YXRpYyBBbmFseXNpc1xuXG4gIGludGVyZmFjZSBNZXRhIHtcbiAgICBkYXRhOiBhbnk7XG4gIH1cblxuICBpbnRlcmZhY2UgSHlicmlkUGx1Z2luIHtcbiAgICBwcmVwYXJlKHBhdGg6IHN0cmluZyk6IEZpbGU7XG4gICAgYW5hbHl6ZShtZXRhZGF0YTogTWV0YSk6IEZpbGU7XG4gIH1cblxuICBpbnRlcmZhY2UgQVNUUGx1Z2luIHtcbiAgICBhbmFseXplKCk6IEZpbGU7XG4gIH1cblxuICBpbnRlcmZhY2UgRmlsZSB7XG4gICAgcGF0aDogc3RyaW5nO1xuICAgIGV4dDogc3RyaW5nO1xuICAgIGNvbnN0cnVjdG9yKHBhdGg6IHN0cmluZywgYXN0OiBhbnkpO1xuICAgIHNldCBpbnN0cnVtZW50ZWQoYXN0OiBhbnkpO1xuICAgIGdldCBhc3QoKTogYW55O1xuICAgIG1hdGVyaWFsaXplKCk6IHN0cmluZztcbiAgfVxuXG4gIC8vIEluc3RydW1lbnQgY3JlYXRlcyBkcmFmdCBicmFuY2hcbiAgLy8gUnVucyBwbHVnaW5zXG4gIC8vIExhdW5jaGVzIHB1cGV0ZWVyXG4gIC8vIGRpc2NhcmRnZXMgYnJhbmNoIGFuZCBnb2VzIHRvIHdvcmtpbmcgYnJhbmNoXG4gIC8vIGNhbGxzIGFuYWxpemUgaG9va1xuXG4gIGZ1bmN0aW9uIGRpc2FtYmlndWF0ZShlbnY6IEVudikge1xuICAgIGxldCBHbGltbWVyUGx1Z2luID0gZW52LmdldFJ1bnRpbWVQbHVnaW4oJ3RlbXBsYXRlJywgJ2dsaW1tZXInKTtcbiAgICBsZXQgcGFyc2VyID0gbmV3IEdsaW1tZXJQYXJzZXIoKTtcblxuICAgIHJldHVybiByZXF1aXJlc1NpZGVFZmZlY3RzKG5ldyBjbGFzcyBEaXNhbWJpZ3VhdGUgZXh0ZW5kcyBHbGltbWVyUGx1Z2luIHtcbiAgICAgIGluc3RydW1lbnQocGF0aDogc3RyaW5nKSB7XG4gICAgICAgIGxldCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKHBhdGgsICd1dGY4Jyk7XG4gICAgICAgIGxldCBjb21wb25lbnRQYWlyID0gcmVzb2x2ZVBhaXJGcm9tUGF0aChwYXRoKTtcblxuICAgICAgICBpZiAoY29tcG9uZW50UGFpci5jb21wb25lbnQpIHtcbiAgICAgICAgICBsZXQganMgPSBmcy5yZWFkRmlsZVN5bmMoY29tcG9uZW50UGFpci5jb21wb25lbnQsICd1dGY4Jyk7XG4gICAgICAgICAgbGV0IHdyYXBwZWQgPSB0cmFuc2Zvcm0oanMsIHtcbiAgICAgICAgICAgIGZpbGVuYW1lOiBjb21wb25lbnRQYWlyLmNvbXBvbmVudCxcbiAgICAgICAgICAgIGJhYmVscmM6IGZhbHNlLFxuICAgICAgICAgICAgcGx1Z2luczogW2NhcHR1cmVBcmdzXVxuICAgICAgICAgIH0pLmNvZGU7XG4gICAgICAgICAgZnMud3JpdGVGaWxlU3luYyhjb21wb25lbnRQYWlyLmNvbXBvbmVudCwgd3JhcHBlZCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZW52LmNyZWF0ZUZpbGUocGF0aCwgcGFyc2VyLnBhcnNlKGNvbnRlbnQpKTtcbiAgICAgIH1cblxuICAgICAgYW5hbHl6ZShtZXRhKSB7XG4gICAgICAgIGxldCB7IGRhdGEgfSA9IG1ldGE7XG4gICAgICAgIGxldCBPYmplY3Qua2V5cyhkYXRhKS5mb3JFYWNoKGZ1bGxOYW1lID0+IHtcbiAgICAgICAgICBsZXQgeyB0ZW1wbGF0ZSB9ID0gcmVzb2x2ZVBhaXJGcm9tRnVsbE5hbWUoZnVsbE5hbWUpO1xuICAgICAgICAgIGxldCB7IGFzdCwgcGF0aCB9ID0gZW52LmdldEZpbGUodGVtcGxhdGUpO1xuICAgICAgICAgIGxldCB0cmFuc2Zvcm1lZCA9IGdsaW1tZXJUcmFuc2Zvcm1Bc3QoYXN0LCB7XG4gICAgICAgICAgICBwbHVnaW5zOiBbXG4gICAgICAgICAgICAgIHRvQXROYW1lcyhkYXRhW2Z1bGxOYW1lXS5hcmdzKSxcbiAgICAgICAgICAgICAgdG9UaGlzTmFtZXMoZGF0YVtmdWxsTmFtZV0ubG9jYWxzKSxcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGZzLndyaXRlRmlsZVN5bmNlKHBhdGgsIHRyYW5zZm9ybWVkKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4qL1xuIl19