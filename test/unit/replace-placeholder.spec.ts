import { describe, it, expect, vi, beforeEach } from 'vitest';
import { replacePlaceholder } from '@/utils/replace-placeholder';
import { replaceInFileSync } from 'replace-in-file';

vi.mock('replace-in-file', () => ({
	replaceInFileSync: vi.fn(),
}));

describe('replacePlaceholder', () => {
	const mockRun = vi.fn((fn: () => void) => fn());
	const mockRunner = {
		dir: '/some/project',
		run: mockRun,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should call replaceInFileSync with dot: true to include dot-files', () => {
		replacePlaceholder(mockRunner as never, 'project-name', 'my-app');

		expect(replaceInFileSync).toHaveBeenCalledWith(
			expect.objectContaining({
				glob: { dot: true },
			})
		);
	});

	it('should match the correct placeholder pattern', () => {
		replacePlaceholder(mockRunner as never, 'organization', 'my-org');

		expect(replaceInFileSync).toHaveBeenCalledWith(
			expect.objectContaining({
				from: expect.any(RegExp),
				to: 'my-org',
			})
		);

		const call = vi.mocked(replaceInFileSync).mock.calls[0][0];
		expect((call.from as RegExp).source).toBe(
			'{{ remrg:var organization }}'
		);
	});
});
