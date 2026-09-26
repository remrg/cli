import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { getInstalledDir } from '@/utils/remrg-installed/get-installed-dir';
import { mkdtempSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('getInstalledDir', () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = mkdtempSync(join(tmpdir(), 'remrg-test-'));
	});

	afterEach(() => {
		if (tmpDir) {
			rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it('returns installed dir if it exists', () => {
		const remrgDir = join(tmpDir, '.remrg');
		const installedDir = join(remrgDir, 'installed');

		mkdirSync(remrgDir);
		mkdirSync(installedDir);

		const result = getInstalledDir(tmpDir);

		expect(result).toBe(installedDir);
	});

	it('throws an error if .remrg/installed does not exist', () => {
		expect(() => getInstalledDir(tmpDir)).toThrow(
			'Project does not appear to be a remrg project (.remrg/installed not found).'
		);
	});
});
