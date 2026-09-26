import { CommandRunner } from 'ts-script';
import { Log } from 'ts-tiny-log';
import { LogLevel } from 'ts-tiny-log/levels';

import * as utils from '../utils';
import * as options from '../options';
import { Command, CommandOption, ParsedArguments } from 'ts-commands';
import { getCachedTemplate } from '../host';

interface Args extends ParsedArguments {
	template: string;
	verbose: boolean;
	branch: string | null;
}

/**
 * Add a template to the current project
 */
export class AddCommand extends Command {
	override key = 'add';
	override description = 'Add a template to the current project';

	override positional: CommandOption[] = [options.template()];

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
		const template = getCachedTemplate(argv.template);

		if (!template) {
			throw new Error(`Template "${argv.template}" not found`);
		}

		utils.mergeTemplate({
			runner: cmd,
			template: argv.branch ? { ...template, branch: argv.branch } : template,
			branch: argv.branch || template.branch || 'main',
			isExistingProject: true,
		});

		log.info(`Added template ${template.name}.`);
	}
}
