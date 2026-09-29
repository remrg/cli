import { describe, it, expect } from 'vitest';
import { getInstalledTemplateSource } from '@/utils/remrg-installed/get-installed-template-source';

describe('getInstalledTemplateSource', () => {
	it('returns undefined when no url is set', () => {
		expect(
			getInstalledTemplateSource('base-code', { name: 'x', roots: [] })
		).toBeUndefined();
		expect(getInstalledTemplateSource('base-code')).toBeUndefined();
	});

	it('resolves ssh url and branch from track', () => {
		expect(
			getInstalledTemplateSource('@org/ui', {
				name: 'org/ui',
				url: 'git@github.com:Org/ui-template.git',
				track: 'branch/remrg/v1',
				roots: [],
			})
		).toEqual({
			name: '@org/ui',
			url: 'git@github.com:Org/ui-template.git',
			branch: 'remrg/v1',
		});
	});

	it('defaults branch to main for https urls', () => {
		expect(
			getInstalledTemplateSource('@org/ui', {
				name: 'org/ui',
				url: 'https://github.com/Org/ui-template.git',
				roots: [],
			})?.branch
		).toBe('main');
	});

	it('rejects urls with shell metacharacters', () => {
		expect(() =>
			getInstalledTemplateSource('@org/ui', {
				name: 'org/ui',
				url: 'https://github.com/x; rm -rf /',
				roots: [],
			})
		).toThrow('Invalid url');
	});

	it('rejects non-branch tracks', () => {
		expect(() =>
			getInstalledTemplateSource('@org/ui', {
				name: 'org/ui',
				url: 'https://github.com/Org/ui.git',
				track: 'tag/v1.0.0',
				roots: [],
			})
		).toThrow('Unsupported track');
	});
});
