import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { loadInstalledTemplateNames } from '@/utils/remrg-installed/load-installed-template-names';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('loadInstalledTemplateNames', () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = mkdtempSync(join(tmpdir(), 'remrg-test-'));
	});

	afterEach(() => {
		if (tmpDir) {
			rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it('returns only directory names under .remrg/installed', () => {
		const remrgDir = join(tmpDir, '.remrg');
		const installedDir = join(remrgDir, 'installed');

		mkdirSync(remrgDir);
		mkdirSync(installedDir);

		// Create some template directories
		mkdirSync(join(installedDir, 'template-a'));
		mkdirSync(join(installedDir, 'template-b'));

		// Create a file to ensure it gets filtered out
		writeFileSync(join(installedDir, 'not-a-dir.txt'), 'content');

		const result = loadInstalledTemplateNames(tmpDir);

		expect(result).toEqual(['template-a', 'template-b']);
	});

	it('returns empty array if no templates exists', () => {
		const remrgDir = join(tmpDir, '.remrg');
		const installedDir = join(remrgDir, 'installed');

		mkdirSync(remrgDir);
		mkdirSync(installedDir);

		const result = loadInstalledTemplateNames(tmpDir);

		expect(result).toEqual([]);
	});
});
