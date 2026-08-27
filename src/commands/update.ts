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

		let sortedTemplates: string[];
		try {
			sortedTemplates = utils.getTemplateLineage(cmd.dir);
		}
		catch (e) {
			const err = e as Error;
			log.error(err.message);
			return; // Or throw depending on preference. Logging and returning is safe here.
		}

		if (sortedTemplates.length === 0) {
			log.info('No templates installed to update.');
			return;
		}

		log.info(`Found ${sortedTemplates.length} installed template(s).`);

		log.info(`Plan: ${sortedTemplates.join(' -> ')}`);

		// For each template in order, merge it
		for (const templateName of sortedTemplates) {
			const template = getCachedTemplate(templateName);

			if (!template) {
				log.warn(
					`Template "${templateName}" not found in remote cache. Skipping update.`
				);
				continue;
			}

			log.info(`Merging updates from ${templateName}...`);

			utils.mergeTemplate({
				runner: cmd,
				template: argv.branch ? { ...template, branch: argv.branch } : template,
				branch: argv.branch || template.branch || 'main',
				isExistingProject: true,
			});

			log.info(`Successfully merged ${templateName}`);
		}

		log.info('Update complete!');
	}
}
