import chalk from 'chalk';
import * as SilentError from 'silent-error';

export default function error(msg: string) {
  let err = new Error(msg);
  if (err.stack) {
    err.stack = err.stack!.replace('Error:', chalk.red('Error:'));
  }
  throw new SilentError(err);
}
