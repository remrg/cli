import { CommandRunner } from 'ts-script';
import { Log } from 'ts-tiny-log';
import { LogLevel } from 'ts-tiny-log/levels';

import * as utils from '../utils';
import * as options from '../options';
import { Command, CommandOption, ParsedArguments } from 'ts-commands';
import { getCachedTemplate } from '../host';

interface Args extends ParsedArguments {
	// Options
	verbose: boolean;
	branch: string | null;
}

/**
 * Update the current project
 */
export class UpdateCommand extends Command {
	override key = 'update';
	override description = 'Update the project templates from remrg';

	override options: CommandOption[] = [options.verbose(), options.branch()];

	override async handle(argv: Args): Promise<void> {
		const log = new Log({
			level: argv.verbose ? LogLevel.debug : LogLevel.info,
			shouldWriteTimestamp: argv.verbose,
		});

		const cmd = new CommandRunner({
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			log: log as any,
			verbose: argv.verbose,
		});

		const sortedTemplates: string[] = utils.getTemplateLineage(cmd.dir);

		if (sortedTemplates.length === 0) {
			log.info('No templates installed to update.');
			return;
		}

		log.info(`Found ${sortedTemplates.length} installed template(s).`);

		log.info(`Plan: ${sortedTemplates.join(' -> ')}`);

		// Fetch everything up front so redundant merges can be detected before
		// any commit is created
		const fetched: utils.FetchedTemplate[] = [];

		for (const templateName of sortedTemplates) {
			const template = getCachedTemplate(templateName);

			if (!template) {
				log.warn(
					`Template "${templateName}" not found in remote cache. Skipping update.`
				);
				continue;
			}

			fetched.push(
				utils.fetchTemplate({
					runner: cmd,
					template: argv.branch
						? { ...template, branch: argv.branch }
						: template,
					branch: argv.branch || template.branch || 'main',
				})
			);
		}

		try {
			const pending = utils.pruneRedundantTemplates(cmd, fetched);

			if (pending.length === 0) {
				log.info('Already up to date.');
				return;
			}

			log.info(
				`Merging ${pending.map((t) => t.name).join(', ')} ` +
					`(${fetched.length - pending.length} already up to date).`
			);

			utils.mergeFetchedTemplates(cmd, pending);
		}
		finally {
			for (const template of fetched) {
				utils.removeTemplateRemote(cmd, template.remoteName);
			}
		}

		log.info('Update complete!');
	}
}
