import chalk from 'chalk';
import * as fs from 'fs';
import { prompt } from 'inquirer';
import * as ora from 'ora';
import { launch } from 'puppeteer';
import {
  AbstractDynamicPlugin,
  AbstractStaticPlugin,
  Capabilities,
  DynamicPlugin,
  PluginType,
  StaticPlugin
} from '../plugins/plugin';
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
    let spinner = ora('Applying CodeMod ...').start();
    this.plugin.modify();
    spinner.succeed('Applied CodeMod');
  }
}

export class ExtractModeImpl implements DynamicMode {
  constructor(protected env: Environment, protected plugin: AbstractDynamicPlugin) {}
  private workingBranch: string = '';
  private spinner: any;
  async instrument(): Promise<void> {
    await prompt([
      {
        type: 'continue',
        name: 'server',
        message: 'Start your dev server and press enter to continue ...',
        default: 'Continue'
      }
    ]);

    let { env } = this;
    let spinner = (this.spinner = ora('Applying instrumentation ...').start());

    let branch = await env.currentBranch();

    this.workingBranch = branch;

    await env.scratchBranch('refactor');

    this.plugin.instrument();

    this.spinner = spinner.succeed(dim('Applied instrumentation'));
  }

  async run(): Promise<Telemetry> {
    let { spinner, env } = this;

    let browser = await launch({ headless: false, slowMo: 250 });
    let page = await browser.newPage();

    let telemetry: Telemetry = { data: [] };

    let navigationOptions = env.navigation!.options ? env.navigation!.options : {};

    for (let currentPage of env.navigation!.pages) {
      let { url, waitFor } = currentPage;
      spinner.start(`Visiting ${url} ...`);

      await page.goto(url, navigationOptions);
      await page.waitFor(waitFor || 2000);
      let result = await page.evaluateHandle(() => (window as any).__dyfactor_telemetry);
      let data = await result.jsonValue();
      console.log(data);
      telemetry.data.push(data);
      await result.dispose();
      spinner = spinner.succeed(dim(`Visited ${url}`));
    }

    await browser.close();

    await env.commit();
    await env.checkoutBranch(this.workingBranch);
    await env.deleteScratchBranch();

    return telemetry;
  }

  modify(telemetry: Telemetry): void {
    fs.writeFileSync('dyfactor-telemetry.json', JSON.stringify(telemetry));
  }
}

export class ModifyModeImpl extends ExtractModeImpl {
  modify(telemetry: Telemetry): void {
    this.plugin.modify(telemetry);
  }
}

function dim(str: string) {
  return chalk.dim(str);
}
