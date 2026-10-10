"""Capacity and batch failure regressions; all external work is mocked."""
from contextlib import redirect_stdout, redirect_stderr
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

import compress
import rebuild_bounds as rebuild


class CapacityTests(unittest.TestCase):
    def test_capacity_boundary_custom_limit_and_warning(self):
        for limit, size in [(4_000_000, 4_000_000), (4_000_000, 4_000_001),
                            (2_500_000, 3_630_000), (5_000_000, 4_500_000)]:
            with self.subTest(limit=limit, size=size), tempfile.TemporaryDirectory() as temp:
                out = Path(temp) / 'result.glb'
                args = ['compress.py', 'input.glb', str(out), '--mode', 'furniture-draft']
                if limit != 4_000_000:
                    args += ['--max-bytes', str(limit)]
                stderr = io.StringIO()
                with patch.object(sys, 'argv', args), patch.object(compress.subprocess, 'run'), \
                     patch.object(compress, 'atlas_info', return_value={'bytes': size, 'ao_mime_type': 'image/webp'}), \
                     redirect_stdout(io.StringIO()), redirect_stderr(stderr):
                    compress.main()  # No SystemExit, even above target.
                report = json.loads(out.with_suffix('.compression.json').read_text())
                self.assertEqual(report['target_bytes'], limit)
                self.assertEqual(report['target_met'], size <= limit)
                self.assertEqual('WARNING:' in stderr.getvalue(), size > limit)

    def invoke(self, args, failure=None):
        stdout, stderr = io.StringIO(), io.StringIO()
        with tempfile.TemporaryDirectory() as temp, patch.object(rebuild, 'ROOT', Path(temp)), \
             patch.object(sys, 'argv', ['rebuild_bounds.py'] + args), \
             patch.object(rebuild.subprocess, 'run', side_effect=failure) as run, \
             redirect_stdout(stdout), redirect_stderr(stderr):
            assets = Path(temp) / 'exports/hexa-public/layouts/assets'
            assets.mkdir(parents=True)
            for part in rebuild.selected_parts('all'):
                (assets / (part + '.mesh.json')).write_text('{}')
            code = 0
            try:
                rebuild.main()
            except SystemExit as error:
                code = error.code
        return code, stdout.getvalue(), stderr.getvalue(), run.call_args_list

    def test_dry_run_default_and_subset_forwarding(self):
        code, stdout, _, calls = self.invoke([])
        self.assertEqual(code, 0)
        self.assertEqual(len(stdout.splitlines()), 32)
        self.assertEqual(stdout.count('--max-bytes 4000000'), 8)
        self.assertFalse(calls)
        code, stdout, _, calls = self.invoke(['--parts', 'active-side-cabinet,aluminum-front-kitchen,i-seat', '--max-bytes', '5000000'])
        self.assertEqual(code, 0)
        self.assertEqual(len(stdout.splitlines()), 24)
        self.assertNotIn('aluminum-bed', stdout)
        self.assertEqual(stdout.count('--max-bytes 5000000'), 6)
        self.assertFalse(calls)

    def test_each_failure_stage_continues_and_summarizes(self):
        for stage in ('run.py', 'check_material_report.py', 'compress.py', 'compare_bounds.py'):
            for error_type in (subprocess.CalledProcessError, OSError):
                with self.subTest(stage=stage, error_type=error_type):
                    def fail(cmd, **kwargs):
                        if Path(cmd[2]).name == stage and any('-birch' in arg for arg in cmd):
                            if error_type is OSError:
                                raise OSError('simulated launch failure')
                            raise subprocess.CalledProcessError(9, cmd)
                    code, stdout, stderr, calls = self.invoke(['--execute', '--parts', 'active-side-cabinet,i-seat'], fail)
                    self.assertEqual(code, 1)
                    self.assertIn('Completed: 2/4; failed: 2', stdout)
                    self.assertIn('active-side-cabinet/birch: ' + stage, stderr)
                    self.assertIn('i-seat/birch: ' + stage, stderr)
                    hexa = [c for c in calls if any('-hexa' in arg for arg in c.args[0])]
                    self.assertEqual(len(hexa), 8)
                    self.assertEqual(Path(calls[-1].args[0][2]).name, 'compare_bounds.py')

    def test_success_and_duplicate_selection(self):
        code, stdout, stderr, calls = self.invoke(['--execute', '--parts', 'i-seat,i-seat'])
        self.assertEqual(code, 0)
        self.assertIn('Completed: 2/2; failed: 0', stdout)
        self.assertEqual(stderr, '')
        self.assertEqual(len(calls), 8)

    def test_invalid_arguments_launch_nothing(self):
        for args in (['--parts', ''], ['--parts', 'typo'], ['--parts', 'i-seat,'],
                     ['--max-bytes', '0'], ['--max-bytes', '-1'], ['--tag', '../old']):
            code, _, _, calls = self.invoke(['--execute'] + args)
            self.assertEqual(code, 2)
            self.assertFalse(calls)
        with patch.object(sys, 'argv', ['compress.py', 'in.glb', 'out.glb', '--max-bytes', '0']), \
             patch.object(compress.subprocess, 'run') as run, redirect_stderr(io.StringIO()):
            with self.assertRaises(SystemExit) as result:
                compress.main()
            self.assertEqual(result.exception.code, 2)
            run.assert_not_called()

    def test_existing_output_refused_before_launch(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            output = root / 'exports/hexa-studio-blender-20261010/out-furn-i-seat-existing-birch'
            output.mkdir(parents=True)
            assets = root / 'exports/hexa-public/layouts/assets'
            assets.mkdir(parents=True)
            (assets / 'i-seat.mesh.json').write_text('{}')
            with patch.object(rebuild, 'ROOT', root), \
                 patch.object(sys, 'argv', ['rebuild_bounds.py', '--execute', '--parts', 'i-seat', '--tag', 'existing']), \
                 patch.object(rebuild.subprocess, 'run') as run, redirect_stderr(io.StringIO()):
                with self.assertRaises(SystemExit) as result:
                    rebuild.main()
                self.assertEqual(result.exception.code, 2)
                run.assert_not_called()
                self.assertTrue(output.exists())


if __name__ == '__main__':
    unittest.main()
