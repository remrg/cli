import {
	mkdtempSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import * as yaml from 'js-yaml';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { recordInstalledTemplateBranch } from '../../../../src/utils/remrg-installed/record-installed-template-branch';
import { getInstalledTemplateBranch } from '../../../../src/utils/remrg-installed/get-installed-template-branch';

describe('installed branch tracking', () => {
	let dir: string;
	const template = {
		name: '@org/base',
		url: 'https://example.com/base.git',
		branch: 'next',
	};

	beforeEach(() => {
		dir = mkdtempSync(path.join(tmpdir(), 'remrg-tracking-'));
	});
	afterEach(() => rmSync(dir, { recursive: true, force: true }));

	function writeManifest(name: string, content: string): string {
		const filename = path.join(dir, '.remrg/installed', name, 'remrg.yml');
		mkdirSync(path.dirname(filename), { recursive: true });
		writeFileSync(filename, content);
		return filename;
	}

	it('migrates a manifest without tracking and preserves all other fields', () => {
		const fields = {
			name: 'org/base',
			url: template.url,
			version: '3.0.0',
			roots: ['parent'],
			custom: { enabled: true },
		};
		const filename = writeManifest(template.name, yaml.dump(fields));
		const parent = writeManifest(
			'parent',
			'name: parent\ntrack: branch/main\n'
		);
		recordInstalledTemplateBranch(dir, template, 'next');
		expect(yaml.load(readFileSync(filename, 'utf8'))).toEqual({
			...fields,
			track: 'branch/next',
		});
		expect(readFileSync(parent, 'utf8')).toBe(
			'name: parent\ntrack: branch/main\n'
		);
	});

	it('leaves matching tracking byte-for-byte unchanged', () => {
		const content =
			'# comment\nname: org/base\ntrack: branch/next\nroots: []\n';
		const filename = writeManifest(template.name, content);
		recordInstalledTemplateBranch(dir, template, 'next');
		expect(readFileSync(filename, 'utf8')).toBe(content);
	});

	it('records a remote URL only when the manifest has none', () => {
		const filename = writeManifest('base', 'name: base\nroots: []\n');
		recordInstalledTemplateBranch(dir, { ...template, name: 'remote' }, 'next');
		expect(yaml.load(readFileSync(filename, 'utf8'))).toEqual({
			name: 'base',
			roots: [],
			track: 'branch/next',
			url: template.url,
		});
	});

	it('rejects ambiguous remote metadata instead of modifying a dependency', () => {
		writeManifest('base', 'name: base\n');
		writeManifest('parent', 'name: parent\n');
		expect(() =>
			recordInstalledTemplateBranch(
				dir,
				{ ...template, name: 'remote' },
				'next'
			)
		).toThrow('Expected exactly one installed template');
	});

	it('rejects a missing template manifest', () => {
		writeManifest('other', 'name: other\n');
		expect(() => recordInstalledTemplateBranch(dir, template, 'next')).toThrow(
			'lacks its .remrg/installed manifest'
		);
	});

	it.each(['tag/v1', 'branch/next;echo unsafe', 'branch/--option', 'branch/'])(
		'rejects unsupported or unsafe tracking: %s',
		(track) => {
			expect(() =>
				getInstalledTemplateBranch('base', { name: 'base', roots: [], track })
			).toThrow();
		}
	);
});
