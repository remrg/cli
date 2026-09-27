import { CommandRunner } from 'ts-script';

import { FetchedTemplate } from './fetch-template';
import { isAncestor } from './git/is-ancestor';

/**
 * Drop templates whose commits are already in the project's history.
 *
 * Two kinds of merges are redundant:
 *
 * 1. The template tip is already reachable from HEAD (nothing new to merge)
 * 2. The template tip is already contained in another template being merged
 *    (a descendant template already carries its roots' commits)
 *
 * Merging these anyway produces empty merge commits and inflates history.
 *
 * @param runner Command runner
 * @param templates Fetched templates, roots first
 * @returns Only the templates that actually contribute new commits
 */
export function pruneRedundantTemplates(
	runner: CommandRunner,
	templates: FetchedTemplate[]
): FetchedTemplate[] {
	const dir = runner.dir;

	// Templates are roots first, so the last entry for a shared commit is the
	// most specific template name
	const lastIndexBySha = new Map<string, number>();

	templates.forEach((template, index) =>
		lastIndexBySha.set(template.sha, index)
	);

	const unmerged = templates.filter((template, index) => {
		if (isAncestor(dir, template.sha, 'HEAD')) {
			runner.log.debug(
				`Skipping ${template.name}: already up to date in this project`
			);

			return false;
		}

		if (lastIndexBySha.get(template.sha) !== index) {
			runner.log.debug(
				`Skipping ${template.name}: duplicate of another template's commit`
			);

			return false;
		}

		return true;
	});

	return unmerged.filter((template) => {
		const container = unmerged.find(
			(other) =>
				other.sha !== template.sha && isAncestor(dir, template.sha, other.sha)
		);

		if (container) {
			runner.log.debug(
				`Skipping ${template.name}: already included in ${container.name}`
			);

			return false;
		}

		return true;
	});
}
