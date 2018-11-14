import chalk from 'chalk';
import * as fs from 'fs';
import { prompt } from 'inquirer';
import { launch } from 'puppeteer';
import { AbstractDynamicPlugin, AbstractStaticPlugin, Capabilities, DynamicPlugin, PluginType, StaticPlugin } from '../plugins/plugin';
import { Telemetry } from '../plugins/telemetry';
import error from '../util/error';
import { Environment } from './environment';

export enum Levels {
  modify,
  extract,
  wizard
}

function toLevel(level: string) {
  switch (level) {
    case 'extract':
      return Levels.extract;
    case 'modify':
      return Levels.modify;
    case 'wizard':
      return Levels.wizard;
  }

  return error(`Level "${level} is not a supported level.`);
}

export function modeFactory(
  capabilities: Capabilities,
  level: string,
  env: Environment,
  plugin: PluginType
): StaticMode | DynamicMode {
  if (!capabilities.runtime) {
    return new StaticModeImpl(env, plugin as StaticPlugin);
  }

  let convertedLevel = toLevel(level);

  switch (convertedLevel) {
    case Levels.extract:
      return new ExtractModeImpl(env, plugin as DynamicPlugin);
    case Levels.modify:
      return new ModifyModeImpl(env, plugin as DynamicPlugin);
  }

  throw Error('Could not resolve mode');
}

export interface StaticMode {
  modify(): void;
}

export interface DynamicMode {
  instrument(): Promise<void>;
  run(): Promise<Telemetry>;
  modify(telemetry: Telemetry): void;
}

export class StaticModeImpl implements StaticMode {
  constructor(protected env: Environment, protected plugin: AbstractStaticPlugin) {}
  modify(): void {
    this.plugin.modify();
    success('applied codemod');
  }
}

export class ExtractModeImpl implements DynamicMode {
  constructor(protected env: Environment, protected plugin: AbstractDynamicPlugin) {}
  private workingBranch: string = '';
  async instrument(): Promise<void> {
    await prompt([
      {
        type: 'continue',
        name: 'server',
        message: 'Start your dev server and press enter to continue...',
        default: 'Continue'
      }
    ]);

    let { env } = this;

    let branch = await env.currentBranch();

    this.workingBranch = branch;

    await env.scratchBranch('refactor');

    printStep(1, 3, '⚙️  Instrumenting application...');
    this.plugin.instrument();

    await prompt([
      {
        type: 'continue',
        name: 'server',
        message: 'Press enter when your dev server is reset...',
        default: 'Continue'
      }
    ]);
  }

  async run(): Promise<Telemetry> {
    let { env } = this;

    printStep(2, 3, '🛰️  Collecting telemetry data...');
    let browser = await launch({ headless: false, ignoreHTTPSErrors: true,  slowMo: 250 });
    let page = await browser.newPage();

    let telemetry: Telemetry = { data: [] };

    let navigationOptions = env.navigation!.options ? env.navigation!.options : {};
    for (let currentPage of env.navigation!.pages) {
      let { url, waitFor } = currentPage;
      console.log(dim(`Visiting ${url}...`));

      await page.goto(url, navigationOptions);
      await page.waitFor(waitFor || 2000);
      let result = await page.evaluateHandle(() => (window as any).__dyfactor_telemetry);
      let data = await result.jsonValue();
      telemetry.data.push(data);
      await result.dispose();
    }

    await browser.close();

    await env.commit();
    await env.checkoutBranch(this.workingBranch);
    await env.deleteScratchBranch();

    return telemetry;
  }

  modify(telemetry: Telemetry): void {
    printStep(3, 3, '✍️ Writing telementry data to `./dyfactor-telemetry.json...`');
    fs.writeFileSync('dyfactor-telemetry.json', JSON.stringify(telemetry));
    success('collected telementry');
  }
}

export class ModifyModeImpl extends ExtractModeImpl {
  modify(telemetry: Telemetry): void {
    printStep(3, 3, '😎 Modifying application with telemetry data...');
    this.plugin.modify(telemetry);
    success('updated application');
  }
}

function dim(str: string) {
  return chalk.dim(str);
}

function printStep(step: number, total: number, message: string) {
  console.log(`${dim(`[${step}/${total}]`)} ${message}`);
}

function success(message: string) {
  console.log(`${chalk.green(`Success:`)} ${message}`);
}
