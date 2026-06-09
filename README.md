# n8n-nodes-fondaro

This is an n8n community node package for [Fondaro](https://fondaro.com), the real estate CRM. It lets you create and update leads, deals, tasks, notes and tags from your n8n workflows, and start workflows when things happen in your Fondaro CRM.

The package ships three nodes:

| Node | Type | What it does |
|---|---|---|
| **Fondaro** | Action | Create, find and update leads, deals, tasks, notes and tags |
| **Fondaro Trigger** | Webhook trigger | Starts a workflow the moment a CRM event happens, delivered as a signed webhook |
| **Fondaro Polling Trigger** | Polling trigger | Starts a workflow by polling for new leads, for instances that cannot receive webhooks |

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Installation

### Self-hosted n8n (GUI)

1. Open **Settings > Community Nodes**.
2. Select **Install**.
3. Enter `n8n-nodes-fondaro` and confirm.

See the [n8n community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) for details.

### Self-hosted n8n (CLI)

Install the package into your n8n user folder (usually `~/.n8n/nodes`):

```bash
cd ~/.n8n/nodes
npm i n8n-nodes-fondaro
```

Restart n8n afterwards.

### Environment bootstrap

For containerized or declarative setups you can have n8n install the package on boot:

```bash
N8N_COMMUNITY_PACKAGES_MANAGED_BY_ENV=true
N8N_COMMUNITY_PACKAGES='[{"name":"n8n-nodes-fondaro","version":"1.0.0"}]'
```

## Credentials

### Creating a Fondaro API key

1. In the Fondaro dashboard, go to **Organization > Integrations > n8n**.
2. Select **Generate key** and give the key a name.
3. Copy the key immediately. It is shown exactly once and cannot be retrieved later. Keys look like `fdr_n8n_` followed by 32 hex characters.

### Setting up the credential in n8n

1. In n8n, create a new **Fondaro API** credential.
2. Paste the API key.
3. Leave the **Base URL** at `https://api.fondaro.com` unless Fondaro support has told you otherwise.
4. Save. n8n tests the credential against the Fondaro `whoami` endpoint and shows your organization name on success.

An OAuth2 credential (**Fondaro OAuth2 API**) is also included for setups that prefer the OAuth2 authorization code flow, for example on n8n Cloud. The API key credential is the recommended path.

### Key rotation

To rotate a key: generate a new key in the Fondaro dashboard, swap it into the n8n credential, then revoke the old key. There is no in-place rotation; generate, swap, revoke.

## The Fondaro node (actions)

| Resource | Operation | Description |
|---|---|---|
| Lead | Create | Create a new lead |
| Lead | Find | Find one lead by email, phone or external ID |
| Lead | Get | Get a lead by its numeric ID |
| Lead | Search | Free text search across leads, with limit and offset |
| Lead | Update Contact | Update name, email, phone, lead type or language |
| Lead | Update Status | Set the CRM status |
| Deal | Create | Create a deal for a lead |
| Deal | Change Stage | Move a deal to a different stage |
| Deal | Get | Get a deal by its ID |
| Deal | Get Many | List all deals on a lead |
| Task | Create | Create a task on a lead |
| Note | Create | Add a note to a lead |
| Tag | Add | Add tags to a lead by name (additive, missing tags are created) |

Lead IDs are numbers. Deal, task, note and subscription IDs are UUID strings.

The node can also be used as a tool by n8n AI agents.

### Find returns purchased leads only

The **Lead > Find** operation returns only leads that have been purchased into your CRM. A 404 response means no purchased lead matched the identifier, not that your key is broken or the API is down.

### Dropdown values

Tag and assignee dropdowns load live from your organization. The status and stage dropdowns are fixed lists, kept in sync with Fondaro:

- CRM status: `lead`, `potential`, `bad_timing`, `client`, `unqualified`
- Lead type: `buyer`, `seller`
- Deal stage: `qualified`, `viewing`, `offer`, `reserved`, `under_contract`

Deal currency is controlled by your organization settings in Fondaro; the node never sends a currency. A 400 on deal creation means the organization has no billing currency set yet.

## The Fondaro Trigger node (webhooks)

The webhook trigger registers a subscription with Fondaro when the workflow is activated and removes it on deactivation. Fondaro then POSTs signed deliveries to your n8n webhook URL as events happen.

### Event catalog

| Event | Value |
|---|---|
| New Lead | `lead.created` |
| Lead Status Changed | `lead.statusChanged` |
| Lead Assigned | `lead.assigned` |
| Deal Created | `deal.created` |
| Deal Stage Changed | `deal.stageChanged` |
| Deal Won | `deal.won` |
| Deal Lost | `deal.lost` |
| Task Created | `task.created` |
| Task Completed | `task.completed` |
| Note Created | `note.created` |

Webhook payloads contain IDs only, never contact details. Fetch full records back through the Fondaro action node.

### Signature verification

Every delivery is signed. The node verifies each request before your workflow runs:

- Fondaro sends `X-Fondaro-Signature: sha256=<hex>`, `X-Fondaro-Event` and `X-Fondaro-Timestamp` headers.
- The signature is an HMAC-SHA256 of `timestamp.rawBody` using the per-subscription secret issued at registration.
- The node recomputes the signature over the raw request bytes, compares it in constant time, and rejects any delivery whose timestamp is more than 5 minutes old or in the future. Replayed or tampered deliveries get a 401 and are never passed to your workflow.

## The Fondaro Polling Trigger node

Use the polling trigger when your n8n instance cannot receive inbound webhooks, which is typical for self-hosted instances behind a firewall or NAT without a public URL. It polls Fondaro for new leads on the schedule you configure, dedupes on lead ID, and tracks its own cursor so each lead is emitted once. When you test the workflow manually it returns the latest leads as a sample.

If your instance is publicly reachable, prefer the webhook trigger: it is instant and cheaper on your rate limit.

## Rate limits

Every API key has its own request ceiling. The ceiling is generous for normal workflow volume, but a runaway loop will be throttled with `429` responses. Back off and retry, or slow the offending workflow down.

## Compatibility

Requires n8n 1.x and Node.js 20.15 or newer. The package has zero runtime dependencies.

## Resources

- [Fondaro](https://fondaro.com)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](LICENSE)
