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
projectName: template-a
organization: my-org
version: 1.0.0
roots:
  - base-code
`;
		writeFileSync(join(templateDir, 'remrg.yml'), yamlContent);

		const result = loadInstalledTemplate(tmpDir, 'template-a');

		expect(result).toBeDefined();
		expect(result?.projectName).toBe('template-a');
		expect(result?.organization).toBe('my-org');
		expect(result?.version).toBe('1.0.0');
		expect(result?.roots).toEqual(['base-code']);
	});
});
