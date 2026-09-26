import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { loadInstalledTemplate } from '@/utils/remrg-installed/load-installed-template';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('loadInstalledTemplate', () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = mkdtempSync(join(tmpdir(), 'remrg-test-'));
	});

	afterEach(() => {
		if (tmpDir) {
			rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it('returns undefined if template directory exists but remrg.yml is missing', () => {
		const remrgDir = join(tmpDir, '.remrg');
		const installedDir = join(remrgDir, 'installed');
		const templateDir = join(installedDir, 'template-a');

		mkdirSync(remrgDir);
		mkdirSync(installedDir);
		mkdirSync(templateDir);

		const result = loadInstalledTemplate(tmpDir, 'template-a');

		expect(result).toBeUndefined();
	});

	it('loads and parses remrg.yml', () => {
		const remrgDir = join(tmpDir, '.remrg');
		const installedDir = join(remrgDir, 'installed');
		const templateDir = join(installedDir, 'template-a');

		mkdirSync(remrgDir);
		mkdirSync(installedDir);
		mkdirSync(templateDir);

		const yamlContent = `
name: my-org/template-a
version: 1.0.0
description: Test template
type: feature
license: MIT
access: public
roots:
  - base-code
`;
		writeFileSync(join(templateDir, 'remrg.yml'), yamlContent);

		const result = loadInstalledTemplate(tmpDir, 'template-a');

		expect(result).toBeDefined();
		expect(result?.name).toBe('my-org/template-a');
		expect(result?.version).toBe('1.0.0');
		expect(result?.description).toBe('Test template');
		expect(result?.type).toBe('feature');
		expect(result?.license).toBe('MIT');
		expect(result?.access).toBe('public');
		expect(result?.roots).toEqual(['base-code']);
	});

	it('handles default empty roots array', () => {
		const remrgDir = join(tmpDir, '.remrg');
		const installedDir = join(remrgDir, 'installed');
		const templateDir = join(installedDir, 'simple');

		mkdirSync(remrgDir);
		mkdirSync(installedDir);
		mkdirSync(templateDir);

		const yamlContent = `
name: simple-template
version: 2.0.0
`;
		writeFileSync(join(templateDir, 'remrg.yml'), yamlContent);

		const result = loadInstalledTemplate(tmpDir, 'simple');

		expect(result).toBeDefined();
		expect(result?.name).toBe('simple-template');
		expect(result?.roots).toEqual([]);
	});

	it('throws an error when remrg.yml is empty or malformed', () => {
		const remrgDir = join(tmpDir, '.remrg');
		const installedDir = join(remrgDir, 'installed');
		const templateDir = join(installedDir, 'bad-template');

		mkdirSync(remrgDir);
		mkdirSync(installedDir);
		mkdirSync(templateDir);
		writeFileSync(join(templateDir, 'remrg.yml'), '');

		expect(() => loadInstalledTemplate(tmpDir, 'bad-template')).toThrow(
			`Invalid template manifest: ${join(templateDir, 'remrg.yml')}`
		);
	});
});
