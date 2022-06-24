import { Cmd } from './command';
import { Reader, Writer } from './io';
import { CmdOptions, Pipes } from './types';

// `startCmd` launches an external command process.
// It's a convenience function around c=new Cmd();c.start() with strengthened TypeScript types.

/**
 * Form 1/2a: When no stdio options are provided, no pipes are returned
 */
export function startCmd(command: string, args?: string[]): [Cmd];
export function startCmd(
  command: string,
  args: string[],
  options: CmdOptions & {
    stdin?: never;
    stdout?: never;
    stderr?: never;
    extraFiles?: never;
  },
): [Cmd];
/**
 * Form 1/2b: no args are provided
 */
export function startCmd(
  command: string,
  options: CmdOptions & {
    stdin?: never;
    stdout?: never;
    stderr?: never;
    extraFiles?: never;
  },
): [Cmd];

/**
 * Form 2/2a: When stdio options are provided, the pipe ends and cmd are returned as a tuple:
 */
export function startCmd<
  // at least one stdio input is defined
  Options extends CmdOptions &
    (
      | { stdin: CmdOptions['stdin'] }
      | { stdout: CmdOptions['stdout'] }
      | { stderr: CmdOptions['stderr'] }
      | { extraFiles: CmdOptions['extraFiles'] }
    ),
  I = Options extends { stdin: 'pipe' } ? Writer : null,
  O = Options extends { stdout: 'pipe' } ? Reader : null,
  E = Options extends { stderr: 'pipe' } ? Reader : null,
>(command: string, args: string[], options: Options): [Cmd, Pipes<I, O, E>];

/**
 * Form 2/2b: no args
 */
export function startCmd<
  // at least one stdio input is defined
  Options extends CmdOptions &
    (
      | { stdin: CmdOptions['stdin'] }
      | { stdout: CmdOptions['stdout'] }
      | { stderr: CmdOptions['stderr'] }
      | { extraFiles: CmdOptions['extraFiles'] }
    ),
  I = Options extends { stdin: 'pipe' } ? Writer : null,
  O = Options extends { stdout: 'pipe' } ? Reader : null,
  E = Options extends { stderr: 'pipe' } ? Reader : null,
>(command: string, options: Options): [Cmd, Pipes<I, O, E>];

export function startCmd(command: string, args?: string[] | CmdOptions, options?: CmdOptions) {
  if (!args || !Array.isArray(args)) {
    if (args && typeof args == 'object') {
      options = args as CmdOptions;
    }
    args = [];
  }
  if (!options) {
    options = {};
  }
  const cmd = new Cmd(command, ...args);
  for (const k in options) {
    (cmd as any)[k] = (options as any)[k];
  }
  const cmdio = cmd.start();
  if ('stdin' in options || 'stdout' in options || 'stderr' in options || 'extraFiles' in options) {
    return [cmd, cmdio];
  }
  return cmd;
}
