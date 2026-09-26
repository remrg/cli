import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AddCommand } from '../../src/commands/add';
import { getCachedTemplate } from '../../src/host';
import * as utils from '../../src/utils';

vi.mock('ts-script', () => ({
	CommandRunner: class {
		dir = '/project';
	},
}));

vi.mock('../../src/host', () => ({
	getCachedTemplate: vi.fn(),
}));

vi.mock('../../src/utils', async (importOriginal) => {
	const utils = await importOriginal<typeof import('../../src/utils')>();
	return { ...utils, mergeTemplate: vi.fn() };
});

describe('AddCommand', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('merges a cached template into the current project', async () => {
		const template = {
			name: 'remrg/base',
			url: 'https://example.com/base.git',
			branch: 'main',
		};
		vi.mocked(getCachedTemplate).mockReturnValue(template);

		await new AddCommand().handle({
			template: template.name,
			branch: null,
			verbose: false,
		});

		expect(utils.mergeTemplate).toHaveBeenCalledWith({
			runner: expect.objectContaining({ dir: '/project' }),
			template,
			branch: 'main',
			isExistingProject: true,
		});
	});

	it('uses the requested branch', async () => {
		const template = {
			name: 'remrg/base',
			url: 'https://example.com/base.git',
			branch: 'main',
		};
		vi.mocked(getCachedTemplate).mockReturnValue(template);

		await new AddCommand().handle({
			template: template.name,
			branch: 'next',
			verbose: false,
		});

		expect(utils.mergeTemplate).toHaveBeenCalledWith({
			runner: expect.objectContaining({ dir: '/project' }),
			template: { ...template, branch: 'next' },
			branch: 'next',
			isExistingProject: true,
		});
	});

	it('throws when the template is not cached', async () => {
		vi.mocked(getCachedTemplate).mockReturnValue(undefined);

		await expect(
			new AddCommand().handle({
				template: 'missing',
				branch: null,
				verbose: false,
			})
		).rejects.toThrow('Template "missing" not found');
	});
});
