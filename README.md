# node.exec

This package is an adaptation of Go's simple and elegant [os/exec.Cmd](https://pkg.go.dev/os/exec) package.
It tries to provide a reliable and simple way to run sub-processes.

The API and semantics prioritize clarity and simplicity over ease.

## API

1. Create a new command structure for running a sub-process
`class Cmd(command :string, ...args :string[])` implements `CmdOptions`

2. Create & start a command. Thin wrapper around new Cmd... with strong TypeScript typings.
`function startCmd(command :string, args? :string[], options? :CmdOptions)`


```typescript
interface CmdOptions {
  dir?: string; // working directory. If empty, uses current working directory
  env?: { [name: string]: string | undefined }; // process environment variable
  shell?: boolean | string; // run command in the system-default shell
  stdin?: Readable | 'inherit' | 'pipe' | Buffer | Reader | null; // fd 0
  stdout?: Writable | 'inherit' | 'pipe' | null; // fd 1
  stderr?: Writable | 'inherit' | 'pipe' | null; // fd 2
  extraFiles?: (Readable | 'pipe' | null)[]; // more fds 3...
  windowsHide?: boolean;
}
```

## Examples

### `startCmd` examples

#### Example: Pipe one command's output into another's input:

```typescript
const [, { stdout: dateout }] = startCmd('date', [], { stdout: 'pipe' });
const [cmd, stdio] = startCmd('cat', [], { stdin: dateout, stdout: 'inherit' });
await cmd.wait();
```

### `Cmd` class examples

#### Example: Print output of `top` to `stdout`

```typescript
const cmd = new Cmd('top');
cmd.stdout = process.stdout;
await cmd.run();
```

#### Example: Get output of `uname -a`

```typescript
console.log(await(new Cmd('uname', '-a')).output('utf8'));
```

#### Example: Provide a buffer for stdin and capture stdout as text

```typescript
const cmd = new Cmd('tr', '[:lower:]', '[:upper:]');
cmd.stdin = Buffer.from('Hello world\n');
console.log(await cmd.output('utf8'));
```

#### Example: Provide a file for stdin and catpure stdout as text

```typescript
const cmd = new Cmd('tr', '[:upper:]', '[:lower:]');
cmd.stdin = io.createFileReader('jokes.txt');
console.log(await cmd.output('utf8'));
```

#### Example: Execute a command in a shell, listing the contents of a directory

```typescript
const cmd = new Cmd('if [ -d . ]; then ls; fi');
cmd.shell = true;
cmd.dir = '~';
console.log(await cmd.output('utf8'));
```

#### Example: Pipe one command's output into another's input

```typescript
const date = new Cmd('date');
date.stdout = 'pipe';
const { stdout: dateout } = date.start();
const cmd = new Cmd('cat');
cmd.stdin = dateout;
cmd.stdout = process.stdout;
await cmd.run();
```
