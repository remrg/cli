import { CommandRunner } from 'ts-script';

import { FetchedTemplate } from './fetch-template';

/**
 * Merge fetched templates into the current branch, roots first.
 *
 * Templates are merged as real merges (never squashed), so each template's
 * history stays an ancestor of the project and future updates still resolve a
 * correct merge base.
 *
 * @param runner Command runner
 * @param templates Fetched templates to merge, roots first
 */
export function mergeFetchedTemplates(
	runner: CommandRunner,
	templates: FetchedTemplate[]
): void {
	for (const template of templates) {
		runner.run(
			`git merge ${template.ref} --allow-unrelated-histories --no-ff ` +
				`-m "[remrg] update template: ${template.name}"`,
			{ loadingDescription: `Merging ${template.name}` }
		);
	}
}
