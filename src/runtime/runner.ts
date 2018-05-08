import { Environment } from './environment';
import { modeFactory } from './mode';

export class Runner {
  constructor(private env: Environment) {}

  async run(type: string, name: string, path: string = 'app', level: string) {
    let { env } = this;
    let Plugin = env.lookupPlugin(type, name);
    let { capabilities } = Plugin;
    let plugin = new Plugin(path, env);
    let mode = modeFactory(level, env, plugin)!;

    if (capabilities.runtime) {
      await mode.instrument();
      let meta = await mode.run();
      mode.modify(meta);
    } else {
      mode.analyze();
    }
  }
}
