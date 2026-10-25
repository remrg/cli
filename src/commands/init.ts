import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

import { CommandRunner } from 'ts-script';
import { Log } from 'ts-tiny-log';
import { LogLevel } from 'ts-tiny-log/levels';
import { Command, CommandOption, ParsedArguments } from 'ts-commands';

import * as options from '../options';
import * as utils from '../utils';
import { getCachedTemplate } from '../host';

interface Args extends ParsedArguments {
	template: string;
	verbose: boolean;
	branch: string | null;
	org: string | null;
	license: string | null;
	remote: string | null;
}

/**
 * Initialize remrg in an existing Git repository
 */
export class InitCommand extends Command {
	override key = 'init';
	override description = 'Initialize remrg in an existing Git repository';

	override positional: CommandOption[] = [options.template()];

	override options: CommandOption[] = [
		options.verbose(),
		options.branch(),
		options.org(),
		options.license(),
		options.remoteUrl(),
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
		let template =
			argv.template === 'remote' ? undefined : getCachedTemplate(argv.template);

		if (argv.template === 'remote' && argv.remote) {
			template = {
				name: 'remote',
				url: argv.remote,
				branch: argv.branch || 'main',
			};
		}

		if (!template) {
			if (argv.template === 'remote') {
				throw new Error('Either a template or remote URL must be provided');
			}

			throw new Error(`Template "${argv.template}" not found`);
		}

		let gitRoot: string;
		try {
			gitRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
				cwd: cmd.dir,
				encoding: 'utf8',
				stdio: ['ignore', 'pipe', 'ignore'],
			}).trim();
		}
		catch (error) {
			throw new Error('The current directory is not a Git repository.', {
				cause: error,
			});
		}

		if (path.resolve(gitRoot) !== path.resolve(cmd.dir)) {
			throw new Error('Run "remrg init" from the Git repository root.');
		}

		const branch = argv.branch || template.branch || 'main';
		utils.validateTemplateBranch(template.name, branch);
		if (existsSync(path.join(cmd.dir, '.remrg'))) {
			throw new Error(
				'This repository already contains .remrg metadata. ' +
					'Use "remrg add" to add another template.'
			);
		}

		utils.mergeTemplate({
			runner: cmd,
			template: { ...template, branch },
			branch,
			isExistingProject: true,
		});

		if (template.name !== 'remote') {
			this.validateInstalledTemplate(cmd.dir, template.name);
		}
		utils.recordInstalledTemplateBranch(cmd.dir, template, branch);
		utils.writePlaceholdersYaml(cmd.dir, {
			name: path.basename(cmd.dir),
			organization: argv.org ?? '',
			license: argv.license ?? '',
		});

		log.info(`Initialized remrg using template ${template.name}.`);
	}

	private validateInstalledTemplate(dir: string, templateName: string): void {
		const installedDir = path.join(dir, '.remrg', 'installed');
		if (!existsSync(installedDir)) {
			throw new Error(
				`Template "${templateName}" lacks .remrg/installed metadata. ` +
					'The repository may be partially initialized; resolve it manually.'
			);
		}

		const installedNames = utils.loadInstalledTemplateNames(dir);
		if (!installedNames.includes(templateName)) {
			throw new Error(
				`Template "${templateName}" is not registered under ` +
					'.remrg/installed and cannot be updated. ' +
					'The repository may be partially initialized; resolve it manually.'
			);
		}

		const manifest = utils.loadInstalledTemplate(dir, templateName);
		if (!manifest) {
			throw new Error(
				`Template "${templateName}" lacks its .remrg/installed manifest. ` +
					'The repository may be partially initialized; resolve it manually.'
			);
		}
	}
}
