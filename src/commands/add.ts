import { CommandRunner } from 'ts-script';
import { Log } from 'ts-tiny-log';
import { LogLevel } from 'ts-tiny-log/levels';

import * as utils from '../utils';
import * as options from '../options';
import { Command, CommandOption, ParsedArguments } from 'ts-commands';
import { getCachedTemplate } from '../host';
import { existsSync } from 'fs';
import path from 'path';

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

		const installed = existsSync(
			path.join(cmd.dir, '.remrg', 'installed', template.name, 'remrg.yml')
		)
			? utils.loadInstalledTemplate(cmd.dir, template.name)
			: undefined;
		const branch =
			argv.branch ||
			utils.getInstalledTemplateBranch(template.name, installed) ||
			template.branch ||
			'main';
		utils.validateTemplateBranch(template.name, branch);

		utils.mergeTemplate({
			runner: cmd,
			template: { ...template, branch },
			branch,
			isExistingProject: true,
		});
		utils.recordInstalledTemplateBranch(cmd.dir, template, branch);

		log.info(`Added template ${template.name}.`);
	}
}
