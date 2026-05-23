import * as https from 'https';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GithubHost } from '@/host/hosts/github';
import { env } from '@/env';

vi.mock('https', () => ({
	get: vi.fn(),
}));

vi.mock('@/env', () => ({
	env: {
		REMRG_GITHUB_ORG: 'test-org',
	},
}));

describe('GithubHost', () => {
	beforeEach(() => {
		// @ts-expect-error - overriding readonly for testing
		env.REMRG_GITHUB_ORG = 'test-org';
	});

	it('should fetch templates from github API correctly', async () => {
		const host = new GithubHost();

		const mockResponse = [
			{
				name: 'repo1',
				html_url: 'https://github.com/test-org/repo1',
				default_branch: 'main',
			},
		];

		const mockReq = {
			on: vi.fn().mockReturnThis(),
		};

		vi.mocked(https.get).mockImplementation((url, options, callback) => {
			if (callback) {
				const res = {
					statusCode: 200,
					on: vi.fn((event, cb) => {
						if (event === 'data') {
							cb(JSON.stringify(mockResponse));
						}
						else if (event === 'end') {
							cb();
						}
						return res;
					}),
				};
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				callback(res as any);
			}
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			return mockReq as any;
		});

		const templates = await host.getTemplates();

		expect(https.get).toHaveBeenCalledWith(
			'https://api.github.com/orgs/test-org/repos',
			{
				headers: {
					Accept: 'application/vnd.github+json',
					'X-GitHub-Api-Version': '2026-03-10',
					'User-Agent': 'undefined',
				},
			},
			expect.any(Function)
		);

		expect(templates).toEqual([
			{
				name: 'repo1',
				url: 'https://github.com/test-org/repo1',
				branch: 'main',
			},
		]);
	});

	it('should reject when API returns status >= 400', async () => {
		const host = new GithubHost();

		const mockReq = {
			on: vi.fn().mockReturnThis(),
		};

		vi.mocked(https.get).mockImplementation((url, options, callback) => {
			if (callback) {
				const res = {
					statusCode: 404,
					on: vi.fn((event, cb) => {
						if (event === 'end') {
							cb();
						}
						return res;
					}),
				};
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				callback(res as any);
			}
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			return mockReq as any;
		});

		await expect(host.getTemplates()).rejects.toThrow('Error 404');
	});

	it('should reject on invalid JSON response', async () => {
		const host = new GithubHost();

		const mockReq = {
			on: vi.fn().mockReturnThis(),
		};

		vi.mocked(https.get).mockImplementation((url, options, callback) => {
			if (callback) {
				const res = {
					statusCode: 200,
					on: vi.fn((event, cb) => {
						if (event === 'data') {
							cb('invalid json');
						}
						else if (event === 'end') {
							cb();
						}
						return res;
					}),
				};
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				callback(res as any);
			}
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			return mockReq as any;
		});

		await expect(host.getTemplates()).rejects.toThrow(SyntaxError);
	});

	it('should reject on network error', async () => {
		const host = new GithubHost();

		const mockReq = {
			on: vi.fn((event, cb) => {
				if (event === 'error') {
					cb(new Error('Network error'));
				}
				return mockReq;
			}),
		};

		vi.mocked(https.get).mockImplementation(() => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			return mockReq as any;
		});

		await expect(host.getTemplates()).rejects.toThrow('Network error');
	});
});
