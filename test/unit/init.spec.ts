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
import { CreateCommand } from '../../src/commands/create';
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
		initProject: (...[runner, name]: Parameters<typeof utils.initProject>) => {
			utils.initProject(runner, name);
			git(path.join(runner.dir, name), 'config', 'user.name', 'Remrg Test');
			git(
				path.join(runner.dir, name),
				'config',
				'user.email',
				'remrg-test@example.com'
			);
		},
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
		expect(yaml.load(readFileSync(manifestPath, 'utf8'))).toEqual({
			...(yaml.load(manifest) as object),
			track: 'branch/next',
		});
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

	it.each([
		['init', null],
		['init', 'next'],
		['add', null],
		['add', 'next'],
		['create', null],
		['create', 'next'],
	])(
		'%s tracks its initial branch (%s) on update',
		async (command, override) => {
			templateDir = mkdtempSync(path.join(tmpdir(), 'remrg-template-'));
			const localTemplate = {
				name: 'integration-template',
				url: templateDir,
				branch: 'stable',
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
				`name: ${localTemplate.name}\ntrack: branch/legacy\ncustom: preserved\nroots: []\n`
			);
			writeFileSync(path.join(templateDir, 'template.txt'), 'version one\n');
			commitAll(templateDir, 'template v1');
			git(templateDir, 'branch', 'stable');
			git(templateDir, 'checkout', '-b', 'next');
			writeFileSync(
				path.join(templateDir, 'template.txt'),
				'next version one\n'
			);
			commitAll(templateDir, 'next v1');
			git(templateDir, 'checkout', override || 'stable');

			initializeGitRepository(projectDir);
			writeFileSync(path.join(projectDir, 'project.txt'), 'existing project\n');
			commitAll(projectDir, 'existing project');

			vi.mocked(utils.mergeTemplate).mockImplementationOnce((options) =>
				mergeTemplateImpl(options)
			);
			const installArgs = {
				...args,
				template: localTemplate.name,
				branch: override,
			};
			if (command === 'create') {
				// Keep the generated repository inside the test's temporary directory.
				await new CreateCommand().handle({
					...installArgs,
					name: 'created',
					org: 'example',
					license: 'MIT',
					templatize: false,
				});
				state.dir = path.join(projectDir, 'created');
			}
			else if (command === 'add') {
				await new AddCommand().handle(installArgs);
			}
			else {
				await new InitCommand().handle(installArgs);
			}

			const installedDir = state.dir;
			expect(utils.loadInstalledTemplateNames(installedDir)).toContain(
				localTemplate.name
			);
			expect(
				readFileSync(path.join(installedDir, 'template.txt'), 'utf8')
			).toBe(override ? 'next version one\n' : 'version one\n');
			expect(
				utils.loadInstalledTemplate(installedDir, localTemplate.name)
			).toMatchObject({
				track: `branch/${override || 'stable'}`,
				custom: 'preserved',
			});
			commitAll(installedDir, 'persist installation metadata');

			// A cache default change must not redirect an installed template.
			vi.mocked(getCachedTemplate).mockReturnValue({
				...localTemplate,
				branch: 'main',
			});
			if (command === 'add') {
				vi.mocked(utils.mergeTemplate).mockImplementationOnce(
					mergeTemplateImpl
				);
				await new AddCommand().handle({
					...installArgs,
					branch: null,
				});
				expect(utils.mergeTemplate).toHaveBeenLastCalledWith(
					expect.objectContaining({ branch: override || 'stable' })
				);
			}
			writeFileSync(path.join(templateDir, 'template.txt'), 'version two\n');
			commitAll(templateDir, 'template v2');
			await new UpdateCommand().handle({ verbose: false, branch: null });

			expect(
				readFileSync(path.join(installedDir, 'template.txt'), 'utf8')
			).toBe('version two\n');
		}
	);
});

function initializeGitRepository(dir: string): void {
	git(dir, 'init', '-q', '-b', 'main');
	git(dir, 'config', 'user.name', 'Remrg Test');
	git(dir, 'config', 'user.email', 'remrg-test@example.com');
}

function commitAll(dir: string, message: string): void {
	git(dir, 'add', '.');
	git(dir, 'commit', '--allow-empty', '-m', message);
}

function git(dir: string, ...args: string[]): void {
	execFileSync('git', args, { cwd: dir, stdio: 'ignore' });
}
