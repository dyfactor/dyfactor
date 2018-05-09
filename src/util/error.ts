import chalk from 'chalk';
import * as SilentError from 'silent-error';

export default function error(msg: string) {
  throw new SilentError(`${chalk.redBright('Error:')} ${msg}`);
}

export type Sucess<T> = [null, T];
export type Failure = [Error, null];

export async function to<T>(promise: Promise<T>): Promise<T> {
  let result: T;
  try {
    result = await promise;
    return result;
  } catch (e) {
    throw error(e.msg);
  }
}
