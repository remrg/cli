import { CommandOption, OptionType } from 'ts-commands';

export function verbose(): CommandOption {
	return {
		key: 'verbose',
		alias: 'v',
		type: OptionType.boolean,
		description: 'Run with verbose logging',
	};
}
