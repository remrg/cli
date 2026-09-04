import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { loadInstalledTemplates } from '@/utils/remrg-installed/load-installed-templates';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('loadInstalledTemplates', () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = mkdtempSync(join(tmpdir(), 'remrg-test-'));
	});

	afterEach(() => {
		if (tmpDir) {
			rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	it('returns all templates and their parsed configs', () => {
		const remrgDir = join(tmpDir, '.remrg');
		const installedDir = join(remrgDir, 'installed');

		mkdirSync(remrgDir);
		mkdirSync(installedDir);

		// Template A with YAML
		const templateADir = join(installedDir, 'template-a');
		mkdirSync(templateADir);
		writeFileSync(
			join(templateADir, 'remrg.yml'),
			'projectName: template-a\norganization: org\nroots:\n  - base'
		);

		// Template B without YAML
		const templateBDir = join(installedDir, 'template-b');
		mkdirSync(templateBDir);

		const result = loadInstalledTemplates(tmpDir);

		expect(result).toHaveLength(2);
		expect(result.find((r) => r.name === 'template-a')?.options?.roots).toEqual(
			['base']
		);
		expect(
			result.find((r) => r.name === 'template-b')?.options
		).toBeUndefined();
	});
});
