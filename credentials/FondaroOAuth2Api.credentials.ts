import type { ICredentialType, Icon, INodeProperties } from 'n8n-workflow';

export class FondaroOAuth2Api implements ICredentialType {
	name = 'fondaroOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Fondaro OAuth2 API';

	icon: Icon = {
		light: 'file:fondaro.svg',
		dark: 'file:fondaro.dark.svg',
	};

	documentationUrl = 'https://github.com/fondaro/n8n-nodes-fondaro?tab=readme-ov-file#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://api.fondaro.com/integrations/v1/oauth/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://api.fondaro.com/integrations/v1/oauth/token',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'crm:read crm:write',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		},
	];
}
