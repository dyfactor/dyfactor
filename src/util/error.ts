import chalk from 'chalk';
import * as SilentError from 'silent-error';

export default function error(msg: string) {
  throw new SilentError(`${chalk.redBright('Error:')} ${msg}`);
}
