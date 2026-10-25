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
import { AddCommand } from '../../src/commands/add';
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
		continue: false,
		template: '@remrg/base',
		branch: null,
		org: null,
		license: null,
		verbose: false,
		remote: null,
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

	describe.each(['init', 'add'] as const)('%s --continue', (commandName) => {
		const command = () =>
			commandName === 'init' ? new InitCommand() : new AddCommand();

		async function interruptMerge(remote = false) {
			templateDir = mkdtempSync(path.join(tmpdir(), 'remrg-conflict-'));
			const localTemplate = {
				name: 'conflict-template',
				url: templateDir,
				branch: 'next',
			};
			state.cachedNames = [localTemplate.name];
			vi.mocked(getCachedTemplate).mockReturnValue(localTemplate);
			initializeGitRepository(templateDir);
			git(templateDir, 'checkout', '-b', 'next');
			const manifestDir = path.join(
				templateDir,
				'.remrg/installed',
				localTemplate.name
			);
			mkdirSync(manifestDir, { recursive: true });
			writeFileSync(
				path.join(manifestDir, 'remrg.yml'),
				`name: ${localTemplate.name}\ntrack: branch/next\nroots: []\n`
			);
			writeFileSync(path.join(templateDir, 'conflict.txt'), 'template\n');
			commitAll(templateDir, 'template');

			initializeGitRepository(projectDir);
			writeFileSync(path.join(projectDir, 'conflict.txt'), 'project\n');
			commitAll(projectDir, 'project');

			const resumeArgs = {
				...args,
				template: remote ? 'remote' : localTemplate.name,
				remote: remote ? templateDir : null,
				branch: 'next',
				org: 'example',
				license: 'MIT',
				continue: true,
			};
			vi.mocked(utils.mergeTemplate).mockImplementationOnce(mergeTemplateImpl);
			await expect(
				command().handle({ ...resumeArgs, continue: false })
			).rejects.toThrow();
			expect(existsSync(path.join(projectDir, '.git/MERGE_HEAD'))).toBe(true);
			return resumeArgs;
		}

		it('resumes committed merges without fetching or merging', async () => {
			const resumeArgs = await interruptMerge();
			await expect(command().handle(resumeArgs)).rejects.toThrow(
				'Resolve all merge conflicts and commit'
			);

			const mergeHeadPath = path.join(projectDir, '.git/MERGE_HEAD');
			const mergeHead = readFileSync(mergeHeadPath);
			rmSync(mergeHeadPath);
			await expect(command().handle(resumeArgs)).rejects.toThrow(
				'Resolve all merge conflicts and commit'
			);
			writeFileSync(mergeHeadPath, mergeHead);

			writeFileSync(path.join(projectDir, 'conflict.txt'), 'resolved\n');
			git(projectDir, 'add', '.');
			await expect(command().handle(resumeArgs)).rejects.toThrow(
				'Resolve all merge conflicts and commit'
			);

			git(projectDir, 'commit', '-m', 'resolved template merge');
			vi.mocked(utils.mergeTemplate).mockClear();
			// The remote is unavailable: continuation must not fetch it again.
			rmSync(templateDir!, { recursive: true, force: true });
			await command().handle(resumeArgs);

			expect(utils.mergeTemplate).not.toHaveBeenCalled();
			expect(readFileSync(path.join(projectDir, 'conflict.txt'), 'utf8')).toBe(
				'resolved\n'
			);
			expect(
				utils.loadInstalledTemplate(projectDir, resumeArgs.template)
			).toMatchObject({
				name: resumeArgs.template,
				track: 'branch/next',
			});
			expect(
				execFileSync('git', ['remote'], {
					cwd: projectDir,
					encoding: 'utf8',
				}).trim()
			).toBe('');
			if (commandName === 'init') {
				expect(
					yaml.load(
						readFileSync(
							path.join(projectDir, '.remrg/placeholders.yaml'),
							'utf8'
						)
					)
				).toEqual({
					name: path.basename(projectDir),
					organization: 'example',
					license: 'MIT',
				});
			}
			await expect(command().handle(resumeArgs)).rejects.toThrow(
				'No completed template merge found'
			);
		});

		it('rejects continuation without prior template state', async () => {
			initializeGitRepository(projectDir);
			vi.mocked(getCachedTemplate).mockReturnValue(template);
			await expect(
				command().handle({ ...args, continue: true })
			).rejects.toThrow('No completed template merge found');
			expect(utils.mergeTemplate).not.toHaveBeenCalled();
		});

		it('rejects aborted merges even with a fetched remote', async () => {
			const resumeArgs = await interruptMerge();
			git(projectDir, 'merge', '--abort');
			await expect(command().handle(resumeArgs)).rejects.toThrow(
				'No completed template merge found'
			);
		});

		it('retains recovery state if merged metadata is missing', async () => {
			const resumeArgs = await interruptMerge();
			writeFileSync(path.join(projectDir, 'conflict.txt'), 'resolved\n');
			rmSync(path.join(projectDir, '.remrg'), { recursive: true });
			commitAll(projectDir, 'resolved without metadata');
			await expect(command().handle(resumeArgs)).rejects.toThrow(
				'Cannot continue: .remrg/installed metadata is missing'
			);
			expect(
				execFileSync('git', ['remote'], { cwd: projectDir, encoding: 'utf8' })
			).toContain(`remrg-${resumeArgs.template}`);
		});

		it('requires the original branch and matching installed manifest', async () => {
			const resumeArgs = await interruptMerge();
			writeFileSync(path.join(projectDir, 'conflict.txt'), 'resolved\n');
			commitAll(projectDir, 'resolved');
			await expect(
				command().handle({ ...resumeArgs, branch: 'wrong' })
			).rejects.toThrow('Use the original template and --branch options');
			rmSync(
				path.join(
					projectDir,
					'.remrg/installed',
					resumeArgs.template,
					'remrg.yml'
				)
			);
			await expect(command().handle(resumeArgs)).rejects.toThrow(
				'installed manifest for "conflict-template" is missing'
			);
			writeFileSync(
				path.join(
					projectDir,
					'.remrg/installed',
					resumeArgs.template,
					'remrg.yml'
				),
				'roots: []\n'
			);
			await expect(command().handle(resumeArgs)).rejects.toThrow(
				'Invalid template manifest'
			);
		});

		if (commandName === 'init') {
			it('continues a remote template using its installed name', async () => {
				const resumeArgs = await interruptMerge(true);
				writeFileSync(path.join(projectDir, 'conflict.txt'), 'resolved\n');
				commitAll(projectDir, 'resolved');
				await command().handle(resumeArgs);
				expect(
					existsSync(path.join(projectDir, '.remrg/placeholders.yaml'))
				).toBe(true);
				expect(utils.loadInstalledTemplateNames(projectDir)).toEqual([
					'conflict-template',
				]);
			});
		}
	});
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
