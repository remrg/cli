import { CommandOption, OptionType } from 'ts-commands';

export function branch(): CommandOption {
	return {
		key: 'branch',
		type: OptionType.string,
		description: 'remote template branch to use',
	};
}
