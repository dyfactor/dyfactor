import { Environment } from './environment';
import { DynamicMode, StaticMode, modeFactory } from './mode';

export class Runner {
  constructor(private env: Environment) {}

  async run(type: string, name: string, path: string = 'app', level: string) {
    let { env } = this;
    let Plugin = env.lookupPlugin(type, name);
    let { capabilities } = Plugin;
    let plugin = new Plugin(path, env);
    let mode = modeFactory(capabilities, level, env, plugin);
    if (isDynamic(mode)) {
      try {
        await mode.instrument();
      } catch (e) {
        console.log('\n');
        console.log(e);
        process.exit(1);
      }

      let telemetry;

      try {
        telemetry = await mode.run();
        mode.modify(telemetry);
      } catch (e) {
        console.log(e);
        process.exit(1);
      }
    } else {
      mode.modify();
    }
  }
}

function isDynamic(mode: StaticMode | DynamicMode): mode is DynamicMode {
  return !!(<DynamicMode>mode).run && !!(<DynamicMode>mode).instrument;
}
