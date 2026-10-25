import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateCommand } from '../../src/commands/update';
import { getCachedTemplate } from '../../src/host';
import * as utils from '../../src/utils';

vi.mock('ts-script', () => ({
	CommandRunner: class {
		dir = '/project';
		log = { info: vi.fn(), warn: vi.fn() };
	},
}));

vi.mock('../../src/host', () => ({ getCachedTemplate: vi.fn() }));
vi.mock('../../src/utils', async (importOriginal) => {
	const original = await importOriginal<typeof import('../../src/utils')>();
	return {
		...original,
		getTemplateLineage: vi.fn(() => ['base']),
		loadInstalledTemplate: vi.fn(),
		fetchTemplate: vi.fn(),
		pruneRedundantTemplates: vi.fn(() => []),
		removeTemplateRemote: vi.fn(),
	};
});

describe('UpdateCommand branch compatibility', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getCachedTemplate).mockReturnValue({
			name: 'base',
			url: 'https://example.com/cached.git',
			branch: 'stable',
		});
		vi.mocked(utils.fetchTemplate).mockReturnValue({
			name: 'base',
			remoteName: 'remrg-base',
			ref: 'remrg-base/main',
			sha: 'abc',
		});
	});

	it.each([
		[undefined, undefined, null, 'stable'],
		['branch/legacy', undefined, null, 'legacy'],
		[undefined, 'https://example.com/custom.git', null, 'main'],
		['branch/legacy', 'https://example.com/custom.git', null, 'legacy'],
		['branch/legacy', undefined, 'next', 'next'],
		['branch/legacy', 'https://example.com/custom.git', 'next', 'next'],
	])(
		'resolves track %s, URL %s, override %s to %s',
		async (track, url, override, branch) => {
			vi.mocked(utils.loadInstalledTemplate).mockReturnValue({
				name: 'base',
				roots: [],
				track,
				url,
			});
			await new UpdateCommand().handle({ verbose: false, branch: override });
			expect(utils.fetchTemplate).toHaveBeenCalledWith({
				runner: expect.anything(),
				template: {
					name: 'base',
					url: url || 'https://example.com/cached.git',
					branch,
				},
				branch,
			});
		}
	);
});
