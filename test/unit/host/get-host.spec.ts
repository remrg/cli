import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getHost } from '@/host/get-host';
import { env } from '@/env';
import { GithubHost } from '@/host/hosts/github';

vi.mock('@/env', () => ({
	env: {
		REMRG_HOST: 'github',
	},
}));

describe('getHost', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return GithubHost when REMRG_HOST is github', async () => {
		// @ts-expect-error - overriding readonly for testing
		env.REMRG_HOST = 'github';
		const host = await getHost();
		expect(host).toBeInstanceOf(GithubHost);
	});

	it('should throw an error for unsupported host', async () => {
		// @ts-expect-error - overriding readonly for testing
		env.REMRG_HOST = 'gitlab';
		await expect(getHost()).rejects.toThrow('Unsupported host: gitlab');
	});
});
