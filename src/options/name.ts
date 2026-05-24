import { CommandOption, OptionType } from 'ts-commands';

export function name(): CommandOption {
	return {
		key: 'name',
		type: OptionType.string,
		description: 'project name',
	};
}
