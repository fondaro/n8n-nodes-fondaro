import { createHmac, timingSafeEqual } from 'node:crypto';

import {
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type IHookFunctions,
	type IHttpRequestMethods,
	type ILoadOptionsFunctions,
	type INodeType,
	type INodePropertyOptions,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
	type JsonObject,
} from 'n8n-workflow';

/**
 * Maximum allowed age, in seconds, between the X-Fondaro-Timestamp header and
 * the time the delivery is verified. Deliveries outside this window are
 * rejected so a captured payload cannot be replayed later.
 */
const FRESHNESS_WINDOW_SECONDS = 300;

async function fondaroApiRequest(
	this: IHookFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body?: IDataObject,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('fondaroApi');
	try {
		return (await this.helpers.httpRequestWithAuthentication.call(this, 'fondaroApi', {
			method,
			baseURL: credentials.baseUrl as string,
			url: endpoint,
			body,
			json: true,
		})) as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export class FondaroTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Fondaro Trigger',
		name: 'fondaroTrigger',
		icon: {
			light: 'file:fondaro.svg',
			dark: 'file:fondaro.dark.svg',
		},
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description:
			'Starts the workflow on real-time Fondaro CRM events — new lead, lead status changed, call logged, call analyzed, deal and task events — delivered as signed webhooks',
		defaults: {
			name: 'Fondaro Trigger',
		},
		usableAsTool: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'fondaroApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				options: [
					{
						name: 'Call Analyzed',
						value: 'call.analyzed',
						description:
							"Triggers when a call's AI analysis (summary, sentiment, interest, objections) is ready",
					},
					{
						name: 'Call Logged',
						value: 'call.logged',
						description:
							'Triggers when a call is logged on a lead, with its outcome (e.g. no answer, success)',
					},
					{
						name: 'Deal Created',
						value: 'deal.created',
						description: 'Triggers when a deal is created',
					},
					{
						name: 'Deal Lost',
						value: 'deal.lost',
						description: 'Triggers when a deal is marked as lost',
					},
					{
						name: 'Deal Stage Changed',
						value: 'deal.stageChanged',
						description: 'Triggers when a deal moves to a different stage',
					},
					{
						name: 'Deal Won',
						value: 'deal.won',
						description: 'Triggers when a deal is marked as won',
					},
					{
						name: 'Lead Assigned',
						value: 'lead.assigned',
						description: 'Triggers when a lead is assigned to a user',
					},
					{
						name: 'Lead Status Changed',
						value: 'lead.statusChanged',
						description: 'Triggers when the CRM status of a lead changes',
					},
					{
						name: 'Lead Tagged',
						value: 'lead.tagged',
						description:
							'Triggers when a tag is added to a lead (one event per tag)',
					},
					{
						name: 'Lead Untagged',
						value: 'lead.untagged',
						description:
							'Triggers when a tag is removed from a lead (one event per tag)',
					},
					{
						name: 'New Lead',
						value: 'lead.created',
						description: 'Triggers when a new lead is created in the CRM',
					},
					{
						name: 'Note Created',
						value: 'note.created',
						description: 'Triggers when a note is added to a lead',
					},
					{
						name: 'Task Completed',
						value: 'task.completed',
						description: 'Triggers when a task is completed',
					},
					{
						name: 'Task Created',
						value: 'task.created',
						description: 'Triggers when a task is created',
					},
				],
				description: 'The Fondaro events that should trigger this workflow',
			},
			{
				displayName: 'Only for Tags',
				name: 'tagFilter',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTags',
				},
				default: [],
				displayOptions: {
					show: {
						events: ['lead.tagged', 'lead.untagged'],
					},
				},
				description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				hint: 'Only start the workflow when the tagged/untagged event concerns one of these tags. Leave empty for all tags. Filtered by stable tag ID inside this node, so it survives renames; other event types are never filtered.',
			},
		],
	};

	methods = {
		loadOptions: {
			async getTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const options = await fondaroApiRequest.call(
					this,
					'GET',
					'/integrations/v1/options/tags?value=id',
				);
				return options as unknown as INodePropertyOptions[];
			},
		},
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				if (!staticData.subscriptionId) {
					return false;
				}
				try {
					const subscription = await fondaroApiRequest.call(
						this,
						'GET',
						`/integrations/v1/subscriptions/${staticData.subscriptionId}`,
					);
					return subscription.isActive === true;
				} catch {
					// 404 or any failure: treat the subscription as gone and re-register
					delete staticData.subscriptionId;
					delete staticData.subscriptionSecret;
					return false;
				}
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const events = this.getNodeParameter('events') as string[];
				if (!Array.isArray(events) || events.length === 0) {
					throw new NodeOperationError(this.getNode(), 'Select at least one event to listen to');
				}
				const targetUrl = this.getNodeWebhookUrl('default');
				const response = await fondaroApiRequest.call(
					this,
					'POST',
					'/integrations/v1/subscriptions',
					{
						eventTypes: events,
						targetUrl,
					},
				);
				if (!response.id || !response.secret) {
					throw new NodeOperationError(
						this.getNode(),
						'Fondaro did not return a subscription ID and secret',
					);
				}
				const staticData = this.getWorkflowStaticData('node');
				staticData.subscriptionId = response.id;
				staticData.subscriptionSecret = response.secret;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				if (staticData.subscriptionId) {
					try {
						await fondaroApiRequest.call(
							this,
							'DELETE',
							`/integrations/v1/subscriptions/${staticData.subscriptionId}`,
						);
					} catch (error) {
						this.logger.warn(
							'Failed to delete the Fondaro subscription during workflow deactivation',
							{
								error,
								subscriptionId: staticData.subscriptionId,
							},
						);
					}
				}
				delete staticData.subscriptionId;
				delete staticData.subscriptionSecret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const res = this.getResponseObject();
		const headers = this.getHeaderData() as IDataObject;
		const staticData = this.getWorkflowStaticData('node');

		const reject = (message: string): IWebhookResponseData => {
			res.status(401).json({ message });
			return { noWebhookResponse: true };
		};

		const secret = staticData.subscriptionSecret as string | undefined;
		if (!secret) {
			return reject('No subscription secret is available to verify this delivery');
		}

		const signatureHeader = headers['x-fondaro-signature'] as string | undefined;
		const timestampHeader = headers['x-fondaro-timestamp'] as string | undefined;
		if (!signatureHeader || !timestampHeader) {
			return reject('Missing signature or timestamp header');
		}

		const timestamp = Number(timestampHeader);
		if (!Number.isInteger(timestamp)) {
			return reject('Invalid timestamp header');
		}
		const nowSeconds = Math.floor(Date.now() / 1000);
		if (Math.abs(nowSeconds - timestamp) > FRESHNESS_WINDOW_SECONDS) {
			return reject('Delivery timestamp is outside the allowed freshness window');
		}

		// The signature is computed over the exact raw request bytes, so the raw
		// body must be used here, never a re-serialization of the parsed body.
		const request = this.getRequestObject() as { rawBody?: Buffer };
		const rawBody =
			request.rawBody ?? Buffer.from(JSON.stringify(this.getBodyData() ?? {}), 'utf8');

		const signedPayload = Buffer.concat([Buffer.from(`${timestampHeader}.`, 'utf8'), rawBody]);
		const expectedSignature = createHmac('sha256', secret).update(signedPayload).digest();

		const providedHex = signatureHeader.startsWith('sha256=')
			? signatureHeader.slice('sha256='.length)
			: signatureHeader;
		const providedSignature = Buffer.from(providedHex, 'hex');

		if (
			providedSignature.length !== expectedSignature.length ||
			!timingSafeEqual(providedSignature, expectedSignature)
		) {
			return reject('Signature verification failed');
		}

		// Optional client-side tag filter (tags-v2): a non-matching tagged/
		// untagged delivery is acked with 200 so Fondaro never retries, but the
		// workflow is not started. Filtering is by stable tag ID (rename-proof);
		// every other event type passes through untouched.
		const body = this.getBodyData() as IDataObject;
		const eventType = body.event as string | undefined;
		if (eventType === 'lead.tagged' || eventType === 'lead.untagged') {
			const tagFilter = this.getNodeParameter('tagFilter', []) as string[];
			if (Array.isArray(tagFilter) && tagFilter.length > 0) {
				const data = body.data as IDataObject | undefined;
				const tagId = typeof data?.tagId === 'string' ? data.tagId : undefined;
				if (!tagId || !tagFilter.includes(tagId)) {
					res.status(200).json({ filtered: true });
					return { noWebhookResponse: true };
				}
			}
		}

		return {
			workflowData: [this.helpers.returnJsonArray(body)],
		};
	}
}
