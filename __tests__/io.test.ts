import * as IO from '../src/io';
import fs from 'fs';
import { fixtureFile } from './utils';

describe('IO', function () {
  it('read correct length of content', async () => {
    const filename = fixtureFile('bigtext');
    expect(filename).toBeTruthy();
    const streamReader = new IO.StreamReader(fs.createReadStream(filename));
    let buf = await streamReader.read(20);
    expect(buf.length).toBe(20);
    // streamReader.terminate();
    buf = await streamReader.read(20);
    expect(buf.length).toBe(20);
    buf = await streamReader.read();
    expect(buf.length).toMatchInlineSnapshot(`2509`);
    expect(streamReader.isClosed()).toBe(true);
  });

  it('can early close underlying node stream', async () => {
    const filename = fixtureFile('bigtext');
    expect(filename).toBeTruthy();
    const streamReader = new IO.StreamReader(fs.createReadStream(filename));
    let buf = await streamReader.read(20);
    expect(buf.length).toBe(20);
    streamReader.close();
    buf = await streamReader.read(20);
    expect(buf.length).toBe(0);

    buf = await streamReader.read();
    expect(buf.length).toBe(0);
  });
});
