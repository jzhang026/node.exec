import { Cmd } from '../src';
import fs from 'fs';
import { fixtureFile } from './utils';
import { createFileReader, createReader } from '../src/io';
describe('Cmd', function () {
  it('runs a command', async () => {
    const cmd = new Cmd('uname', '-a');
    const output = await cmd.output('utf8');
    expect(typeof output).toBe('string');
  });

  it('read file as input', async () => {
    const cmd = new Cmd('tr', '[:upper:]', '[:lower:]');
    cmd.stdin = createFileReader(fixtureFile('testtext'));
    const output = await cmd.output('utf8');
    expect(output).toMatchInlineSnapshot(`"hello, this is awesome"`);
  });

  it('read buffer as input', async () => {
    const cmd = new Cmd('tr', '[:lower:]', '[:upper:]');
    cmd.stdin = Buffer.from('Hello world\n');
    const output = await cmd.output('utf8');
    expect(output).toMatchInlineSnapshot(`
      "HELLO WORLD
      "
    `);
  });

  it('read buffer as input', async () => {
    const cmd = new Cmd('if [ -d . ]; then ls; fi');
    cmd.shell = true;
    cmd.dir = fixtureFile('subfolder');
    const output = await cmd.output('utf8');
    expect(output).toMatchSnapshot();
  });

  it("Pipe one command's output into another's input", async () => {
    const date = new Cmd('date');
    date.stdout = 'pipe';
    const { stdout: dateout } = date.start()!;
    const cmd = new Cmd('tr', '[:lower:]', '[:upper:]');
    cmd.stdin = dateout;
    cmd.stdout = process.stdout;
    // await cmd.run();
    const output = await cmd.output('utf8');
    console.log('####', output);
    expect(typeof output).toBe('string');
  });
});
