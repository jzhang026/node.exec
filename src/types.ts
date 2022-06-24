import { Writable, Readable } from 'stream';
import { Reader, Writer } from './io';
export const NOT_STARTED_ERROR = 'process not started';
export type Signal = NodeJS.Signals | number;
export type SignalMode = 'standard' | 'group';
export interface Pipes<In = Writer | null, Out = Reader | null, Err = Reader | null> {
  readonly stdin: In; // valid if Cmd.stdin=="pipe"
  readonly stdout: Out; // valid if Cmd.stdout=="pipe"
  readonly stderr: Err; // valid if Cmd.stderr=="pipe"
  readonly extraFiles: (Reader | Writer | null)[]; // where extraFiles[N]=="pipe"
}

export interface CmdOptions {
  dir?: string; // working directory. If empty, uses current working directory
  env?: { [name: string]: string | undefined }; // process environment
  shell?: boolean | string; // run command in the system-default shell
  stdin?: Readable | 'inherit' | 'pipe' | Buffer | Reader | null; // fd 0
  stdout?: Writable | 'inherit' | 'pipe' | null; // fd 1
  stderr?: Writable | 'inherit' | 'pipe' | null; // fd 2
  extraFiles?: (Readable | 'pipe' | null)[]; // fd 3...
  windowsHide?: boolean;
}
