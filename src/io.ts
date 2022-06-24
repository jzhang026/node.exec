import { Readable, Writable } from 'stream';
import fs from 'fs';
const IO_TYPE = Symbol('IO_TYPE');

export interface Reader extends AsyncIterable<Buffer> {
  read(size?: number): Promise<Buffer>;
  read(encoding: BufferEncoding): Promise<string>;
  read(size: number, encoding: BufferEncoding): Promise<string>;

  /**
   * read chunks as they arrive into the underlying buffer.
   * @Example
   * for await (const chunk of readStream) {
   *  console.log(chunk);
   * }
   */
  [Symbol.asyncIterator](): AsyncIterableIterator<Buffer>;

  readonly stream: Readable;

  readonly [IO_TYPE]: 'Reader';

  close(): void;
}

export interface Writer {
  readonly stream: Writable;
  readonly [IO_TYPE]: 'Writer';
}
export function isReader(value: any): value is Reader {
  return value && typeof value === 'object' && value[IO_TYPE] === 'Reader';
}

export function isWriter(value: any): value is Writer {
  return value && typeof value === 'object' && value[IO_TYPE] === 'Writer';
}

const emptyBuffer = Buffer.allocUnsafe(0);
export class StreamReader implements Reader {
  readonly stream: Readable;
  readonly [IO_TYPE] = 'Reader';

  private ended = false;

  constructor(stream: Readable) {
    this.stream = stream;

    // required in order to use read()
    stream.pause();
    stream.once('end', () => {
      this.ended = true;
      if (!this.stream.destroyed) {
        this.stream.destroy();
      }
    });
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<Buffer> {
    return this.stream[Symbol.asyncIterator]();
  }

  async read(size?: number): Promise<Buffer>;
  async read(encoding: BufferEncoding): Promise<string>;
  async read(size: number, encoding: BufferEncoding): Promise<string>;
  async read(sizeOrEncoding?: number | BufferEncoding, encoding?: BufferEncoding) {
    let size = Number.MAX_SAFE_INTEGER;
    if (typeof sizeOrEncoding === 'number' && sizeOrEncoding >= 0) {
      size = sizeOrEncoding;
    } else if (typeof sizeOrEncoding === 'string') {
      encoding = sizeOrEncoding;
    }

    if (this.ended) {
      // trying to read avalaible data
      if (this.stream.readable) {
        const buf = this.stream.read(size);
        if (buf) {
          return encoding ? buf.toString(encoding) : buf;
        }
      }

      // stream ended and there is nothing else to read.
      return encoding ? '' : emptyBuffer;
    }

    // data not yet available
    const buffers: Buffer[] = [];

    // accumulative length of `buffers`
    let buffersLen = 0;

    // read what is in the buffer
    if (this.stream.readable) {
      const buf = this.stream.read(size);
      if (buf) {
        buffers.push(buf);
        buffersLen += buf.length;
      }
    }

    while (buffersLen < size && !this.ended) {
      await new Promise((resolve, reject) => {
        this.stream.once('error', reject);
        this.stream.once('end', resolve);
        this.stream.once('readable', resolve);
      });

      // read no more than what we need
      let buf = this.stream.read(size - buffersLen);
      if (!buf) {
        // if that fails it means that the stream's buffer is smaller.
        // retrieve whatever is in the buffer
        buf = this.stream.read();
      }
      if (buf) {
        buffers.push(buf);
        buffersLen += buf.length;
      }
    }

    const buf = buffersJoin(buffers);

    return encoding ? buf.toString(encoding) : buf;
  }

  close() {
    if (this.ended || this.stream.destroyed) return;
    this.stream.destroy();
    this.ended = true;
  }

  isClosed() {
    return this.stream.destroyed;
  }
}

const InvalidReader = new (class implements Reader {
  readonly [IO_TYPE] = 'Reader';
  _E() {
    return new Error('stream not readable');
  }
  get stream(): Readable {
    throw this._E();
  }
  [Symbol.asyncIterator](): AsyncIterableIterator<Buffer> {
    throw this._E();
  }
  read() {
    return Promise.reject(this._E());
  }
  close(): void {
    throw this._E();
  }
})();

const InvalidWriter = new (class implements Writer {
  readonly [IO_TYPE] = 'Writer';
  _E() {
    return new Error('stream not writable');
  }
  get stream(): Writable {
    throw this._E();
  }
})();

export function createReader(stream?: Readable | null): Reader {
  return stream ? new StreamReader(stream) : InvalidReader;
}

export function createWriter(stream?: Writable | null): Writer {
  return stream
    ? {
        [IO_TYPE]: 'Writer',
        stream,
      }
    : InvalidWriter;
}

export function writeString(writer: Writer, data: string | Buffer | Uint8Array): Promise<void> {
  return new Promise((resolve) => {
    if (!writer.stream.write(data)) {
      writer.stream.once('drain', resolve);
    } else {
      resolve();
    }
  });
}

class DataBuffer {
  private readonly data: Buffer[] = [];
  private offset = 0;
  write(b: Buffer) {
    this.data.push(b);
    this.offset += b.length;
    return true;
  }

  buffer() {
    return buffersJoin(this.data, this.offset);
  }
}

export function createDataBuffer() {
  return new DataBuffer();
}

function buffersJoin(bufs: Buffer[], totalLength?: number): Buffer {
  return bufs.length === 0 ? emptyBuffer : bufs.length === 1 ? bufs[0] : Buffer.concat(bufs, totalLength);
}

export function isReadableStream(s: Readable | Writable | null | undefined): s is Readable {
  return s && (s as any).read;
}

export function isWritableStream(s: Readable | Writable | null | undefined): s is Writable {
  return s && (s as any).write;
}
class FileReader extends StreamReader {
  constructor(filename: string) {
    super(fs.createReadStream(filename));
  }
}
export function createFileReader(filename: string): Reader {
  return new FileReader(filename);
}
