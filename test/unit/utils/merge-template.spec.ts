import { execFileSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { CommandRunner } from 'ts-script';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mergeTemplate } from '../../../src/utils/merge-template';

vi.mock('../../../src/host', () => ({
	getCachedTemplateNames: vi.fn(() => ['test-template']),
}));

describe('mergeTemplate', () => {
	let dir: string;
	let projectDir: string;
	let templateDir: string;
	let runner: CommandRunner;
	const template = {
		name: 'test-template',
		url: '',
		branch: 'main',
	};
	const remoteName = `remrg-${template.name}`;
	const cleanupCommand = `git remote remove ${remoteName}`;

	function git(cwd: string, ...args: string[]): string {
		return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: 'pipe' });
	}

	function merge(isExistingProject = true): void {
		mergeTemplate({
			runner,
			template: { ...template, url: templateDir },
			branch: 'main',
			isExistingProject,
		});
	}

	beforeEach(() => {
		dir = mkdtempSync(path.join(tmpdir(), 'remrg-merge-'));
		projectDir = path.join(dir, 'project');
		templateDir = path.join(dir, 'template');
		for (const cwd of [projectDir, templateDir]) {
			git(dir, 'init', '-q', '-b', 'main', cwd);
			git(cwd, 'config', 'user.name', 'Remrg Test');
			git(cwd, 'config', 'user.email', 'remrg-test@example.com');
			git(cwd, 'config', 'pull.rebase', 'false');
			git(cwd, 'commit', '--allow-empty', '-qm', 'Initial commit');
		}
		writeFileSync(path.join(templateDir, 'template.txt'), 'template\n');
		git(templateDir, 'add', '.');
		git(templateDir, 'commit', '-qm', 'Template content');

		runner = {
			dir: projectDir,
			log: { warn: vi.fn() },
			run: vi.fn((command: string) =>
				execFileSync('sh', ['-c', command], {
					cwd: projectDir,
					stdio: 'pipe',
				})
			),
		} as unknown as CommandRunner;
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	it.each([true, false])(
		'cleans up after success (existing project: %s)',
		(isExistingProject) => {
			merge(isExistingProject);

			expect(git(projectDir, 'remote')).toBe('');
			expect(readFileSync(path.join(projectDir, 'template.txt'), 'utf8')).toBe(
				'template\n'
			);
		}
	);

	it.each(['fetch', 'merge', 'pull'])(
		'cleans up and preserves the original %s error even if cleanup fails',
		(operation) => {
			const originalError = new Error(`${operation} failed`);
			const cleanupError = new Error('cleanup failed');
			const run = vi.mocked(runner.run).getMockImplementation()!;
			vi.mocked(runner.run).mockImplementation((command, options) => {
				if (
					typeof command === 'string' &&
					command.startsWith(`git ${operation} `)
				) {
					throw originalError;
				}
				const result = run(command, options);
				if (command === cleanupCommand) {
					throw cleanupError;
				}
				return result;
			});

			expect(() => merge(operation !== 'pull')).toThrow(originalError);
			expect(runner.run).toHaveBeenLastCalledWith(cleanupCommand, {
				loadingDescription: 'Cleaning up',
			});
			expect(git(projectDir, 'remote')).toBe('');
		}
	);

	it('reports cleanup failure after a successful merge', () => {
		const cleanupError = new Error('cleanup failed');
		const run = vi.mocked(runner.run).getMockImplementation()!;
		vi.mocked(runner.run).mockImplementation((command, options) => {
			if (command === cleanupCommand) {
				throw cleanupError;
			}
			return run(command, options);
		});

		expect(() => merge()).toThrow(cleanupError);
	});

	it.each([true, false])(
		'preserves an existing remote (operation succeeds: %s)',
		(succeeds) => {
			git(projectDir, 'remote', 'add', remoteName, templateDir);
			if (!succeeds) {
				template.branch = 'missing';
			}
			try {
				if (succeeds) {
					merge();
				}
				else {
					expect(() => merge()).toThrow();
				}
				expect(git(projectDir, 'remote', 'get-url', remoteName).trim()).toBe(
					templateDir
				);
				expect(runner.run).not.toHaveBeenCalledWith(
					cleanupCommand,
					expect.anything()
				);
			}
			finally {
				template.branch = 'main';
			}
		}
	);

	it('does not remove a remote when adding it fails', () => {
		const error = new Error('remote add failed');
		vi.mocked(runner.run).mockImplementationOnce(() => {
			throw error;
		});

		expect(() => merge()).toThrow(error);
		expect(runner.run).toHaveBeenCalledTimes(1);
	});

	it.each([true, false])(
		'removes the remote without aborting conflicts (existing project: %s)',
		(isExistingProject) => {
			writeFileSync(path.join(projectDir, 'template.txt'), 'project\n');
			git(projectDir, 'add', '.');
			git(projectDir, 'commit', '-qm', 'Conflicting project content');
			const head = git(projectDir, 'rev-parse', 'HEAD');

			expect(() => merge(isExistingProject)).toThrow();

			expect(git(projectDir, 'remote')).toBe('');
			expect(git(projectDir, 'rev-parse', 'HEAD')).toBe(head);
			expect(git(projectDir, 'rev-parse', 'MERGE_HEAD')).toBe(
				git(templateDir, 'rev-parse', 'HEAD')
			);
			expect(git(projectDir, 'status', '--porcelain')).toContain(
				'AA template.txt'
			);
			expect(
				readFileSync(path.join(projectDir, 'template.txt'), 'utf8')
			).toContain('<<<<<<< HEAD');
		}
	);
});
