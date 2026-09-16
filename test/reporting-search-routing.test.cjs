const test = require('node:test');
const assert = require('node:assert/strict');
const { Fondaro } = require('../dist/nodes/Fondaro/Fondaro.node.js');
const description = new Fondaro().description;
const props = description.properties;
function operation(resource, value) {
	return props
		.find((p) => p.name === 'operation' && p.displayOptions.show.resource.includes(resource))
		.options.find((option) => option.value === value);
}
function field(name, resource, op) {
	return props.find(
		(p) =>
			p.name === name &&
			p.displayOptions?.show.resource.includes(resource) &&
			p.displayOptions.show.operation.includes(op),
	);
}
test('keeps credential and ordinary search contracts', () => {
	assert.deepEqual(
		description.credentials.map((c) => c.name),
		['fondaroApi'],
	);
	assert.equal(operation('lead', 'search').routing.request.url, '/integrations/v1/leads/search');
	assert.equal(operation('lead', 'search').routing.request.method, 'GET');
});
test('call and viewing routes preserve page envelopes and expose all intersecting filters', () => {
	assert.equal(
		operation('lead', 'getCalls').routing.request.url,
		'=/integrations/v1/leads/{{$parameter.leadId}}/calls',
	);
	assert.ok(field('leadId', 'lead', 'getCalls'));
	for (const resource of ['lead', 'viewing']) {
		const op = operation(resource, resource === 'lead' ? 'getCalls' : 'getMany');
		assert.equal(op.routing.output, undefined);
	}
	assert.equal(
		operation('viewing', 'get').routing.request.url,
		'=/integrations/v1/viewings/{{$parameter.viewingId}}',
	);
	assert.equal(operation('viewing', 'getMany').routing.request.url, '/integrations/v1/viewings');
	const filters = field('viewingFilters', 'viewing', 'getMany').options;
	assert.deepEqual(
		filters.map((f) => f.routing.send.property).sort(),
		[
			'agentUserId',
			'collaboratorLeadId',
			'dealId',
			'from',
			'kind',
			'leadId',
			'limit',
			'offset',
			'propertyListingId',
			'status',
			'to',
		].sort(),
	);
	assert.equal(filters.find((f) => f.name === 'limit').typeOptions.maxValue, 100);
});
test('semantic adapters preserve ranked response envelopes and route body filters', () => {
	for (const [value, url] of [
		['semanticSearch', 'semantic-search'],
		['matchToListing', 'listing-match'],
	]) {
		const op = operation('lead', value);
		assert.equal(op.routing.request.url, `/integrations/v1/leads/${url}`);
		assert.equal(op.routing.request.method, 'POST');
		assert.equal(op.routing.output, undefined);
	}
	assert.equal(field('semanticQuery', 'lead', 'semanticSearch').routing.send.property, 'query');
	assert.deepEqual(
		field('semanticFields', 'lead', 'semanticSearch').options.map((f) => f.routing.send.property),
		['leadId', 'occurredFrom', 'occurredTo'],
	);
	assert.equal(field('maxResults', 'lead', 'semanticSearch').typeOptions.maxValue, 30);
	const expression = operation('lead', 'matchToListing').routing.request.body.slice(3, -2).trim();
	const evaluate = new Function('$parameter', `return (${expression});`);
	assert.deepEqual(
		evaluate({ listingIdentity: 'own', matchPropertyListingId: 'uuid', maxResults: 10 }),
		{ propertyListingId: 'uuid', maxResults: 10 },
	);
	assert.deepEqual(
		evaluate({
			listingIdentity: 'source',
			listingSource: 'resales_online',
			listingSourceId: 'native-id',
			maxResults: 20,
		}),
		{ listingRef: { source: 'resales_online', id: 'native-id' }, maxResults: 20 },
	);
});
test('activity Types help includes viewing and document-attached', () => {
	const types = field('additionalFields', 'lead', 'getActivities').options.find(
		(f) => f.name === 'types',
	);
	assert.match(types.description, /viewing/);
	assert.match(types.description, /document-attached/);
});
