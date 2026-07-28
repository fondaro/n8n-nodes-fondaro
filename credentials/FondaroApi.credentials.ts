import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export class FondaroApi implements ICredentialType {
	name = 'fondaroApi';

	displayName = 'Fondaro API';

	icon: Icon = {
		light: 'file:fondaro.svg',
		dark: 'file:fondaro.dark.svg',
	};

	documentationUrl = 'https://github.com/fondaro/n8n-nodes-fondaro?tab=readme-ov-file#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description:
				'A Fondaro integration API key. Generate one in the Fondaro dashboard under Organization, Integrations, n8n. The key is shown exactly once after creation.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.fondaro.com',
			description: 'Base URL of the Fondaro API',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/integrations/v1/whoami',
		},
	};
}
