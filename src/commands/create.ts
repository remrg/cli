import path from 'path';

import { CommandRunner } from 'ts-script';
import { Log } from 'ts-tiny-log';
import { LogLevel } from 'ts-tiny-log/levels';

import * as utils from '../utils';
import * as options from '../options';
import { Command, CommandOption, ParsedArguments } from 'ts-commands';
import { getCachedTemplate } from '../host';
import { Template } from '../templates';

interface Args extends ParsedArguments {
	// Positional
	template: string;
	name: string;

	// Options
	remote: string | null;
	templatize: boolean | null;
	verbose: boolean;

	// Placeholder variables
	org: string | null;
	license: string | null;
}

/**
 * Create a new project
 */
export class CreateCommand extends Command {
	override key = 'create';
	override description = 'Create a new project';

	override positional: CommandOption[] = [options.template(), options.name()];

	override options: CommandOption[] = [
		options.remoteUrl(),
		options.verbose(),
		options.templatize(),
		options.org(),
		options.license(),
	];

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

		let template: Template;
		const name = argv.name;
		const branch = 'main'; // TODO: Add option for branch
		const remote = argv.remote;

		if (argv.template && argv.template !== 'remote') {
			template = getCachedTemplate(argv.template)!;

			if (!template && !remote) {
				throw new Error(`Template "${argv.template}" not found`);
			}
		}
		else if (remote) {
			template = {
				name: 'remote',
				url: remote,
				branch: branch,
			};
		}
		else {
			throw new Error('Either a template or remote URL must be provided');
		}

		// Ask for input
		while (!argv.templatize && !argv.org) {
			argv.org = await this.ask('Enter organization name: ');
		}

		while (!argv.templatize && !argv.license) {
			argv.license = await this.ask('Enter license name: ');
		}

		// Create project folder
		utils.initProject(cmd, name);

		// "cd" into project
		cmd.dir = path.join(cmd.dir, name);

		// Check git config
		if (!utils.isGitConfigured(cmd)) {
			let name: string | null = null;
			let email: string | null = null;

			log.warn('Git user is not configured.');

			while (!name) {
				name = await this.ask('Enter git user.name: ');
			}

			while (!email) {
				email = await this.ask('Enter git user.email: ');
			}

			utils.configUser(cmd, name, email);
		}

		// Merge the template
		utils.mergeTemplate({ runner: cmd, template, branch });

		// Replace placeholders
		if (argv.templatize) {
			let access = await this.ask(
				'Enter template access level (private/public): '
			);

			if (access !== '' && access !== 'private' && access !== 'public') {
				throw new Error('Invalid access level');
			}

			if (access === '') {
				access = 'private';
			}

			utils.writeTemplateYaml(cmd.dir, {
				projectName: name,
				organization: argv.org ?? '',
				license: argv.license ?? 'MIT',
				access: access as 'private' | 'public',
				roots: [argv.remote ? argv.remote : template.name],
			});
		}
		else {
			utils.replacePlaceholder(cmd, 'project-name', name);
			utils.replacePlaceholder(cmd, 'organization', argv.org ?? '');
			utils.replacePlaceholder(cmd, 'license', argv.license ?? '');

			utils.writePlaceholdersYaml(cmd.dir, {
				name: name,
				organization: argv.org ?? '',
				license: argv.license ?? '',
			});
		}

		// Commit changes
		const templateName =
			template.name && template.name !== 'remote' ? template.name : remote;
		utils.stage(cmd);
		utils.commit(cmd, `project created using remrg (${templateName})`);
	}
}
