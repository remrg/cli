import { CommandOption, OptionType } from 'ts-commands';

export function templatize(): CommandOption {
	return {
		key: 'templatize',
		type: OptionType.boolean,
		description: 'create a template',
	};
}
