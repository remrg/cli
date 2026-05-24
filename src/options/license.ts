import { CommandOption, OptionType } from 'ts-commands';

export function license(): CommandOption {
	return {
		key: 'license',
		type: OptionType.string,
		description: 'license name',
	};
}
