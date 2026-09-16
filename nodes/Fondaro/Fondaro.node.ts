import {
	NodeConnectionTypes,
	type ILoadOptionsFunctions,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

const CRM_STATUS_OPTIONS: INodePropertyOptions[] = [
	// 'lead' is the entry status; the dashboard CRM labels it "New", so we match.
	{ name: 'New', value: 'lead' },
	{ name: 'Potential', value: 'potential' },
	{ name: 'Bad Timing', value: 'bad_timing' },
	{ name: 'Client', value: 'client' },
	{ name: 'Unqualified', value: 'unqualified' },
];

const LEAD_TYPE_OPTIONS: INodePropertyOptions[] = [
	{ name: 'Buyer', value: 'buyer' },
	{ name: 'Seller', value: 'seller' },
];

const DEAL_STAGE_OPTIONS: INodePropertyOptions[] = [
	{ name: 'Offer', value: 'offer' },
	{ name: 'Qualified', value: 'qualified' },
	{ name: 'Reserved', value: 'reserved' },
	{ name: 'Under Contract', value: 'under_contract' },
	{ name: 'Viewing', value: 'viewing' },
];

async function fondaroOptionsRequest(
	this: ILoadOptionsFunctions,
	endpoint: string,
): Promise<INodePropertyOptions[]> {
	const credentials = await this.getCredentials('fondaroApi');
	const response = await this.helpers.httpRequestWithAuthentication.call(this, 'fondaroApi', {
		method: 'GET',
		baseURL: credentials.baseUrl as string,
		url: endpoint,
		json: true,
	});
	return Array.isArray(response) ? (response as INodePropertyOptions[]) : [];
}

export class Fondaro implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Fondaro',
		name: 'fondaro',
		icon: {
			light: 'file:fondaro.svg',
			dark: 'file:fondaro.dark.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Create, find, assign and update Fondaro CRM leads, read acquisition details and activity, manage deals, tasks, notes and tags, and resolve team members by ID',
		defaults: {
			name: 'Fondaro',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'fondaroApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl}}',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Deal', value: 'deal' },
					{ name: 'Lead', value: 'lead' },
					{ name: 'Note', value: 'note' },
					{ name: 'Tag', value: 'tag' },
					{ name: 'Task', value: 'task' },
					{ name: 'User', value: 'user' },
					{ name: 'Viewing', value: 'viewing' },
				],
				default: 'lead',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				default: 'getMany',
				displayOptions: { show: { resource: ['viewing'] } },
				options: [
					{
						name: 'Get',
						value: 'get',
						action: 'Get a viewing',
						description: 'Read one registered own-listing viewing; requires viewings:read',
						routing: {
							request: {
								method: 'GET',
								url: '=/integrations/v1/viewings/{{$parameter.viewingId}}',
							},
						},
					},
					{
						name: 'Get Many',
						value: 'getMany',
						action: 'Get many viewings',
						description:
							'Read a filtered page of organization-visible registered own-listing viewings; requires viewings:read',
						routing: { request: { method: 'GET', url: '/integrations/v1/viewings' } },
					},
				],
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['lead'],
					},
				},
				options: [
					{
						name: 'Add Assignees',
						value: 'addAssignees',
						action: 'Add assignees to a lead',
						description:
							'Add one or more assignees to a lead without removing its existing assignees',
						routing: {
							request: {
								method: 'POST',
								url: '=/integrations/v1/leads/{{$parameter.leadId}}/assignees',
							},
						},
					},
					{
						name: 'Create',
						value: 'create',
						action: 'Create a lead',
						description: 'Create a new lead in the CRM',
						routing: {
							request: {
								method: 'POST',
								url: '/integrations/v1/leads',
							},
						},
					},
					{
						name: 'Find',
						value: 'find',
						action: 'Find a lead',
						description:
							'Find a single lead by email, phone or external ID. Find returns only leads that have been purchased into your CRM. A 404 means no purchased lead matched, not that your key is broken.',
						routing: {
							request: {
								method: 'GET',
								url: '/integrations/v1/leads/find',
							},
						},
					},
					{
						name: 'Get',
						value: 'get',
						action: 'Get a lead',
						description:
							'Get a lead by its ID, including its Fondaro acquisition origin when available',
						routing: {
							request: {
								method: 'GET',
								url: '=/integrations/v1/leads/{{$parameter.leadId}}',
							},
						},
					},
					{
						name: 'Get Activities',
						value: 'getActivities',
						action: 'Get activities for a lead',
						description:
							'Read notes, tasks, emails, viewings and calls with recorded owner IDs and outcomes. Continue with nextOffset while hasMore is true.',
						routing: {
							request: {
								method: 'GET',
								url: '=/integrations/v1/leads/{{$parameter.leadId}}/activities',
							},
						},
					},
					{
						name: 'Get Calls',
						value: 'getCalls',
						action: 'Get calls for a lead',
						description: 'Read a page of recorded calls with owner IDs for per-person reporting',
						routing: {
							request: {
								method: 'GET',
								url: '=/integrations/v1/leads/{{$parameter.leadId}}/calls',
							},
						},
					},
					{
						name: 'Get Many',
						value: 'getMany',
						action: 'Get many leads',
						description:
							'List leads in your CRM, optionally filtered by assignee, unassigned state, tags and CRM status. Tag filtering is OR-based: a lead matches if it carries any of the tags. Ordered newest first by purchase date.',
						routing: {
							request: {
								method: 'GET',
								url: '/integrations/v1/leads',
							},
						},
					},
					{
						name: 'Match to Listing',
						value: 'matchToListing',
						action: 'Match leads to a listing',
						description:
							'Find ranked leads from indexed CRM history relevant to an own or source-qualified listing',
						routing: {
							request: {
								method: 'POST',
								url: '/integrations/v1/leads/listing-match',
								body: '={{ { ...($parameter.listingIdentity === "own" ? {propertyListingId: $parameter.matchPropertyListingId} : {listingRef: {source: $parameter.listingSource, id: $parameter.listingSourceId}}), maxResults: $parameter.maxResults } }}',
							},
						},
					},
					{
						name: 'Search',
						value: 'search',
						action: 'Search leads',
						description: 'Search leads by free text',
						routing: {
							request: {
								method: 'GET',
								url: '/integrations/v1/leads/search',
							},
						},
					},
					{
						name: 'Semantic Search',
						value: 'semanticSearch',
						action: 'Search indexed lead history',
						description:
							'Find ranked leads and evidence from indexed CRM history; preserve matches, tookMs and reranked',
						routing: { request: { method: 'POST', url: '/integrations/v1/leads/semantic-search' } },
					},
					{
						name: 'Update Contact',
						value: 'updateContact',
						action: 'Update lead contact details',
						description: 'Update the contact details of a lead',
						routing: {
							request: {
								method: 'PATCH',
								url: '=/integrations/v1/leads/{{$parameter.leadId}}/contact',
							},
						},
					},
					{
						name: 'Update Status',
						value: 'updateStatus',
						action: 'Update lead status',
						description: 'Update the CRM status of a lead',
						routing: {
							request: {
								method: 'PATCH',
								url: '=/integrations/v1/leads/{{$parameter.leadId}}/status',
							},
						},
					},
				],
				default: 'create',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['deal'],
					},
				},
				options: [
					{
						name: 'Change Stage',
						value: 'changeStage',
						action: 'Change the stage of a deal',
						description: 'Move a deal to a different stage',
						routing: {
							request: {
								method: 'PATCH',
								url: '=/integrations/v1/deals/{{$parameter.dealId}}/stage',
							},
						},
					},
					{
						name: 'Close Lost',
						value: 'closeLost',
						action: 'Close a deal as lost',
						description: 'Mark a deal as lost, optionally with a reason',
						routing: {
							request: {
								method: 'POST',
								url: '=/integrations/v1/deals/{{$parameter.dealId}}/lost',
							},
						},
					},
					{
						name: 'Close Won',
						value: 'closeWon',
						action: 'Close a deal as won',
						description: 'Mark a deal as won',
						routing: {
							request: {
								method: 'POST',
								url: '=/integrations/v1/deals/{{$parameter.dealId}}/won',
							},
						},
					},
					{
						name: 'Create',
						value: 'create',
						action: 'Create a deal',
						description:
							'Create a new deal for a lead. The deal currency is controlled by your organization settings in Fondaro. A 400 response means the organization has no billing currency set.',
						routing: {
							request: {
								method: 'POST',
								url: '/integrations/v1/deals',
							},
						},
					},
					{
						name: 'Get',
						value: 'get',
						action: 'Get a deal',
						description: 'Get a deal by its ID',
						routing: {
							request: {
								method: 'GET',
								url: '=/integrations/v1/deals/{{$parameter.dealId}}',
							},
						},
					},
					{
						name: 'Get Many',
						value: 'getMany',
						action: 'Get many deals for a lead',
						description: 'Get all deals that belong to a lead',
						routing: {
							request: {
								method: 'GET',
								url: '=/integrations/v1/leads/{{$parameter.leadId}}/deals',
							},
						},
					},
				],
				default: 'create',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['note'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						action: 'Create a note on a lead',
						description: 'Add a note to a lead',
						routing: {
							request: {
								method: 'POST',
								url: '=/integrations/v1/leads/{{$parameter.leadId}}/notes',
							},
						},
					},
				],
				default: 'create',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['tag'],
					},
				},
				options: [
					{
						name: 'Add',
						value: 'add',
						action: 'Add tags to a lead',
						description:
							'Add tags to a lead by name or ID. Additive: plain names that do not exist are created automatically; IDs must match existing tags and are never created.',
						routing: {
							request: {
								method: 'POST',
								url: '=/integrations/v1/leads/{{$parameter.leadId}}/tags',
							},
						},
					},
					{
						name: 'Get',
						value: 'get',
						action: 'Get tags for a lead',
						description: "Read the lead's current set of tags",
						routing: {
							request: {
								method: 'GET',
								url: '=/integrations/v1/leads/{{$parameter.leadId}}/tags',
							},
						},
					},
				],
				default: 'add',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['task'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						action: 'Create a task on a lead',
						description: 'Create a task attached to a lead',
						routing: {
							request: {
								method: 'POST',
								url: '=/integrations/v1/leads/{{$parameter.leadId}}/tasks',
							},
						},
					},
				],
				default: 'create',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['user'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						action: 'Get a team user by ID',
						description:
							'Resolve a single team member (email, name, role) by their user ID. Use this to turn a user_… value from assigneeIds or lead.assigned into a rep email.',
						routing: {
							request: {
								method: 'GET',
								url: '=/integrations/v1/users/{{$parameter.userId}}',
							},
						},
					},
					{
						name: 'List',
						value: 'list',
						action: 'List team users',
						description: 'List all team members (email, name, role) in the organization',
						routing: {
							request: {
								method: 'GET',
								url: '/integrations/v1/users',
							},
						},
					},
				],
				default: 'get',
			},
			{
				displayName: 'Additional Fields',
				name: 'callFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['lead'], operation: ['getCalls'] } },
				options: [
					{
						displayName: 'Limit',
						name: 'limit',
						type: 'number',
						typeOptions: { minValue: 1, maxValue: 100 },
						default: 50,
						description: 'Max number of results to return',
						routing: { send: { type: 'query', property: 'limit' } },
					},
					{
						displayName: 'Offset',
						name: 'offset',
						type: 'number',
						typeOptions: { minValue: 0 },
						default: 0,
						description: 'Use the previous response nextOffset while hasMore is true',
						routing: { send: { type: 'query', property: 'offset' } },
					},
				],
			},
			{
				displayName: 'Query',
				name: 'semanticQuery',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g. Buyers who mentioned a garden near the beach',
				description:
					'Nonempty query up to 500 characters. Searches indexed activity evidence, not every lead field.',
				displayOptions: { show: { resource: ['lead'], operation: ['semanticSearch'] } },
				routing: { send: { type: 'body', property: 'query' } },
			},
			{
				displayName: 'Max Results',
				name: 'maxResults',
				type: 'number',
				default: 10,
				typeOptions: { minValue: 1, maxValue: 30 },
				description: 'Max number of ranked leads to return; this is not a paginated export',
				displayOptions: {
					show: { resource: ['lead'], operation: ['semanticSearch', 'matchToListing'] },
				},
				routing: { send: { type: 'body', property: 'maxResults' } },
			},
			{
				displayName: 'Additional Fields',
				name: 'semanticFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['lead'], operation: ['semanticSearch'] } },
				options: [
					{
						displayName: 'Lead ID',
						name: 'leadId',
						type: 'number',
						default: 1,
						typeOptions: { minValue: 1 },
						description: 'Restrict evidence to one lead',
						routing: { send: { type: 'body', property: 'leadId' } },
					},
					{
						displayName: 'Occurred From',
						name: 'occurredFrom',
						type: 'dateTime',
						default: '',
						description:
							'Inclusive source activity occurrence timestamp; not a future visit date mentioned in text',
						routing: { send: { type: 'body', property: 'occurredFrom' } },
					},
					{
						displayName: 'Occurred To',
						name: 'occurredTo',
						type: 'dateTime',
						default: '',
						description:
							'Inclusive source activity occurrence timestamp; must be after Occurred From',
						routing: { send: { type: 'body', property: 'occurredTo' } },
					},
				],
			},
			{
				displayName: 'Listing Identity',
				name: 'listingIdentity',
				type: 'options',
				default: 'own',
				options: [
					{ name: 'Own Listing', value: 'own' },
					{ name: 'Source Reference', value: 'source' },
				],
				displayOptions: { show: { resource: ['lead'], operation: ['matchToListing'] } },
			},
			{
				displayName: 'Property Listing ID',
				name: 'matchPropertyListingId',
				type: 'string',
				required: true,
				default: '',
				description: 'UUID of an own listing in your organization',
				displayOptions: {
					show: { resource: ['lead'], operation: ['matchToListing'], listingIdentity: ['own'] },
				},
			},
			{
				displayName: 'Listing Source',
				name: 'listingSource',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g. resales_online',
				description: 'Exact connected property source identifier; URLs are not accepted',
				displayOptions: {
					show: { resource: ['lead'], operation: ['matchToListing'], listingIdentity: ['source'] },
				},
			},
			{
				displayName: 'Source Listing ID',
				name: 'listingSourceId',
				type: 'string',
				required: true,
				default: '',
				description: 'Exact source-native listing ID',
				displayOptions: {
					show: { resource: ['lead'], operation: ['matchToListing'], listingIdentity: ['source'] },
				},
			},
			{
				displayName: 'Viewing ID',
				name: 'viewingId',
				type: 'string',
				required: true,
				default: '',
				description: 'UUID of the registered viewing',
				displayOptions: { show: { resource: ['viewing'], operation: ['get'] } },
			},
			{
				displayName: 'Filters',
				name: 'viewingFilters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: { show: { resource: ['viewing'], operation: ['getMany'] } },
				options: [
					{
						displayName: 'Agent User ID',
						name: 'agentUserId',
						type: 'string',
						default: '',
						description: 'Hosting agent Clerk ID; users:read resolves its label',
						routing: { send: { type: 'query', property: 'agentUserId' } },
					},
					{
						displayName: 'Collaborator Lead ID',
						name: 'collaboratorLeadId',
						type: 'number',
						default: 1,
						typeOptions: { minValue: 1 },
						routing: { send: { type: 'query', property: 'collaboratorLeadId' } },
					},
					{
						displayName: 'Deal ID',
						name: 'dealId',
						type: 'string',
						default: '',
						routing: { send: { type: 'query', property: 'dealId' } },
					},
					{
						displayName: 'From',
						name: 'from',
						type: 'dateTime',
						default: '',
						description: 'Inclusive viewingAt timestamp',
						routing: { send: { type: 'query', property: 'from' } },
					},
					{
						displayName: 'Kind',
						name: 'kind',
						type: 'options',
						default: 'in_person',
						options: [
							{ name: 'In Person', value: 'in_person' },
							{ name: 'Virtual', value: 'virtual' },
						],
						routing: { send: { type: 'query', property: 'kind' } },
					},
					{
						displayName: 'Lead ID',
						name: 'leadId',
						type: 'number',
						default: 1,
						typeOptions: { minValue: 1 },
						routing: { send: { type: 'query', property: 'leadId' } },
					},
					{
						displayName: 'Limit',
						name: 'limit',
						type: 'number',
						default: 50,
						typeOptions: { minValue: 1, maxValue: 100 },
						description: 'Max number of results to return',
						routing: { send: { type: 'query', property: 'limit' } },
					},
					{
						displayName: 'Offset',
						name: 'offset',
						type: 'number',
						default: 0,
						typeOptions: { minValue: 0 },
						description:
							'Use previous nextOffset while hasMore is true. Stable order is viewingAt descending then ID descending.',
						routing: { send: { type: 'query', property: 'offset' } },
					},
					{
						displayName: 'Property Listing ID',
						name: 'propertyListingId',
						type: 'string',
						default: '',
						routing: { send: { type: 'query', property: 'propertyListingId' } },
					},
					{
						displayName: 'Status',
						name: 'status',
						type: 'options',
						default: 'scheduled',
						options: [
							{ name: 'Cancelled', value: 'cancelled' },
							{ name: 'Completed', value: 'completed' },
							{ name: 'No Show', value: 'no_show' },
							{ name: 'Scheduled', value: 'scheduled' },
						],
						routing: { send: { type: 'query', property: 'status' } },
					},
					{
						displayName: 'To',
						name: 'to',
						type: 'dateTime',
						default: '',
						description: 'Exclusive viewingAt timestamp; must be after From',
						routing: { send: { type: 'query', property: 'to' } },
					},
				],
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['lead'],
						operation: ['create'],
					},
				},
				description: 'First name of the lead',
				routing: {
					send: {
						type: 'body',
						property: 'firstName',
					},
				},
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				displayOptions: {
					show: {
						resource: ['lead'],
						operation: ['create'],
					},
				},
				description:
					'Email address of the lead. Optional, but the lead needs at least one contact method — provide an email here or a Phone Number in Additional Fields.',
				routing: {
					send: {
						type: 'body',
						property: 'email',
					},
				},
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['lead'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Assignee Names or IDs',
						name: 'assigneeIds',
						type: 'multiOptions',
						typeOptions: {
							loadOptionsMethod: 'getAssignees',
						},
						default: [],
						description:
							'Users to assign the lead to. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
						routing: {
							send: {
								type: 'body',
								property: 'assigneeIds',
							},
						},
					},
					{
						displayName: 'CRM Status',
						name: 'crmStatus',
						type: 'options',
						options: CRM_STATUS_OPTIONS,
						default: 'lead',
						description: 'CRM status to create the lead with',
						routing: {
							send: {
								type: 'body',
								property: 'crmStatus',
							},
						},
					},
					{
						displayName: 'External ID',
						name: 'externalId',
						type: 'string',
						default: '',
						description: 'Your own identifier for the lead, useful for later lookups with Find',
						routing: {
							send: {
								type: 'body',
								property: 'externalId',
							},
						},
					},
					{
						displayName: 'Language',
						name: 'language',
						type: 'string',
						default: '',
						placeholder: 'e.g. en-GB or es-ES',
						description:
							'Preferred language of the lead as a BCP-47 tag (e.g. en-GB, es-ES, sv-SE). Casing is normalised automatically; values that are not valid language tags are rejected.',
						routing: {
							send: {
								type: 'body',
								property: 'language',
							},
						},
					},
					{
						displayName: 'Last Name',
						name: 'lastName',
						type: 'string',
						default: '',
						description: 'Last name of the lead',
						routing: {
							send: {
								type: 'body',
								property: 'lastName',
							},
						},
					},
					{
						displayName: 'Lead Type',
						name: 'leadType',
						type: 'options',
						options: LEAD_TYPE_OPTIONS,
						default: 'buyer',
						description: 'Whether the lead is a buyer or a seller',
						routing: {
							send: {
								type: 'body',
								property: 'leadType',
							},
						},
					},
					{
						displayName: 'Phone Number',
						name: 'phoneNumber',
						type: 'string',
						default: '',
						placeholder: 'e.g. +34600123456',
						description:
							'Phone number in international E.164 format, including the country code with a leading + (e.g. +34600123456). Spaces and dashes are fine and get stripped; numbers without a country code are rejected.',
						routing: {
							send: {
								type: 'body',
								property: 'phoneNumber',
							},
						},
					},
					{
						displayName: 'Source Name or ID',
						name: 'source',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getLeadSources',
						},
						default: 'n8n',
						description:
							'Where the lead originated. Defaults to n8n; set this when n8n is only the pipe (e.g. a Meta or portal lead). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
						routing: {
							send: {
								type: 'body',
								property: 'source',
							},
						},
					},
					{
						displayName: 'Tag Names or IDs',
						name: 'tags',
						type: 'multiOptions',
						typeOptions: {
							loadOptionsMethod: 'getTags',
						},
						default: [],
						description:
							'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
						hint: 'Picked tags bind stable IDs (rename-proof). Plain names that do not exist are created automatically; IDs must match existing tags and are never created.',
						routing: {
							send: {
								type: 'body',
								property: 'tags',
							},
						},
					},
					{
						displayName: 'Unassigned',
						name: 'unassigned',
						type: 'boolean',
						default: false,
						description: 'Whether to create the lead without any assignee',
						routing: {
							send: {
								type: 'body',
								property: 'unassigned',
							},
						},
					},
				],
			},
			{
				displayName: 'Find By',
				name: 'findBy',
				type: 'options',
				options: [
					{ name: 'Email', value: 'email' },
					{ name: 'External ID', value: 'externalId' },
					{ name: 'Phone', value: 'phone' },
				],
				default: 'email',
				displayOptions: {
					show: {
						resource: ['lead'],
						operation: ['find'],
					},
				},
				description:
					'Which identifier to look the lead up by. Exactly one identifier is used per call.',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['lead'],
						operation: ['find'],
						findBy: ['email'],
					},
				},
				description: 'Email address to look up',
				routing: {
					send: {
						type: 'query',
						property: 'email',
					},
				},
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['lead'],
						operation: ['find'],
						findBy: ['phone'],
					},
				},
				description: 'Phone number to look up',
				routing: {
					send: {
						type: 'query',
						property: 'phone',
					},
				},
			},
			{
				displayName: 'External ID',
				name: 'externalId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['lead'],
						operation: ['find'],
						findBy: ['externalId'],
					},
				},
				description: 'External ID to look up, as provided when the lead was created',
				routing: {
					send: {
						type: 'query',
						property: 'externalId',
					},
				},
			},
			{
				displayName: 'Lead ID',
				name: 'leadId',
				type: 'number',
				required: true,
				default: 0,
				displayOptions: {
					show: {
						resource: ['lead'],
						operation: [
							'addAssignees',
							'get',
							'getActivities',
							'getCalls',
							'updateContact',
							'updateStatus',
						],
					},
				},
				description: 'Numeric ID of the lead',
			},
			{
				displayName: 'Assignee Names or IDs',
				name: 'userIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getAssignees',
				},
				required: true,
				default: [],
				displayOptions: {
					show: {
						resource: ['lead'],
						operation: ['addAssignees'],
					},
				},
				description:
					'Users to add to the lead. Existing assignees are preserved. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				routing: {
					send: {
						type: 'body',
						property: 'userIds',
					},
				},
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['lead'],
						operation: ['getActivities'],
					},
				},
				options: [
					{
						displayName: 'Limit',
						name: 'limit',
						type: 'number',
						typeOptions: {
							minValue: 1,
							maxValue: 100,
						},
						default: 50,
						description: 'Max number of results to return',
						routing: {
							send: {
								type: 'query',
								property: 'limit',
							},
						},
					},
					{
						displayName: 'Offset',
						name: 'offset',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 0,
						description: 'Number of entries to skip, for paging',
						routing: {
							send: {
								type: 'query',
								property: 'offset',
							},
						},
					},
					{
						displayName: 'Types',
						name: 'types',
						type: 'string',
						default: '',
						placeholder: 'call,note,status-change',
						description:
							'Comma-separated list to return only certain activity types. Valid values: call, note, task-created, task-completed, email, status-change, deal-stage-change, deal-won, deal-lost, assignee-change, lead-created, document-attached, viewing. Leave empty for all. Use "call" to fetch just the call log.',
						routing: {
							send: {
								type: 'query',
								property: 'types',
							},
						},
					},
				],
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['lead'],
						operation: ['getMany'],
					},
				},
				options: [
					{
						displayName: 'Assignee Name or ID',
						name: 'assigneeId',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getAssignees',
						},
						default: '',
						displayOptions: {
							hide: {
								unassigned: [{ _cnd: { exists: true } }],
							},
						},
						description:
							'Return only leads assigned to this user. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
						routing: {
							send: {
								type: 'query',
								property: 'assigneeId',
							},
						},
					},
					{
						displayName: 'CRM Status',
						name: 'crmStatus',
						type: 'options',
						options: CRM_STATUS_OPTIONS,
						default: 'lead',
						description: 'Return only leads with this CRM status',
						routing: {
							send: {
								type: 'query',
								property: 'crmStatus',
							},
						},
					},
					{
						displayName: 'Limit',
						name: 'limit',
						type: 'number',
						typeOptions: {
							minValue: 1,
							maxValue: 100,
						},
						default: 50,
						description: 'Max number of results to return',
						routing: {
							send: {
								type: 'query',
								property: 'limit',
							},
						},
					},
					{
						displayName: 'Offset',
						name: 'offset',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 0,
						description: 'Number of results to skip, for paging',
						routing: {
							send: {
								type: 'query',
								property: 'offset',
							},
						},
					},
					{
						displayName: 'Tags',
						name: 'tags',
						type: 'string',
						default: '',
						placeholder: 'e.g. vip,priority',
						description:
							'Comma-separated tag names or IDs to filter by. OR semantics: a lead matches if it carries any of the tags. Names match case-insensitively; an entry that does not resolve to an existing tag fails the call with a 404 naming it, so a typo never silently returns an empty set. A tag name that itself contains a comma can only be filtered by its ID.',
						hint: 'Archived tags still resolve, so automations survive catalogue clean-ups. Prefer IDs in flows that must survive a tag rename.',
						routing: {
							send: {
								type: 'query',
								property: 'tags',
							},
						},
					},
					{
						displayName: 'Unassigned',
						name: 'unassigned',
						type: 'boolean',
						default: false,
						displayOptions: {
							hide: {
								assigneeId: [{ _cnd: { exists: true } }],
							},
						},
						description: 'Whether to return only leads with no assignees',
						routing: {
							send: {
								type: 'query',
								property: 'unassigned',
							},
						},
					},
				],
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['lead'],
						operation: ['search'],
					},
				},
				description: 'Free text to search leads by, for example a name or an email fragment',
				routing: {
					send: {
						type: 'query',
						property: 'q',
					},
				},
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['lead'],
						operation: ['search'],
					},
				},
				options: [
					{
						displayName: 'Limit',
						name: 'limit',
						type: 'number',
						typeOptions: {
							minValue: 1,
						},
						default: 50,
						description: 'Max number of results to return',
						routing: {
							send: {
								type: 'query',
								property: 'limit',
							},
						},
					},
					{
						displayName: 'Offset',
						name: 'offset',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 0,
						description: 'Number of results to skip, for paging',
						routing: {
							send: {
								type: 'query',
								property: 'offset',
							},
						},
					},
				],
			},
			{
				displayName: 'Update Fields',
				name: 'updateFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['lead'],
						operation: ['updateContact'],
					},
				},
				options: [
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						placeholder: 'name@email.com',
						default: '',
						description: 'New email address of the lead',
						routing: {
							send: {
								type: 'body',
								property: 'email',
							},
						},
					},
					{
						displayName: 'First Name',
						name: 'firstName',
						type: 'string',
						default: '',
						description: 'New first name of the lead',
						routing: {
							send: {
								type: 'body',
								property: 'firstName',
							},
						},
					},
					{
						displayName: 'Language',
						name: 'language',
						type: 'string',
						default: '',
						placeholder: 'e.g. en',
						description:
							'New preferred language of the lead as a BCP-47 tag (e.g. en-GB, es-ES). Casing is normalised automatically; invalid tags are rejected.',
						routing: {
							send: {
								type: 'body',
								property: 'language',
							},
						},
					},
					{
						displayName: 'Last Name',
						name: 'lastName',
						type: 'string',
						default: '',
						description: 'New last name of the lead',
						routing: {
							send: {
								type: 'body',
								property: 'lastName',
							},
						},
					},
					{
						displayName: 'Lead Type',
						name: 'leadType',
						type: 'options',
						options: LEAD_TYPE_OPTIONS,
						default: 'buyer',
						description: 'Whether the lead is a buyer or a seller',
						routing: {
							send: {
								type: 'body',
								property: 'leadType',
							},
						},
					},
					{
						displayName: 'Phone Number',
						name: 'phoneNumber',
						type: 'string',
						default: '',
						placeholder: 'e.g. +34600123456',
						description:
							'New phone number in international E.164 format, including the country code with a leading + (e.g. +34600123456). Numbers without a country code are rejected.',
						routing: {
							send: {
								type: 'body',
								property: 'phoneNumber',
							},
						},
					},
				],
			},
			{
				displayName: 'CRM Status',
				name: 'crmStatus',
				type: 'options',
				options: CRM_STATUS_OPTIONS,
				required: true,
				default: 'lead',
				displayOptions: {
					show: {
						resource: ['lead'],
						operation: ['updateStatus'],
					},
				},
				description: 'New CRM status of the lead',
				routing: {
					send: {
						type: 'body',
						property: 'crmStatus',
					},
				},
			},
			{
				displayName: 'Deal ID',
				name: 'dealId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['deal'],
						operation: ['changeStage', 'closeLost', 'closeWon', 'get'],
					},
				},
				description: 'UUID of the deal',
			},
			{
				displayName: 'Stage',
				name: 'stage',
				type: 'options',
				options: DEAL_STAGE_OPTIONS,
				required: true,
				default: 'qualified',
				displayOptions: {
					show: {
						resource: ['deal'],
						operation: ['changeStage'],
					},
				},
				description: 'Stage to move the deal to',
				routing: {
					send: {
						type: 'body',
						property: 'stage',
					},
				},
			},
			{
				displayName: 'Lost Reason',
				name: 'lostReason',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['deal'],
						operation: ['closeLost'],
					},
				},
				description: 'Optional free-text reason the deal was lost',
				routing: {
					send: {
						type: 'body',
						property: 'lostReason',
					},
				},
			},
			{
				displayName: 'Lead ID',
				name: 'leadId',
				type: 'number',
				required: true,
				default: 0,
				displayOptions: {
					show: {
						resource: ['deal'],
						operation: ['create'],
					},
				},
				description: 'Numeric ID of the lead the deal belongs to',
				routing: {
					send: {
						type: 'body',
						property: 'leadId',
					},
				},
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['deal'],
						operation: ['create'],
					},
				},
				description: 'Title of the deal',
				routing: {
					send: {
						type: 'body',
						property: 'title',
					},
				},
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['deal'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Amount',
						name: 'amount',
						type: 'number',
						default: 0,
						description:
							'Monetary value of the deal, in the currency configured for your organization',
						routing: {
							send: {
								type: 'body',
								property: 'amount',
							},
						},
					},
					{
						displayName: 'Assignee Names or IDs',
						name: 'assigneeIds',
						type: 'multiOptions',
						typeOptions: {
							loadOptionsMethod: 'getAssignees',
						},
						default: [],
						description:
							'Users to assign the deal to. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
						routing: {
							send: {
								type: 'body',
								property: 'assigneeIds',
							},
						},
					},
					{
						displayName: 'Expected Close Date',
						name: 'expectedCloseAt',
						type: 'dateTime',
						default: '',
						description: 'When the deal is expected to close',
						routing: {
							send: {
								type: 'body',
								property: 'expectedCloseAt',
							},
						},
					},
					{
						displayName: 'Stage',
						name: 'stage',
						type: 'options',
						options: DEAL_STAGE_OPTIONS,
						default: 'qualified',
						description: 'Stage to create the deal in',
						routing: {
							send: {
								type: 'body',
								property: 'stage',
							},
						},
					},
				],
			},
			{
				displayName: 'Lead ID',
				name: 'leadId',
				type: 'number',
				required: true,
				default: 0,
				displayOptions: {
					show: {
						resource: ['deal'],
						operation: ['getMany'],
					},
				},
				description: 'Numeric ID of the lead to list deals for',
			},
			{
				displayName: 'Lead ID',
				name: 'leadId',
				type: 'number',
				required: true,
				default: 0,
				displayOptions: {
					show: {
						resource: ['note'],
						operation: ['create'],
					},
				},
				description: 'Numeric ID of the lead to add the note to',
			},
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['note'],
						operation: ['create'],
					},
				},
				description: 'Text content of the note',
				routing: {
					send: {
						type: 'body',
						property: 'content',
					},
				},
			},
			{
				displayName: 'Lead ID',
				name: 'leadId',
				type: 'number',
				required: true,
				default: 0,
				displayOptions: {
					show: {
						resource: ['tag'],
						operation: ['add', 'get'],
					},
				},
				description: 'Numeric ID of the lead',
			},
			{
				displayName: 'Tag Names or IDs',
				name: 'tags',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTags',
				},
				default: [],
				displayOptions: {
					show: {
						resource: ['tag'],
						operation: ['add'],
					},
				},
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				hint: 'Picked tags bind stable IDs (rename-proof). Plain names that do not exist are created automatically; IDs must match existing tags and are never created.',
				routing: {
					send: {
						type: 'body',
						property: 'tags',
					},
				},
			},
			{
				displayName: 'Lead ID',
				name: 'leadId',
				type: 'number',
				required: true,
				default: 0,
				displayOptions: {
					show: {
						resource: ['task'],
						operation: ['create'],
					},
				},
				description: 'Numeric ID of the lead to create the task for',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['task'],
						operation: ['create'],
					},
				},
				description: 'Title of the task',
				routing: {
					send: {
						type: 'body',
						property: 'title',
					},
				},
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['task'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Assignee Names or IDs',
						name: 'assigneeIds',
						type: 'multiOptions',
						typeOptions: {
							loadOptionsMethod: 'getAssignees',
						},
						default: [],
						description:
							'Users to assign the task to. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
						routing: {
							send: {
								type: 'body',
								property: 'assigneeIds',
							},
						},
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						typeOptions: {
							rows: 3,
						},
						default: '',
						description: 'Longer description of the task',
						routing: {
							send: {
								type: 'body',
								property: 'description',
							},
						},
					},
					{
						displayName: 'Due Date',
						name: 'dueDate',
						type: 'dateTime',
						default: '',
						description: 'When the task is due',
						routing: {
							send: {
								type: 'body',
								property: 'dueDate',
							},
						},
					},
				],
			},
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['user'],
						operation: ['get'],
					},
				},
				description:
					'The user ID (user_…) to resolve, taken from a lead assigneeIds value or from lead.assigned added/removed',
			},
		],
	};

	methods = {
		loadOptions: {
			async getTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return await fondaroOptionsRequest.call(this, '/integrations/v1/options/tags?value=id');
			},
			async getAssignees(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return await fondaroOptionsRequest.call(this, '/integrations/v1/options/assignees');
			},
			async getLeadSources(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return await fondaroOptionsRequest.call(this, '/integrations/v1/options/lead-sources');
			},
		},
	};
}
