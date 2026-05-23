export interface HostTemplate {
	name: string;
	url: string;
	branch: string;
}

export abstract class Host {
	public abstract getTemplates(): Promise<HostTemplate[]>;
}
