import * as fs from 'fs';
import { prompt } from 'inquirer';
import * as ora from 'ora';
import { launch } from 'puppeteer';
import { DynamicPlugin, Meta, PluginType, StaticPlugin } from '../plugins/plugin';
import error from '../util/error';
import { Environment } from './environment';

export enum Levels {
  analyze,
  'export-data',
  safe,
  modify
}

function toLevel(level: string) {
  switch (level) {
    case 'analyze':
      return Levels.analyze;
    case 'export-data':
      return Levels['export-data'];
    case 'modify':
      return Levels.modify;
  }

  return error(`Level "${level} is not a supported level.`);
}

export function modeFactory(level: string, env: Environment, plugin: PluginType) {
  let convertedLevel = toLevel(level);

  switch (convertedLevel) {
    case Levels.analyze:
      return new AnalyzeMode(env, plugin as StaticPlugin);
    case Levels['export-data']:
      return new DataMode(env, plugin as DynamicPlugin);
    case Levels.modify:
      return new ModifyMode(env, plugin as DynamicPlugin);
  }

  return null;
}

export interface ModeConstructor<T> {
  new (env: Environment, plugin: T): BaseMode<T>;
}

export interface Mode {
  analyze(): void;
  modify(meta: Meta): void;
  instrument(): Promise<void>;
  run(): Promise<Meta>;
}

export class BaseMode<T> implements Mode {
  constructor(protected env: Environment, protected plugin: T) {}
  analyze(): void {
    return;
  }
  modify(_meta: Meta): void {
    return;
  }
  instrument(): Promise<void> {
    return Promise.resolve();
  }
  run(): Promise<Meta> {
    return Promise.resolve({ data: [] });
  }
}

export class AnalyzeMode extends BaseMode<StaticPlugin> {
  analyze(): void {
    let spinner = ora('Appling CodeMods ...').start();
    this.plugin.analyze();
    spinner.succeed('Applied CodeMods');
  }
}

export class DataMode extends BaseMode<DynamicPlugin> {
  private workingBranch: string = '';
  private spinner: any;
  async instrument(): Promise<void> {
    let { env } = this;
    let spinner = (this.spinner = ora('Applying instrumentation ...').start());

    this.workingBranch = await env.currentBranch();

    await env.scratchBranch('refactor');

    this.plugin.instrument();

    this.spinner = spinner.succeed('Applied instrumentation');
  }

  async run(): Promise<Meta> {
    let { spinner, env } = this;
    spinner.start('Starting build ...');

    await env.build();

    spinner = spinner.succeed('Build complete');

    await prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: 'Please start your dev server. When your server is up please continue.'
      }
    ]);

    spinner = spinner.succeed(`Server is running`);

    let browser = await launch({ headless: false, slowMo: 250 });
    let page = await browser.newPage();

    let meta: Meta = { data: [] };

    let navigationOptions = env.navigation!.options ? env.navigation!.options : {};

    for (let url of env.navigation!.urls) {
      spinner.start(`Visiting ${url} ...`);
      await page.goto(url, navigationOptions);
      await page.waitFor(2000);
      let result = await page.evaluateHandle(() => (window as any).__dyfactor);
      let data = await result.jsonValue();
      meta.data.push(data);
      await result.dispose();
      spinner = spinner.succeed(`Visited ${url}`);
    }

    await browser.close();

    await env.commit();
    await env.checkoutBranch(this.workingBranch);
    await env.deleteScratchBranch();

    return meta;
  }

  modify(meta: Meta): void {
    fs.writeFileSync('dyfactor-metadata.json', JSON.stringify(meta));
  }
}

export class ModifyMode extends DataMode {
  modify(meta: Meta): void {
    this.plugin.modify(meta);
  }
}
