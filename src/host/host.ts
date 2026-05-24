import { Template } from '../templates';

export abstract class Host {
	public abstract getTemplates(): Promise<Template[]>;
}
