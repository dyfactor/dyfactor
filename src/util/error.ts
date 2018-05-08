import chalk from 'chalk';

export default function error(msg: string) {
  // tslint:disable:no-console
  console.log(`${chalk.redBright('Error:')} ${msg}`);
  process.exit(1);
}
