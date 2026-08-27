import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { getTemplateLineage } from '@/utils/remrg-installed/get-template-lineage';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('getTemplateLineage', () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = mkdtempSync(join(tmpdir(), 'remrg-test-'));
	});

	afterEach(() => {
		if (tmpDir) {
			rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	function setupTemplate(name: string, roots: string[] = []) {
		const installedDir = join(tmpDir, '.remrg', 'installed');
		const templateDir = join(installedDir, name);
		mkdirSync(templateDir, { recursive: true });

		const yamlContent = `
projectName: ${name}
organization: org
roots: ${roots.length > 0 ? '\n' + roots.map((r) => `  - ${r}`).join('\n') : '[]'}
`;
		writeFileSync(join(templateDir, 'remrg.yml'), yamlContent);
	}

	it('returns empty array if no templates', () => {
		const installedDir = join(tmpDir, '.remrg', 'installed');
		mkdirSync(installedDir, { recursive: true });

		const result = getTemplateLineage(tmpDir);
		expect(result).toEqual([]);
	});

	it('topologically sorts templates by roots', () => {
		const installedDir = join(tmpDir, '.remrg', 'installed');
		mkdirSync(installedDir, { recursive: true });

		// D -> C -> B -> A
		setupTemplate('template-c', ['template-b']);
		setupTemplate('template-a', []);
		setupTemplate('template-b', ['template-a']);
		setupTemplate('template-d', ['template-c']);

		const result = getTemplateLineage(tmpDir);

		expect(result).toEqual([
			'template-a',
			'template-b',
			'template-c',
			'template-d',
		]);
	});

	it('ignores roots that are not installed', () => {
		const installedDir = join(tmpDir, '.remrg', 'installed');
		mkdirSync(installedDir, { recursive: true });

		setupTemplate('template-b', ['template-a']); // template-a is missing

		const result = getTemplateLineage(tmpDir);

		expect(result).toEqual(['template-b']);
	});

	it('handles templates without remrg.yml files as having 0 roots', () => {
		const installedDir = join(tmpDir, '.remrg', 'installed');
		mkdirSync(installedDir, { recursive: true });

		setupTemplate('template-b', ['template-a']);

		// create template-a folder but NO remrg.yml
		mkdirSync(join(installedDir, 'template-a'));

		const result = getTemplateLineage(tmpDir);

		// template-a has no roots, so it goes first before b
		expect(result).toEqual(['template-a', 'template-b']);
	});

	it('throws an error on circular dependencies', () => {
		const installedDir = join(tmpDir, '.remrg', 'installed');
		mkdirSync(installedDir, { recursive: true });

		setupTemplate('template-a', ['template-b']);
		setupTemplate('template-b', ['template-a']);

		expect(() => getTemplateLineage(tmpDir)).toThrowError(
			/Circular dependency/
		);
	});
});
