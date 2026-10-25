import { execFileSync } from 'child_process';
import {
	existsSync,
	mkdtempSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import path from 'path';

import * as yaml from 'js-yaml';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { InitCommand } from '../../src/commands/init';
import { UpdateCommand } from '../../src/commands/update';
import { getCachedTemplate } from '../../src/host';
import * as utils from '../../src/utils';
import { mergeTemplate as mergeTemplateImpl } from '../../src/utils/merge-template';

const { state } = vi.hoisted(() => ({
	state: { dir: '', cachedNames: [] as string[] },
}));

vi.mock('ts-script', () => ({
	CommandRunner: class {
		dir = state.dir;
		log = {
			info: vi.fn(),
			warn: vi.fn(),
			debug: vi.fn(),
			error: vi.fn(),
		};

		run(command: string | (() => unknown), options?: { dir?: string }) {
			if (typeof command === 'function') {
				return command();
			}

			return execFileSync('sh', ['-c', command], {
				cwd: options?.dir ? path.join(this.dir, options.dir) : this.dir,
				stdio: 'ignore',
			});
		}
	},
}));

vi.mock('../../src/host', () => ({
	getCachedTemplate: vi.fn(),
	getCachedTemplateNames: vi.fn(() => state.cachedNames),
}));

vi.mock('../../src/utils', async (importOriginal) => {
	const utils = await importOriginal<typeof import('../../src/utils')>();
	return {
		...utils,
		mergeTemplate: vi.fn(),
	};
});

describe('InitCommand', () => {
	let projectDir: string;
	let templateDir: string | undefined;

	beforeEach(() => {
		vi.clearAllMocks();
		projectDir = mkdtempSync(path.join(tmpdir(), 'remrg-init-'));
		state.dir = projectDir;
		state.cachedNames = [template.name];
	});

	afterEach(() => {
		rmSync(projectDir, { recursive: true, force: true });
		if (templateDir) {
			rmSync(templateDir, { recursive: true, force: true });
			templateDir = undefined;
		}
	});

	const args = {
		template: '@remrg/base',
		branch: null,
		org: null,
		license: null,
		verbose: false,
		remote: null,
		continue: false,
	};

	const template = {
		name: '@remrg/base',
		url: 'https://example.com/base.git',
		branch: 'main',
	};

	it('preserves merged template manifests and writes project metadata', async () => {
		execFileSync('git', ['init', '-q'], { cwd: projectDir });
		vi.mocked(getCachedTemplate).mockReturnValue(template);
		const manifestPath = path.join(
			projectDir,
			'.remrg/installed',
			template.name,
			'remrg.yml'
		);
		const manifest = yaml.dump({
			name: template.name,
			url: template.url,
			track: 'branch/main',
			version: '2.3.0',
			description: 'Template-provided metadata',
			license: 'Apache-2.0',
			access: 'public',
			roots: ['base-code'],
			custom: 'preserve this too',
		});
		vi.mocked(utils.mergeTemplate).mockImplementationOnce(() => {
			mkdirSync(path.dirname(manifestPath), { recursive: true });
			writeFileSync(manifestPath, manifest);
		});

		await new InitCommand().handle({
			...args,
			branch: 'next',
			org: 'example',
			license: 'MIT',
		});

		expect(utils.mergeTemplate).toHaveBeenCalledWith({
			runner: expect.objectContaining({ dir: projectDir }),
			template: { ...template, branch: 'next' },
			branch: 'next',
			isExistingProject: true,
		});
		expect(readFileSync(manifestPath, 'utf8')).toBe(manifest);
		expect(utils.loadInstalledTemplateNames(projectDir)).toEqual([
			template.name,
		]);
		expect(
			yaml.load(
				readFileSync(path.join(projectDir, '.remrg/placeholders.yaml'), 'utf8')
			)
		).toEqual({
			name: path.basename(projectDir),
			organization: 'example',
			license: 'MIT',
		});
	});

	it('rejects templates without updateable installed metadata', async () => {
		execFileSync('git', ['init', '-q'], { cwd: projectDir });
		vi.mocked(getCachedTemplate).mockReturnValue(template);

		await expect(new InitCommand().handle(args)).rejects.toThrow(
			'Template "@remrg/base" lacks .remrg/installed metadata.'
		);

		expect(existsSync(path.join(projectDir, '.remrg/installed'))).toBe(false);
		expect(existsSync(path.join(projectDir, '.remrg/placeholders.yaml'))).toBe(
			false
		);
	});

	it('rejects directories that are not Git repositories', async () => {
		vi.mocked(getCachedTemplate).mockReturnValue(template);

		await expect(new InitCommand().handle(args)).rejects.toThrow(
			'The current directory is not a Git repository.'
		);
		expect(utils.mergeTemplate).not.toHaveBeenCalled();
	});

	it('rejects repositories that already have remrg metadata', async () => {
		execFileSync('git', ['init', '-q'], { cwd: projectDir });
		mkdirSync(path.join(projectDir, '.remrg'));
		vi.mocked(getCachedTemplate).mockReturnValue(template);

		await expect(new InitCommand().handle(args)).rejects.toThrow(
			'This repository already contains .remrg metadata.'
		);
		expect(utils.mergeTemplate).not.toHaveBeenCalled();
	});

	it('requires the Git repository root as the working directory', async () => {
		execFileSync('git', ['init', '-q'], { cwd: projectDir });
		const subdirectory = path.join(projectDir, 'src');
		mkdirSync(subdirectory);
		state.dir = subdirectory;
		vi.mocked(getCachedTemplate).mockReturnValue(template);

		await expect(new InitCommand().handle(args)).rejects.toThrow(
			'Run "remrg init" from the Git repository root.'
		);
		expect(utils.mergeTemplate).not.toHaveBeenCalled();
	});

	it('rejects a missing cached template', async () => {
		execFileSync('git', ['init', '-q'], { cwd: projectDir });
		vi.mocked(getCachedTemplate).mockReturnValue(undefined);

		await expect(new InitCommand().handle(args)).rejects.toThrow(
			'Template "@remrg/base" not found'
		);
	});

	it('initializes a remote template using the requested branch', async () => {
		execFileSync('git', ['init', '-q'], { cwd: projectDir });
		const remoteTemplate = {
			name: 'remote',
			url: 'https://example.com/template.git',
			branch: 'next',
		};
		vi.mocked(utils.mergeTemplate).mockImplementationOnce(() => {
			const manifestPath = path.join(
				projectDir,
				'.remrg/installed/remote-template/remrg.yml'
			);
			mkdirSync(path.dirname(manifestPath), { recursive: true });
			writeFileSync(
				manifestPath,
				'name: remote-template\ntrack: branch/next\nroots: []\n'
			);
		});

		await new InitCommand().handle({
			...args,
			template: 'remote',
			remote: remoteTemplate.url,
			branch: 'next',
		});

		expect(utils.mergeTemplate).toHaveBeenCalledWith({
			runner: expect.objectContaining({ dir: projectDir }),
			template: remoteTemplate,
			branch: 'next',
			isExistingProject: true,
		});
	});

	it('initializes then updates a Git project from its template', async () => {
		templateDir = mkdtempSync(path.join(tmpdir(), 'remrg-template-'));
		const localTemplate = {
			name: 'integration-template',
			url: templateDir,
			branch: 'main',
		};
		state.cachedNames = [localTemplate.name];
		vi.mocked(getCachedTemplate).mockReturnValue(localTemplate);

		initializeGitRepository(templateDir);
		const manifestDir = path.join(
			templateDir,
			'.remrg/installed',
			localTemplate.name
		);
		mkdirSync(manifestDir, { recursive: true });
		writeFileSync(
			path.join(manifestDir, 'remrg.yml'),
			`name: ${localTemplate.name}\ntrack: branch/main\nroots: []\n`
		);
		writeFileSync(path.join(templateDir, 'template.txt'), 'version one\n');
		commitAll(templateDir, 'template v1');

		initializeGitRepository(projectDir);
		writeFileSync(path.join(projectDir, 'project.txt'), 'existing project\n');
		commitAll(projectDir, 'existing project');

		vi.mocked(utils.mergeTemplate).mockImplementationOnce((options) =>
			mergeTemplateImpl(options)
		);
		await new InitCommand().handle({
			...args,
			template: localTemplate.name,
		});

		expect(utils.loadInstalledTemplateNames(projectDir)).toContain(
			localTemplate.name
		);
		expect(readFileSync(path.join(projectDir, 'template.txt'), 'utf8')).toBe(
			'version one\n'
		);
		expect(existsSync(path.join(projectDir, '.remrg/placeholders.yaml'))).toBe(
			true
		);

		writeFileSync(path.join(templateDir, 'template.txt'), 'version two\n');
		commitAll(templateDir, 'template v2');
		await new UpdateCommand().handle({ verbose: false, branch: null });

		expect(readFileSync(path.join(projectDir, 'template.txt'), 'utf8')).toBe(
			'version two\n'
		);
	});

	it('preserves conflicts until the user finishes the merge', async () => {
		const localTemplate = prepareRecoveryRepositories();
		writeFileSync(path.join(templateDir!, 'shared.txt'), 'template\n');
		commitAll(templateDir!, 'conflicting template');
		writeFileSync(path.join(projectDir, 'shared.txt'), 'project\n');
		commitAll(projectDir, 'project work');
		writeFileSync(path.join(projectDir, 'project.txt'), 'uncommitted work\n');
		writeFileSync(path.join(projectDir, 'untracked.txt'), 'keep me\n');
		const originalHead = readGit('rev-parse', 'HEAD');
		const initArgs = { ...args, template: localTemplate.name };
		vi.mocked(utils.mergeTemplate).mockImplementation(mergeTemplateImpl);

		await expect(new InitCommand().handle(initArgs)).rejects.toThrow(
			'No changes have been rolled back'
		);
		const conflict = readFileSync(path.join(projectDir, 'shared.txt'), 'utf8');
		const mergeHead = readGit('rev-parse', 'MERGE_HEAD');
		expect(conflict).toContain('<<<<<<<');
		expect(readGit('rev-parse', 'HEAD')).toBe(originalHead);
		const status = readGit('status', '--porcelain');
		expect(status).toContain(' M project.txt');
		expect(status).toContain('?? untracked.txt');

		for (const continuation of [false, true]) {
			await expect(
				new InitCommand().handle({ ...initArgs, continue: continuation })
			).rejects.toThrow('Resolve conflicts and finish any merge');
			expect(readGit('status', '--porcelain')).toBe(status);
			expect(readGit('rev-parse', 'MERGE_HEAD')).toBe(mergeHead);
			expect(readFileSync(path.join(projectDir, 'shared.txt'), 'utf8')).toBe(
				conflict
			);
		}

		writeFileSync(path.join(projectDir, 'shared.txt'), 'resolved by user\n');
		git(projectDir, 'add', 'shared.txt');
		await expect(
			new InitCommand().handle({ ...initArgs, continue: true })
		).rejects.toThrow('An unfinished merge');
		git(projectDir, 'commit', '-m', 'resolve init merge');
		const resolvedHead = readGit('rev-parse', 'HEAD');
		await new InitCommand().handle({
			...initArgs,
			continue: true,
			org: 'example',
		});

		expect(utils.mergeTemplate).toHaveBeenCalledTimes(1);
		expect(readGit('rev-parse', 'HEAD')).toBe(resolvedHead);
		expect(readFileSync(path.join(projectDir, 'project.txt'), 'utf8')).toBe(
			'uncommitted work\n'
		);
		expect(readFileSync(path.join(projectDir, 'untracked.txt'), 'utf8')).toBe(
			'keep me\n'
		);
		expect(
			readFileSync(path.join(projectDir, '.remrg/placeholders.yaml'), 'utf8')
		).toContain('example');
	});

	it.each(['missing', 'invalid'])(
		'recovers from a %s installed manifest without merging again',
		async (failure) => {
			const localTemplate = prepareRecoveryRepositories();
			const manifestPath = path.join(
				projectDir,
				'.remrg/installed',
				localTemplate.name,
				'remrg.yml'
			);
			const templateManifest = path.join(
				templateDir!,
				'.remrg/installed',
				localTemplate.name,
				'remrg.yml'
			);
			if (failure === 'missing') {
				rmSync(templateManifest);
				writeFileSync(
					path.join(path.dirname(templateManifest), 'README.txt'),
					'Manifest missing\n'
				);
			}
			else {
				writeFileSync(templateManifest, 'name: [invalid\n');
			}
			commitAll(templateDir!, 'broken metadata');
			const originalHead = readGit('rev-parse', 'HEAD');
			const initArgs = { ...args, template: localTemplate.name };
			vi.mocked(utils.mergeTemplate).mockImplementation(mergeTemplateImpl);

			await expect(new InitCommand().handle(initArgs)).rejects.toThrow(
				'then rerun the same init command with --continue'
			);
			const mergedHead = readGit('rev-parse', 'HEAD');
			expect(mergedHead).not.toBe(originalHead);
			expect(readGit('show', 'HEAD:project.txt')).toBe('existing project\n');
			expect(readGit('show', 'HEAD:template.txt')).toBe('template work\n');
			expect(
				existsSync(path.join(projectDir, '.remrg/placeholders.yaml'))
			).toBe(false);

			await expect(new InitCommand().handle(initArgs)).rejects.toThrow(
				'--continue'
			);
			await expect(
				new InitCommand().handle({ ...initArgs, continue: true })
			).rejects.toThrow('repair .remrg/installed manifests');
			expect(readGit('rev-parse', 'HEAD')).toBe(mergedHead);

			mkdirSync(path.dirname(manifestPath), { recursive: true });
			const manifest =
				`name: ${localTemplate.name}\n` + 'track: branch/main\nroots: []\n';
			writeFileSync(manifestPath, manifest);
			await new InitCommand().handle({
				...initArgs,
				continue: true,
				org: 'recovered',
				license: 'MIT',
			});
			const placeholders = readFileSync(
				path.join(projectDir, '.remrg/placeholders.yaml'),
				'utf8'
			);
			expect(yaml.load(placeholders)).toEqual({
				name: path.basename(projectDir),
				organization: 'recovered',
				license: 'MIT',
			});
			await new InitCommand().handle({
				...initArgs,
				continue: true,
				org: 'different',
			});
			expect(
				readFileSync(path.join(projectDir, '.remrg/placeholders.yaml'), 'utf8')
			).toBe(placeholders);
			expect(readFileSync(manifestPath, 'utf8')).toBe(manifest);
			expect(readGit('rev-parse', 'HEAD')).toBe(mergedHead);
			expect(utils.mergeTemplate).toHaveBeenCalledTimes(1);
		}
	);

	it('rejects continuation without installed metadata without writing files', async () => {
		initializeGitRepository(projectDir);
		vi.mocked(getCachedTemplate).mockReturnValue(template);
		await expect(
			new InitCommand().handle({ ...args, continue: true })
		).rejects.toThrow('repair .remrg/installed manifests');
		expect(utils.mergeTemplate).not.toHaveBeenCalled();
		expect(existsSync(path.join(projectDir, '.remrg'))).toBe(false);
	});

	it('preserves staged and untracked work when Git refuses to merge', async () => {
		const localTemplate = prepareRecoveryRepositories();
		writeFileSync(path.join(projectDir, 'project.txt'), 'staged work\n');
		git(projectDir, 'add', 'project.txt');
		writeFileSync(path.join(projectDir, 'untracked.txt'), 'untracked work\n');
		const head = readGit('rev-parse', 'HEAD');
		const status = readGit('status', '--porcelain');
		const staged = readGit('diff', '--cached');
		vi.mocked(utils.mergeTemplate).mockImplementation(mergeTemplateImpl);

		await expect(
			new InitCommand().handle({ ...args, template: localTemplate.name })
		).rejects.toThrow('No changes have been rolled back');
		expect(readGit('rev-parse', 'HEAD')).toBe(head);
		expect(readGit('status', '--porcelain')).toBe(status);
		expect(readGit('diff', '--cached')).toBe(staged);
		expect(readFileSync(path.join(projectDir, 'untracked.txt'), 'utf8')).toBe(
			'untracked work\n'
		);
	});

	function prepareRecoveryRepositories() {
		templateDir = mkdtempSync(path.join(tmpdir(), 'remrg-recovery-template-'));
		const localTemplate = {
			name: 'recovery-template',
			url: templateDir,
			branch: 'main',
		};
		state.cachedNames = [localTemplate.name];
		vi.mocked(getCachedTemplate).mockReturnValue(localTemplate);
		initializeGitRepository(templateDir);
		const manifestDir = path.join(
			templateDir,
			'.remrg/installed',
			localTemplate.name
		);
		mkdirSync(manifestDir, { recursive: true });
		writeFileSync(
			path.join(manifestDir, 'remrg.yml'),
			`name: ${localTemplate.name}\ntrack: branch/main\nroots: []\n`
		);
		writeFileSync(path.join(templateDir, 'template.txt'), 'template work\n');
		commitAll(templateDir, 'template');
		initializeGitRepository(projectDir);
		writeFileSync(path.join(projectDir, 'project.txt'), 'existing project\n');
		commitAll(projectDir, 'existing project');
		return localTemplate;
	}

	function readGit(...args: string[]): string {
		return execFileSync('git', args, { cwd: projectDir, encoding: 'utf8' });
	}
});

function initializeGitRepository(dir: string): void {
	git(dir, 'init', '-q', '-b', 'main');
	git(dir, 'config', 'user.name', 'Remrg Test');
	git(dir, 'config', 'user.email', 'remrg-test@example.com');
}

function commitAll(dir: string, message: string): void {
	git(dir, 'add', '.');
	git(dir, 'commit', '-m', message);
}

function git(dir: string, ...args: string[]): void {
	execFileSync('git', args, { cwd: dir, stdio: 'ignore' });
}
