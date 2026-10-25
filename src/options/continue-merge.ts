import { CommandOption, OptionType } from 'ts-commands';

export function continueMerge(): CommandOption {
	return {
		key: 'continue',
		type: OptionType.boolean,
		description: 'Resume after resolving and committing a template merge',
	};
}
