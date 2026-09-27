import { execFileSync } from 'child_process';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isAncestor } from '../../../../src/utils/git/is-ancestor';

vi.mock('child_process', () => ({
	execFileSync: vi.fn(),
}));

function gitError(status: number): Error {
	return Object.assign(new Error(`git exited with ${status}`), { status });
}

describe('isAncestor', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns true when git exits 0', () => {
		vi.mocked(execFileSync).mockReturnValue(Buffer.from(''));

		expect(isAncestor('/project', 'sha-a', 'HEAD')).toBe(true);
		expect(execFileSync).toHaveBeenCalledWith(
			'git',
			['merge-base', '--is-ancestor', 'sha-a', 'HEAD'],
			expect.objectContaining({ cwd: '/project' })
		);
	});

	it('returns false when git exits 1', () => {
		vi.mocked(execFileSync).mockImplementation(() => {
			throw gitError(1);
		});

		expect(isAncestor('/project', 'sha-a', 'HEAD')).toBe(false);
	});

	it('throws on unexpected git failures', () => {
		vi.mocked(execFileSync).mockImplementation(() => {
			throw gitError(128);
		});

		expect(() => isAncestor('/project', 'bad-sha', 'HEAD')).toThrow(
			'git exited with 128'
		);
	});

	it('throws when git cannot be spawned', () => {
		vi.mocked(execFileSync).mockImplementation(() => {
			throw Object.assign(new Error('spawn git ENOENT'), { code: 'ENOENT' });
		});

		expect(() => isAncestor('/project', 'sha-a', 'HEAD')).toThrow('ENOENT');
	});
});
