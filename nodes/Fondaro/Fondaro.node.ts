import {
	NodeConnectionTypes,
	type ILoadOptionsFunctions,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

const CRM_STATUS_OPTIONS: INodePropertyOptions[] = [
	{ name: 'Bad Timing', value: 'bad_timing' },
	{ name: 'Client', value: 'client' },
	{ name: 'Lead', value: 'lead' },
	{ name: 'Potential', value: 'potential' },
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
		icon: 'file:fondaro.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Create, find and update Fondaro CRM leads, deals, tasks, notes and tags',
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
				],
				default: 'lead',
			},

			// ----------------------------------
			//             Lead
			// ----------------------------------
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
						description: 'Get a lead by its ID',
						routing: {
							request: {
								method: 'GET',
								url: '=/integrations/v1/leads/{{$parameter.leadId}}',
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

			// Lead: Create
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
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['lead'],
						operation: ['create'],
					},
				},
				description: 'Email address of the lead',
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
						placeholder: 'e.g. en',
						description: 'Preferred language of the lead as a BCP-47 tag, for example en or es',
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
						description: 'Phone number of the lead',
						routing: {
							send: {
								type: 'body',
								property: 'phoneNumber',
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

			// Lead: Find
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

			// Lead: Get / Update Contact / Update Status
			{
				displayName: 'Lead ID',
				name: 'leadId',
				type: 'number',
				required: true,
				default: 0,
				displayOptions: {
					show: {
						resource: ['lead'],
						operation: ['get', 'updateContact', 'updateStatus'],
					},
				},
				description: 'Numeric ID of the lead',
			},

			// Lead: Search
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

			// Lead: Update Contact
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
						description: 'New preferred language of the lead as a BCP-47 tag',
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
						description: 'New phone number of the lead',
						routing: {
							send: {
								type: 'body',
								property: 'phoneNumber',
							},
						},
					},
				],
			},

			// Lead: Update Status
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

			// ----------------------------------
			//             Deal
			// ----------------------------------
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

			// Deal: Change Stage / Get
			{
				displayName: 'Deal ID',
				name: 'dealId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['deal'],
						operation: ['changeStage', 'get'],
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

			// Deal: Create
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

			// Deal: Get Many
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

			// ----------------------------------
			//             Note
			// ----------------------------------
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

			// ----------------------------------
			//             Tag
			// ----------------------------------
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
							'Add tags to a lead by name. Tags are additive and missing tags are created automatically.',
						routing: {
							request: {
								method: 'POST',
								url: '=/integrations/v1/leads/{{$parameter.leadId}}/tags',
							},
						},
					},
				],
				default: 'add',
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
						operation: ['add'],
					},
				},
				description: 'Numeric ID of the lead to tag',
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
					'Tags to add to the lead. Missing tags are created automatically. Choose from the list, or specify names using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				routing: {
					send: {
						type: 'body',
						property: 'tags',
					},
				},
			},

			// ----------------------------------
			//             Task
			// ----------------------------------
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
		],
	};

	methods = {
		loadOptions: {
			async getTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return await fondaroOptionsRequest.call(this, '/integrations/v1/options/tags');
			},
			async getAssignees(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return await fondaroOptionsRequest.call(this, '/integrations/v1/options/assignees');
			},
		},
	};
}
