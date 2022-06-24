/* eslint-disable */
// this function is never used but here to test the complex typescript types of spawn()
import * as io from '../../src/io';
import { Cmd, startCmd, Pipes } from '../../src';
function _TEST_typescript_startCmd() {
  {
    const _empty1: [Cmd] = startCmd('a', []);
    const _empty2: [Cmd] = startCmd('a', [], { dir: '' });

    const ____: [Cmd, Pipes<null, null, null>] = startCmd('a', [], { stdin: null, stdout: null, stderr: 'inherit' });
    const ____2: [Cmd, Pipes<null, null, null>] = startCmd('a', [], { stdin: null, stdout: null, stderr: null });
    const ____3: [Cmd, Pipes<null, null, null>] = startCmd('a', [], { stdin: null });
    const ____4: [Cmd, Pipes<null, null, null>] = startCmd('a', [], { stdout: null });
    const ____5: [Cmd, Pipes<null, null, null>] = startCmd('a', [], { stderr: null });

    const _extraFiles: [Cmd, Pipes<null, null, null>] = startCmd('a', [], { extraFiles: [] });

    const _p__: [Cmd, Pipes<io.Writer, null, null>] = startCmd('a', [], { stdin: 'pipe', stdout: null, stderr: null });
    const _p__2: [Cmd, Pipes<io.Writer, null, null>] = startCmd('a', [], { stdin: 'pipe' });

    const _pp_: [Cmd, Pipes<io.Writer, io.Reader, null>] = startCmd('a', [], {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: null,
    });
    const _pp_2: [Cmd, Pipes<io.Writer, io.Reader, null>] = startCmd('a', [], { stdin: 'pipe', stdout: 'pipe' });

    const _ppp: [Cmd, Pipes<io.Writer, io.Reader, io.Reader>] = startCmd('a', [], {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const __pp: [Cmd, Pipes<null, io.Reader, io.Reader>] = startCmd('a', [], {
      stdin: null,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const __pp2: [Cmd, Pipes<null, io.Reader, io.Reader>] = startCmd('a', [], { stdout: 'pipe', stderr: 'pipe' });

    const _p_p: [Cmd, Pipes<io.Writer, null, io.Reader>] = startCmd('a', [], {
      stdin: 'pipe',
      stdout: null,
      stderr: 'pipe',
    });
    const _p_p2: [Cmd, Pipes<io.Writer, null, io.Reader>] = startCmd('a', [], { stdin: 'pipe', stderr: 'pipe' });

    const ___p: [Cmd, Pipes<null, null, io.Reader>] = startCmd('a', [], { stdin: null, stdout: null, stderr: 'pipe' });
    const ___p2: [Cmd, Pipes<null, null, io.Reader>] = startCmd('a', [], { stderr: 'pipe' });
  }

  // ---- copy of above, but args omitted ----
  {
    const _empty1: [Cmd] = startCmd('a');
    const _empty2: [Cmd] = startCmd('a', { dir: '' });

    const ____: [Cmd, Pipes<null, null, null>] = startCmd('a', { stdin: null, stdout: null, stderr: 'inherit' });
    const ____2: [Cmd, Pipes<null, null, null>] = startCmd('a', { stdin: null, stdout: null, stderr: null });
    const ____3: [Cmd, Pipes<null, null, null>] = startCmd('a', { stdin: null });
    const ____4: [Cmd, Pipes<null, null, null>] = startCmd('a', { stdout: null });
    const ____5: [Cmd, Pipes<null, null, null>] = startCmd('a', { stderr: null });

    const _extraFiles: [Cmd, Pipes<null, null, null>] = startCmd('a', { extraFiles: [] });

    const _p__: [Cmd, Pipes<io.Writer, null, null>] = startCmd('a', { stdin: 'pipe', stdout: null, stderr: null });
    const _p__2: [Cmd, Pipes<io.Writer, null, null>] = startCmd('a', { stdin: 'pipe' });

    const _pp_: [Cmd, Pipes<io.Writer, io.Reader, null>] = startCmd('a', {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: null,
    });
    const _pp_2: [Cmd, Pipes<io.Writer, io.Reader, null>] = startCmd('a', { stdin: 'pipe', stdout: 'pipe' });

    const _ppp: [Cmd, Pipes<io.Writer, io.Reader, io.Reader>] = startCmd('a', {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const __pp: [Cmd, Pipes<null, io.Reader, io.Reader>] = startCmd('a', {
      stdin: null,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const __pp2: [Cmd, Pipes<null, io.Reader, io.Reader>] = startCmd('a', { stdout: 'pipe', stderr: 'pipe' });

    const _p_p: [Cmd, Pipes<io.Writer, null, io.Reader>] = startCmd('a', {
      stdin: 'pipe',
      stdout: null,
      stderr: 'pipe',
    });
    const _p_p2: [Cmd, Pipes<io.Writer, null, io.Reader>] = startCmd('a', { stdin: 'pipe', stderr: 'pipe' });

    const ___p: [Cmd, Pipes<null, null, io.Reader>] = startCmd('a', { stdin: null, stdout: null, stderr: 'pipe' });
    const ___p2: [Cmd, Pipes<null, null, io.Reader>] = startCmd('a', { stderr: 'pipe' });
  }
}
