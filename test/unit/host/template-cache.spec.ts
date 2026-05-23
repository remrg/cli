import { describe, it, expect, vi } from 'vitest';
import {
	initializeCache,
	cacheTemplates,
	getCachedTemplateNames,
	getCachedTemplates,
	getCachedTemplate,
} from '@/host/template-cache';
import { getHost } from '@/host/get-host';

vi.mock('@/host/get-host');

describe('template-cache', () => {
	it('should cache and retrieve templates', () => {
		const templates = [
			{ name: 'template1', url: 'url1', branch: 'main' },
			{ name: 'template2', url: 'url2', branch: 'develop' },
		];

		cacheTemplates(templates);

		expect(getCachedTemplateNames()).toEqual(['template1', 'template2']);
		expect(getCachedTemplates()).toEqual(templates);
		expect(getCachedTemplate('template1')).toEqual(templates[0]);
		expect(getCachedTemplate('non-existent')).toBeUndefined();
	});

	it('should initialize cache', async () => {
		const templates = [{ name: 'template3', url: 'url3', branch: 'main' }];
		const mockHost = {
			getTemplates: vi.fn().mockResolvedValue(templates),
		};
		vi.mocked(getHost).mockResolvedValue(mockHost);

		await initializeCache();

		expect(getCachedTemplate('template3')).toEqual(templates[0]);
	});
});
