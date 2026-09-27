import { CommandRunner } from 'ts-script';

import { FetchedTemplate } from './fetch-template';
import { isAncestor } from './git/is-ancestor';

/**
 * Merge fetched templates into the current branch, roots first.
 *
 * Templates are merged as real merges (never squashed), so each template's
 * history stays an ancestor of the project and future updates still resolve a
 * correct merge base. Fast-forwards are allowed, so an untouched project
 * advances without adding a commit at all.
 *
 * @param runner Command runner
 * @param templates Fetched templates to merge, roots first
 */
export function mergeFetchedTemplates(
	runner: CommandRunner,
	templates: FetchedTemplate[]
): void {
	for (const template of templates) {
		// An earlier merge may have fast-forwarded HEAD past this template
		if (isAncestor(runner.dir, template.sha, 'HEAD')) {
			runner.log.debug(
				`Skipping ${template.name}: already merged by an earlier template`
			);

			continue;
		}

		runner.run(
			`git merge ${template.ref} --allow-unrelated-histories ` +
				`-m "[remrg] update template: ${template.name}"`,
			{ loadingDescription: `Merging ${template.name}` }
		);
	}
}
