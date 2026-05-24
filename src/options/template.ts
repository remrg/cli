import { CommandOption, OptionType } from 'ts-commands';

export function template(): CommandOption {
	return {
		key: 'template',
		type: OptionType.string,
		description: 'template type',
	};
}
