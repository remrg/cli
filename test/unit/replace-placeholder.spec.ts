import { describe, it, expect, afterEach } from 'vitest';
import { replacePlaceholder } from '@/utils/replace-placeholder';
import {
	mkdtempSync,
	mkdirSync,
	writeFileSync,
	readFileSync,
	rmSync,
} from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('replacePlaceholder', () => {
	let tmpDir: string;

	afterEach(() => {
		if (tmpDir) {
			rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	function makeRunner(dir: string) {
		return {
			dir,
			run: (_fn: () => void, _opts?: unknown) => _fn(),
		} as never;
	}

	it('replaces placeholder in a regular file', () => {
		tmpDir = mkdtempSync(join(tmpdir(), 'remrg-test-'));
		writeFileSync(join(tmpDir, 'README.md'), '{{ remrg:var project-name }}');

		replacePlaceholder(makeRunner(tmpDir), 'project-name', 'my-app');

		expect(readFileSync(join(tmpDir, 'README.md'), 'utf8')).toBe('my-app');
	});

	it('replaces placeholder in a dot-file', () => {
		tmpDir = mkdtempSync(join(tmpdir(), 'remrg-test-'));
		writeFileSync(
			join(tmpDir, '.env.example'),
			'NAME={{ remrg:var project-name }}'
		);

		replacePlaceholder(makeRunner(tmpDir), 'project-name', 'my-app');

		expect(readFileSync(join(tmpDir, '.env.example'), 'utf8')).toBe(
			'NAME=my-app'
		);
	});

	it('replaces placeholder in a file inside a dot-directory', () => {
		tmpDir = mkdtempSync(join(tmpdir(), 'remrg-test-'));
		const dotDir = join(tmpDir, '.config');
		mkdirSync(dotDir);
		writeFileSync(
			join(dotDir, 'settings.json'),
			'{ "name": "{{ remrg:var project-name }}" }'
		);

		replacePlaceholder(makeRunner(tmpDir), 'project-name', 'my-app');

		expect(readFileSync(join(dotDir, 'settings.json'), 'utf8')).toBe(
			'{ "name": "my-app" }'
		);
	});

	it('does not replace a different placeholder key', () => {
		tmpDir = mkdtempSync(join(tmpdir(), 'remrg-test-'));
		const original = '{{ remrg:var other-key }}';
		writeFileSync(join(tmpDir, 'file.txt'), original);

		replacePlaceholder(makeRunner(tmpDir), 'project-name', 'my-app');

		expect(readFileSync(join(tmpDir, 'file.txt'), 'utf8')).toBe(original);
	});
});
