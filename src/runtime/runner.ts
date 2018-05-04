import { Environment } from './environment';
import { modeFactory } from './mode';

export class Runner {
  constructor(private env: Environment) {}

  async run(type: string, name: string, path: string = 'app', level = 3) {
    let { env } = this;
    env.loadPlugins();
    let Plugin = env.lookupPlugin(type, name);
    let { capabilities } = Plugin;
    let plugin = new Plugin(path, env);
    let mode = modeFactory(level, env, plugin);

    if (capabilities.runtime) {
      await mode.prepare();
      let meta = await mode.run();
      mode.apply(meta);
    } else {
      mode.analyze();
    }
  }
}
