import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommandRunner } from 'ts-script';
import { FetchedTemplate } from '../../../src/utils/fetch-template';
import { isAncestor } from '../../../src/utils/git/is-ancestor';
import { pruneRedundantTemplates } from '../../../src/utils/prune-redundant-templates';

vi.mock('../../../src/utils/git/is-ancestor', () => ({
	isAncestor: vi.fn(),
}));

function template(name: string, sha: string): FetchedTemplate {
	return { name, remoteName: name, ref: `${name}/main`, sha };
}

/**
 * Configure isAncestor from a set of "ancestor->descendant" pairs
 */
function ancestry(pairs: string[]): void {
	vi.mocked(isAncestor).mockImplementation((_dir, ancestor, descendant) =>
		pairs.includes(`${ancestor}->${descendant}`)
	);
}

describe('pruneRedundantTemplates', () => {
	let runner: CommandRunner;

	beforeEach(() => {
		vi.clearAllMocks();
		runner = {
			dir: '/project',
			log: { debug: vi.fn() },
		} as unknown as CommandRunner;
	});

	it('keeps templates with no shared history', () => {
		ancestry([]);
		const templates = [template('a', 'sha-a'), template('b', 'sha-b')];

		expect(pruneRedundantTemplates(runner, templates)).toEqual(templates);
	});

	it('drops a template whose tip is already in HEAD', () => {
		ancestry(['sha-a->HEAD']);
		const b = template('b', 'sha-b');

		expect(
			pruneRedundantTemplates(runner, [template('a', 'sha-a'), b])
		).toEqual([b]);
		expect(isAncestor).toHaveBeenCalledWith('/project', 'sha-a', 'HEAD');
	});

	it('keeps only the last template when two resolve to the same SHA', () => {
		ancestry([]);
		const root = template('root', 'sha-x');
		const alias = template('alias', 'sha-x');

		expect(pruneRedundantTemplates(runner, [root, alias])).toEqual([alias]);
	});

	it('drops a root template when a descendant template is present', () => {
		ancestry(['sha-root->sha-child']);
		const child = template('child', 'sha-child');

		expect(
			pruneRedundantTemplates(runner, [template('root', 'sha-root'), child])
		).toEqual([child]);
	});

	it('propagates isAncestor failures when checking HEAD', () => {
		vi.mocked(isAncestor).mockImplementation(() => {
			throw new Error('fatal: not a git repository');
		});

		expect(() =>
			pruneRedundantTemplates(runner, [template('a', 'sha-a')])
		).toThrow('fatal: not a git repository');
	});

	it('propagates isAncestor failures when checking containment', () => {
		vi.mocked(isAncestor).mockImplementation((_dir, _ancestor, descendant) => {
			if (descendant === 'HEAD') {
				return false;
			}

			throw new Error('fatal: bad object');
		});

		expect(() =>
			pruneRedundantTemplates(runner, [
				template('a', 'sha-a'),
				template('b', 'sha-b'),
			])
		).toThrow('fatal: bad object');
	});
});
