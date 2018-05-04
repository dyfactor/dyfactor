import * as fs from 'fs';
import { prompt } from 'inquirer';
import * as ora from 'ora';
import { launch } from 'puppeteer';
import { DynamicPlugin, Meta, Plugins, StaticPlugin } from '../plugins/plugin';
import { Environment } from './environment';

export const enum Modes {
  analyze,
  data,
  safe,
  havoc
}

export function modeFactory(mode: number, env: Environment, plugin: Plugins) {
  switch (mode) {
    case Modes.analyze:
      return new AnalyzeMode(env, plugin as StaticPlugin);
    case Modes.data:
      return new DataMode(env, plugin as DynamicPlugin);
    case Modes.havoc:
      return new HavocMode(env, plugin as DynamicPlugin);
  }

  throw new Error(`Mode not found`);
}

export interface ModeConstructor<T> {
  new (env: Environment, plugin: T): BaseMode<T>;
}

export interface Mode {
  analyze(): void;
  apply(meta: Meta): void;
  prepare(): Promise<void>;
  run(): Promise<Meta>;
}

export class BaseMode<T> implements Mode {
  constructor(protected env: Environment, protected plugin: T) {}
  analyze(): void { return; }
  apply(_meta: Meta): void { return; }
  prepare(): Promise<void> {
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
  async prepare(): Promise<void> {
    let { env } = this;
    let spinner = this.spinner = ora('Applying instrumentation ...').start();

    this.workingBranch = await env.currentBranch();

    await env.scratchBranch('refactor');

    this.plugin.prepare();

    this.spinner = spinner.succeed('Applied instrumentation');
  }

  async run(): Promise<Meta> {
    let { spinner, env } = this;
    spinner.start('Starting build ...');

    await env.build();

    spinner = spinner.succeed('Build complete');

    await prompt([{
      type: 'confirm',
      name: 'confirmed',
      message: 'Please start your dev server. When your server is up please continue.'
    }]);

    spinner = spinner.succeed(`Server is running`);

    let browser = await launch({ headless: false, slowMo: 250 });
    let page = await browser.newPage();

    let meta: Meta = { data: [] };
    page.on('console', msg => {
      let json = msg.text();
      if (!json.includes('DEBUG:')) {
        meta.data.push(json);
      }
    });

    let navigationOptions = env.navigation!.options ? env.navigation!.options : {};

    for (let url of env.navigation!.urls) {
      spinner.start(`Visiting ${url} ...`);
      await page.goto(url, navigationOptions);
      spinner = spinner.succeed(`Visited ${url}`);
    }

    await browser.close();

    await env.commit();
    await env.checkoutBranch(this.workingBranch);
    await env.deleteScratchBranch();

    return meta;
  }

  apply(meta: Meta): void {
    fs.writeFileSync('dyfactor-metadata.json', JSON.stringify(meta));
  }
}

export class HavocMode extends DataMode {
  apply(meta: Meta): void {
    this.plugin.applyMeta(meta);
  }
}
