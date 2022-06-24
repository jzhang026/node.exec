import assert from 'assert';
import { ChildProcess, spawn, SpawnOptions } from 'child_process';
import fs from 'fs';
import os from 'os';
import { Writable, Readable, PassThrough } from 'stream';
import { createTimeout, errorCodeMsg, expandTildePath, isWindows } from './utils';
import * as io from './io';
import { CmdOptions, NOT_STARTED_ERROR, Pipes, Signal, SignalMode } from './types';
import { Reader } from './io';

// Cmd represents an external command being prepared or run
export class Cmd implements Required<CmdOptions> {
  command: string;
  args: string[];
  dir = ''; // working directory. If empty, uses current working directory
  env: { [name: string]: string | undefined } = { ...process.env }; // process environment
  shell: boolean | string = false; // run command in the system-default shell
  stdin: Readable | 'inherit' | 'pipe' | Buffer | Reader | null = null; // fd 0
  stdout: Writable | 'inherit' | 'pipe' | null = null; // fd 1
  stderr: Writable | 'inherit' | 'pipe' | null = null; // fd 2
  extraFiles: (Readable | 'pipe' | null)[] = []; // fd 3...
  windowsHide = true;

  private process: ChildProcess | null = null; // underlying process
  private promise: Promise<number>; // resolves with status code when process exits
  private running = false; // true while the underlying process is running
  private pid = 0; // pid, valid after start() has been called
  private exitCode = -1;
  // exit code of the exited process, or -1 if the process hasn't exited or was
  // terminated by a signal.

  constructor(command: string, ...args: string[]) {
    this.command = command;
    this.args = args;
    this.promise = Promise.reject(new Error(NOT_STARTED_ERROR));
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    this.promise.catch((_) => {}); // avoid uncaught promise
  }

  // start launches the command process.
  // If the process fails to launch, this function throws an error.
  // Returns caller's end of I/O pipes. Returns null if no stdio pipes were configured.
  start(): Pipes | null {
    if (this.running) {
      throw new Error('start() called while command is running');
    }

    // reset exit code
    this.exitCode = -1;

    // create a new promise
    this.promise = new Promise<number>((res, rej) => {
      this._resolve = res;
      this._reject = rej;
    });

    // configure stdin which may be a buffer
    let stdin: Readable | 'inherit' | 'pipe' | null = null;
    let stdinStreamNeedsPiping: Readable | null = null;
    if (this.stdin instanceof Buffer) {
      stdin = 'pipe';
    } else if (io.isReader(this.stdin)) {
      if (typeof (this.stdin.stream as any).fd == 'string') {
        // Nodejs' child_process module can handle "Socket" type of streams directly.
        // "Socket" really is just the name for a stream around a file descriptor.
        stdin = this.stdin.stream;
      } else {
        stdin = 'pipe';
        stdinStreamNeedsPiping = this.stdin.stream;
      }
    } else {
      stdin = this.stdin;
    }

    // spawn a process
    const spawnOptions: SpawnOptions = {
      stdio: [
        stdin || 'ignore',
        this.stdout === process.stdout ? 1 : this.stdout || 'ignore',
        this.stderr === process.stderr ? 2 : this.stderr || 'ignore',
        ...this.extraFiles,
      ],
      cwd: this.dir ? expandTildePath(this.dir) : undefined,
      env: this.env,
      shell: this.shell,
      windowsHide: this.windowsHide,

      // On non-windows platforms, set detached so that p gets its own process group, allowing us to
      // signal its process tree.
      // Note that this option has a different meaning on Windows and screws with stdio inheritance.
      detached: !isWindows,
    };

    const p = spawn(this.command, this.args, spawnOptions);

    // This is a bit of a hack, working around an awkward design choice in nodejs' child_process
    // module where spawn errors are deliberately delayed until the next runloop iteration.
    // The effect of this choice means that we don't know if creating a new process, which is a
    // synchronous operation, succeeded until the next runloop frame.
    // We have one thing going for us here: p.pid is undefined when spawn failed, so we can
    // look at p.pid to know if there will be an error event in the next runoop frame or not, but
    // we don't know anything about the error yet; not until the next runloop frame.
    // See https://github.com/nodejs/node/blob/v14.12.0/lib/internal/child_process.js#L379-L390
    if (p.pid === undefined) {
      this.process = null;
      this.pid = 0;
      // guesstimate the actual error by checking status of command file
      const err = guessSpawnError(this);
      this._reject(err);
      throw err;
    }

    // set process & running state
    this.running = true;
    this.process = p;
    this.pid = p.pid;

    // attach event listeners
    p.on('exit', this._onexit);
    p.on('error', this._reject);

    console.debug(`started (${this.command})`);

    // stdin buffer?
    if (p.stdin) {
      if (this.stdin instanceof Buffer) {
        const r = new PassThrough();
        r.end(this.stdin);
        r.pipe(p.stdin);
        p.stdin = null;
      } else if (stdinStreamNeedsPiping) {
        stdinStreamNeedsPiping.pipe(p.stdin);
        p.stdin = null;
      }
    }

    // if there are no pipes, return no pipes
    if (!p.stdin && !p.stdout && !p.stderr && p.stdio.length < 4) {
      return null;
    }

    // Ideally the return type of start() should depend on the values of Cmd.std{in,out,err}
    // so here we are, casting null toba non-null type, asking for trouble. All for the sake
    // of not having to do "!" for every call to stdio objects returned from start()...
    const cmdio: Pipes = {
      stdin: p.stdin ? io.createWriter(p.stdin) : null,
      stdout: p.stdout ? io.createReader(p.stdout) : null,
      stderr: p.stderr ? io.createReader(p.stderr) : null,
      extraFiles: p.stdio
        .slice(3)
        .map((stream) =>
          io.isReadableStream(stream)
            ? io.createReader(stream)
            : io.isWritableStream(stream)
            ? io.createWriter(stream)
            : null,
        ),
    };

    return cmdio;
  }

  // run starts the specified command and waits for it to complete.
  // Returns process exit status code.
  run(timeout?: number): Promise<number> {
    this.start();
    return this.wait(timeout);
  }

  // output runs the specified command and returns its standard output.
  // If the program does not exit with status 0, an error is thrown.
  output(encoding: null | undefined, timeout?: number | null): Promise<Buffer>;
  output(encoding: BufferEncoding, timeout?: number | null): Promise<string>;
  output(encoding?: BufferEncoding | null, timeout?: number | null): Promise<Buffer | string> {
    this.stdout = 'pipe';
    if (!this.stderr) {
      this.stderr = 'pipe';
    }

    const { stdout, stderr } = this.start()!;
    const stdoutBuf = io.createDataBuffer();
    const stderrBuf = io.createDataBuffer();

    stdout!.stream.on('data', (chunk) => {
      stdoutBuf.write(chunk);
    });

    if (stderr) {
      stderr.stream.on('data', (chunk) => {
        stderrBuf.write(chunk);
      });
    }

    return this.wait(timeout || 0).then((exitCode) => {
      if (exitCode != 0) {
        let errstr = '';
        const errbuf = stderrBuf.buffer();
        try {
          errstr = errbuf.toString('utf8');
        } catch (_) {
          errstr = errbuf.toString('ascii');
        }
        if (errstr.length > 0) {
          errstr = 'stderr output:\n' + errstr;
        }
        throw new Error(`command exited with status ${exitCode}${errstr}`);
      }
      const buf = stdoutBuf.buffer();
      return encoding ? buf.toString(encoding) : buf;
    });
  }

  // wait for process to exit, with an optional timeout expressed in milliseconds.
  // Returns the exit status. Throws TIMEOUT on timeout.
  wait(timeout?: number, timeoutSignal?: Signal): Promise<number> {
    if (timeout === undefined || timeout <= 0) {
      return this.promise;
    }
    return this._waitTimeout(timeout, (err, _resolve, reject) => {
      console.debug('wait timeout reached; killing process');
      err.message = 'Cmd.wait timeout';
      return this.kill(timeoutSignal).then(() => reject(err));
    });
  }

  // signal sends sig to the underlying process and returns true if sending the signal worked.
  // mode defaults to "standard"
  //
  // If the signal is successfully sent (not neccessarily delivered) true is returned.
  // If the process is not running, false is returned (no effect.)
  // If the process has not been started, an exception is thrown.
  // If the signal is not supported by the platform, an exception is thrown.
  // If another error occur, like signalling permissions, false is returned.
  //
  signal(sig: Signal, mode?: SignalMode): boolean {
    const p = this._checkproc();
    if (mode == 'group') {
      // Signalling process groups via negative pid is supported on most POSIX systems.
      // This causes subprocesses that the command process may have started to also receive
      // the signal.
      try {
        process.kill(-(p.pid || 1), sig);
        return true;
      } catch (_) {
        // will fail if the process is not in its own group or if its is already dead.
        // fall through to "proc" mode:
      }
    }
    return p.kill(sig);
  }

  // kill terminates the command by sending signal sig to the process and waiting for it to exit.
  // mode defaults to "group".
  //
  // If the process has not exited within timeout milliseconds, SIGKILL is sent.
  // The timeout should be reasonably large to allow well-behaved processed to run atexit code but
  // small enough so that an ill-behaved process is killed within a reasonable timeframe.
  // If timeout <= 0 then the returned promise will only resolve if and when the process exits,
  // which could be never if the process ignores sig.
  //
  async kill(sig: Signal = 'SIGTERM', timeout = 500, mode?: SignalMode): Promise<number> {
    const p = this._checkproc();
    if (!this.signal(sig, mode || 'group')) {
      return p.exitCode || 0;
    }
    if (timeout <= 0) {
      return this.promise;
    }
    return this._waitTimeout(timeout, (_, resolve) => {
      console.debug('kill timeout reached; sending SIGKILL');
      p.kill('SIGKILL');
      return this.promise.then(resolve);
    });
  }

  toString(): string {
    return this.process ? `Cmd[${this.pid}]` : 'Cmd';
  }

  /** internal methods start **/
  _resolve: (exitStatus: number) => void = () => {
    throw new Error('not implemented promise resolve');
  };
  _reject: (reason?: any) => void = (reason) => {
    console.error(reason);
  };

  _checkproc(): ChildProcess {
    if (!this.process) {
      throw new Error(NOT_STARTED_ERROR);
    }
    return this.process;
  }

  _rejectAndKill(reason?: any) {
    this._reject(reason);
  }

  _onerror = (err: Error) => {
    console.debug(`error:\n${err.stack || err}`);
    this._reject(err);
  };

  _onexit = (code: number, signal: NodeJS.Signals) => {
    // run after process exits
    console.debug(`exited status=${code} signal=${signal}`);
    this.running = false;
    if (code === null || signal !== null) {
      assert(typeof signal == 'string');
      this.exitCode = -(os.constants.signals[signal] || 1);
    } else {
      this.exitCode = code || 0;
    }
    this._resolve(this.exitCode);
  };

  // _waitTimeout starts a timer which is cancelled when the process exits.
  // If the timer expires before the process exits, onTimeout is called with a mutable
  // TimeoutError that you can pass to reject and a set of promise resolution functions,
  // which control the promise returned by this function.
  _waitTimeout(
    timeout: number,
    onTimeout: (timeoutErr: Error, resolve: (code?: number) => void, reject: (reason?: any) => void) => Promise<any>,
  ) {
    return new Promise<number>((resolve, reject) => {
      let timeoutOccured = false;
      this.promise.then((exitCode) => {
        if (!timeoutOccured) {
          resolve(exitCode);
        }
      });
      return createTimeout(this.promise, timeout, (timeoutErr) => {
        timeoutOccured = true;
        // now, even if the process exits and calls cmd._resolve, the timeout-enabled
        // promise returned will not resolve. Instead, we call the onTimeout handler
        // which can take its sweet time and eventually, when it's done, call either
        // resolve or reject.
        onTimeout(timeoutErr, resolve as (code?: number) => void, reject);
      });
    });
  }
  /** internal methods end **/
}

function guessSpawnError(cmd: Cmd): Error {
  // guesstimate the actual error by checking status of command file
  let code = '';
  let msg = 'unspecified error';
  if (cmd.shell == false) {
    try {
      fs.accessSync(cmd.dir, fs.constants.R_OK | fs.constants.X_OK);
      const st = fs.statSync(cmd.command);
      if ((st.mode & fs.constants.S_IFREG) == 0) {
        // not a regular file
        code = 'EACCES';
      } else {
        // very likely some sort of I/O error
        code = 'EIO';
      }
    } catch (err: unknown) {
      code = (err as any).code || 'ENOENT';
    }
    msg = errorCodeMsg(code) || msg;
  }
  if (!code) {
    // check dir
    try {
      fs.accessSync(cmd.dir, fs.constants.R_OK | fs.constants.X_OK);
      code = 'EIO';
    } catch (err: unknown) {
      code = (err as any).code || 'ENOENT';
    }
    msg = errorCodeMsg(code) || msg;
    if (code) {
      msg = msg + '; cmd.dir=' + cmd.dir;
    }
  }
  if (!code) {
    code = 'UNKNOWN';
  }
  const e = new Error(`failed to spawn process ${cmd.command} (${code} ${msg})`);
  (e as any).code = code;
  return e;
}
