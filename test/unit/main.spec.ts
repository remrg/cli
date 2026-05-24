import { describe, it, expect, vi, beforeEach } from 'vitest';
import { main } from '../../src/main';
import { log } from '../../src/log';
import { CommandDispatcher } from 'ts-commands';
import { getHost } from '../../src/host/get-host';
import {
	initializeCache,
	getCachedTemplateNames,
} from '../../src/host/template-cache';

vi.mock('../../src/log', () => ({
	log: {
		info: vi.fn(),
	},
}));

vi.mock('ts-commands', async (importOriginal) => {
	const actual = await importOriginal<typeof import('ts-commands')>();
	const runMock = vi.fn();
	const commandDispatcherMock = vi.fn(function (this: CommandDispatcher) {
		this.run = runMock;
		return this;
	});
	return {
		...actual,
		CommandDispatcher: commandDispatcherMock,
	};
});

vi.mock('../../src/host/get-host', () => ({
	getHost: vi.fn(),
}));

vi.mock('../../src/host/template-cache', () => ({
	initializeCache: vi.fn(),
	getCachedTemplateNames: vi.fn(),
}));

vi.mock('../../src/commands', () => ({
	commands: [],
}));

describe('main', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should execute the initial pipeline correctly', async () => {
		const mockTemplates = [
			{ name: 'test-template', url: 'http://test', branch: 'main' },
		];
		const mockHost = {
			getTemplates: vi.fn().mockResolvedValue(mockTemplates),
		};

		vi.mocked(getHost).mockResolvedValue(mockHost);
		vi.mocked(getCachedTemplateNames).mockReturnValue(['test-template']);

		await main();

		expect(log.info).toHaveBeenCalledWith('remrg-cli\n');
		expect(log.info).toHaveBeenCalledWith('Fetching templates...');

		expect(initializeCache).toHaveBeenCalled();

		expect(log.info).toHaveBeenCalledWith('Templates fetched successfully!\n');

		expect(CommandDispatcher).toHaveBeenCalledWith({
			commands: [],
		});

		// Access the returned object from the mocked constructor
		const dispatcherMock = vi.mocked(CommandDispatcher).mock.results[0].value;
		expect(dispatcherMock.run).toHaveBeenCalled();
	});
});
