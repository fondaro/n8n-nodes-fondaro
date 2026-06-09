import {
	NodeApiError,
	NodeConnectionTypes,
	type IDataObject,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type IPollFunctions,
	type JsonObject,
} from 'n8n-workflow';

/** Maximum number of lead IDs kept in the dedupe window in static data. */
const DEDUPE_WINDOW_SIZE = 200;

async function fetchNewLeads(this: IPollFunctions, since?: string): Promise<IDataObject[]> {
	const credentials = await this.getCredentials('fondaroApi');
	const qs: IDataObject = {};
	if (since) {
		qs.since = since;
	}
	try {
		const response = await this.helpers.httpRequestWithAuthentication.call(this, 'fondaroApi', {
			method: 'GET',
			baseURL: credentials.baseUrl as string,
			url: '/integrations/v1/triggers/leads/new',
			qs,
			json: true,
		});
		return Array.isArray(response) ? (response as IDataObject[]) : [];
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export class FondaroPollingTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Fondaro Polling Trigger',
		name: 'fondaroPollingTrigger',
		icon: 'file:fondaro.svg',
		group: ['trigger'],
		version: 1,
		description:
			'Starts the workflow by polling Fondaro for new leads. Use this on self-hosted n8n instances that cannot receive webhooks, for example behind a firewall.',
		defaults: {
			name: 'Fondaro Polling Trigger',
		},
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'fondaroApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				options: [
					{
						name: 'New Lead',
						value: 'lead.created',
						description: 'Triggers when a new lead is purchased into your CRM',
					},
				],
				default: 'lead.created',
				description: 'The event to poll for',
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		// Manual executions have no static data, so return the latest sample
		// statelessly for testing the workflow.
		if (this.getMode() === 'manual') {
			const sample = await fetchNewLeads.call(this);
			if (sample.length === 0) {
				return null;
			}
			return [this.helpers.returnJsonArray(sample)];
		}

		const staticData = this.getWorkflowStaticData('node');
		const lastTimeChecked = staticData.lastTimeChecked as string | undefined;

		// First activation: initialize the cursor to now so only leads purchased
		// from this point on are emitted.
		if (!lastTimeChecked) {
			staticData.lastTimeChecked = new Date().toISOString();
			staticData.seenLeadIds = [];
			return null;
		}

		const leads = await fetchNewLeads.call(this, lastTimeChecked);
		const seenLeadIds = Array.isArray(staticData.seenLeadIds)
			? (staticData.seenLeadIds as Array<number | string>)
			: [];

		const newLeads = leads.filter((lead) => {
			const id = lead.id as number | string | undefined;
			return id === undefined || !seenLeadIds.includes(id);
		});
		if (newLeads.length === 0) {
			return null;
		}

		// Advance the cursor to the latest purchasedAt seen in this batch.
		let cursor = lastTimeChecked;
		let cursorMillis = Date.parse(lastTimeChecked);
		for (const lead of newLeads) {
			const purchasedAt = lead.purchasedAt as string | undefined;
			if (!purchasedAt) {
				continue;
			}
			const millis = Date.parse(purchasedAt);
			if (Number.isFinite(millis) && millis > cursorMillis) {
				cursor = purchasedAt;
				cursorMillis = millis;
			}
		}

		// Remember the IDs sitting exactly on the new cursor so an inclusive
		// "since" cannot re-emit them on the next poll. If the cursor did not
		// move, extend the existing window instead of replacing it.
		const boundaryIds = newLeads
			.filter((lead) => lead.purchasedAt === cursor)
			.map((lead) => lead.id as number | string);
		const nextSeen = cursor === lastTimeChecked ? [...seenLeadIds, ...boundaryIds] : boundaryIds;

		staticData.lastTimeChecked = cursor;
		staticData.seenLeadIds = nextSeen.slice(-DEDUPE_WINDOW_SIZE);

		return [this.helpers.returnJsonArray(newLeads)];
	}
}
