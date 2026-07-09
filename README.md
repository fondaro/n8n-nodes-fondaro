# n8n-nodes-fondaro

This is an n8n community node package for [Fondaro](https://fondaro.com), the real estate CRM. It lets you create and update leads, deals, tasks, notes and tags, read a lead's activity and call log (with call outcomes) from your n8n workflows, and start workflows the moment things happen in your Fondaro CRM — new leads, status changes, logged calls, and deal and task events.

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
| Lead | Get Activities | Read a lead's activity feed — notes, tasks, emails, status changes and call attempts with their outcomes |
| Lead | Search | Free text search across leads, with limit and offset |
| Lead | Update Contact | Update name, email, phone, lead type or language |
| Lead | Update Status | Set the CRM status |
| Deal | Create | Create a deal for a lead |
| Deal | Change Stage | Move a deal to a different stage |
| Deal | Close Won | Mark a deal as won |
| Deal | Close Lost | Mark a deal as lost, with an optional free-text reason |
| Deal | Get | Get a deal by its ID |
| Deal | Get Many | List all deals on a lead |
| Task | Create | Create a task on a lead |
| Note | Create | Add a note to a lead |
| Tag | Add | Add tags to a lead by name or ID (additive; missing names are created, IDs must exist) |
| Tag | Get | Read a lead's current set of tags |
| User | List | List your team members with their email, name and role |
| User | Get | Resolve one team member (email, name, role) by their `user_…` ID |

Lead IDs are numbers. Deal, task, note and subscription IDs are UUID strings. Team-member IDs are Clerk `user_…` strings — the same values you see in a lead's `assigneeIds` and on the `lead.assigned` event.

The node can also be used as a tool by n8n AI agents.

### Find returns purchased leads only

The **Lead > Find** operation returns only leads that have been purchased into your CRM. A 404 response means no purchased lead matched the identifier, not that your key is broken or the API is down.

### Dropdown values

Tag and assignee dropdowns load live from your organization. Since 1.4.0 the tag dropdowns bind stable tag **IDs** (shown by name), so a picked tag keeps working after it is renamed or merged in the dashboard; workflows saved with older versions hold names, which the API still accepts. In the `tags` field, a plain name that does not exist is created automatically, while a UUID-shaped entry must match an existing tag and is never created. The status and stage dropdowns are fixed lists, kept in sync with Fondaro:

- CRM status: `lead`, `potential`, `bad_timing`, `client`, `unqualified`
- Lead type: `buyer`, `seller`
- Deal stage: `qualified`, `viewing`, `offer`, `reserved`, `under_contract`

Deal currency is controlled by your organization settings in Fondaro; the node never sends a currency. A 400 on deal creation means the organization has no billing currency set yet.

**`lead` is the entry status; the dashboard labels it "New".** They are the same value — the dropdown shows **New**, the API value is `lead`.

**There is no `unassigned` status.** A lead is *unassigned* when its `assigneeIds` is empty — it still has a status (usually `lead`/New). Read assignment from `assigneeIds`, not from `status`. The `lead.created`, `lead.statusChanged` and `lead.assigned` events all carry `assigneeIds`, so you can compute "unassigned" directly with `data.assigneeIds.length === 0`, no extra lookup.

### Reading activity and call outcomes

**Lead > Get Activities** returns a lead's unified, paginated activity feed: notes, tasks, emails, status changes, deal-stage changes, assignee changes and **call attempts with their outcomes**. Each entry is `{ type, occurredAt, …type-specific fields }`; the response is `{ entries, total, hasMore }`.

- Optional **Limit** (1–100, default 20) and **Offset** for paging.
- Optional **Types** — a comma-separated filter, e.g. `call` to fetch only the call log, or `call,note,status-change`. Valid values: `call`, `note`, `task-created`, `task-completed`, `email`, `status-change`, `deal-stage-change`, `deal-won`, `deal-lost`, `assignee-change`, `lead-created`.

A call entry looks like:

```json
{
  "type": "call",
  "occurredAt": "2026-06-15T10:00:00.000Z",
  "call": {
    "id": "…",
    "direction": "outbound",
    "outcome": "no_answer",
    "status": "no-answer",
    "durationSeconds": 0,
    "startedAt": "…",
    "endedAt": "…",
    "hasRecording": false
  }
}
```

`outcome` is the call result: `success` (connected), `no_answer` (tried, nobody picked up), `invalid_number`, `bad_timing`, `not_interested`. Transcripts and recording URLs are never included — only `hasRecording`.

**Call summary on the lead record.** Every **Lead > Get / Find / Search** result now also carries the latest call summary, so you can branch a flow without a separate Get Activities call:

| Field | Meaning |
|---|---|
| `totalCalls` | Number of calls placed/received. `0` ⇒ assigned but never called. |
| `lastCallStatus` | Outcome of the most recent call. `no_answer` ⇒ called, nobody picked up. |
| `lastCallAt` | When the most recent call happened. |
| `lastCallDirection` | `inbound` or `outbound`. |

This answers "assigned-but-not-called yet" (`totalCalls === 0`) vs "called, no answer" (`lastCallStatus === 'no_answer'`) — the distinction the CRM status enum does not encode.

### Resolving a team member (User resource)

Events and a lead's `assigneeIds` give you the assignee as a Clerk `user_…` ID, not an email. The **User** resource turns that ID into a real person:

- **User > List** → every team member as `{ id, firstName, lastName, email, role, imageUrl }`.
- **User > Get** (takes a `User ID`) → that one member, or a 404 if the ID is not a member of your organization.

This needs the `users:read` scope on your API key. Keys minted with the default "everything" scope already have it; a key with a hand-picked scope set must have `users:read` granted.

> This is distinct from the assignee dropdown used when *creating* a lead/deal/task (that's a design-time picker). **User > Get** is for resolving an ID to an email at *run time* inside a flow.

#### Speed-to-lead recipe

To alert the rep a lead was just assigned to:

1. **Fondaro Trigger** on **Lead Assigned**.
2. **Fondaro → User → Get** with `User ID` set to `{{$json["data"]["added"][0]}}` (or `{{$json["data"]["assigneeIds"][0]}}`).
3. Send the notification to the resolved `email`.

No hardcoded name→ID map — new hires resolve automatically.

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
| Lead Tagged | `lead.tagged` |
| Lead Untagged | `lead.untagged` |
| Call Logged | `call.logged` |
| Call Analyzed | `call.analyzed` |

Most webhook payloads contain IDs and CRM state only, never contact details. The one exception is **`call.analyzed`** (see below), which is opt-in and content-bearing. Fetch full records back through the Fondaro action node.

#### Enriched routing fields

So you can route without a follow-up lookup, the lead and deal events carry the relevant non-PII state inline:

| Event | Extra `data` fields |
|---|---|
| `lead.created` | `status`, `assigneeIds` |
| `lead.statusChanged` | `assigneeIds` (current owner set) |
| `lead.assigned` | `assigneeIds` (resulting full set), `status` |
| `deal.created` | `leadId`, `stage`, `value` |
| `deal.stageChanged` | `leadId` |
| `deal.won` | `leadId`, `value` |
| `deal.lost` | `leadId` |
| `lead.tagged` | `tagId`, `changedBy` (one delivery per tag added) |
| `lead.untagged` | `tagId`, `changedBy` (one delivery per tag removed) |

**Resolving a `tagId` to its name:** call `GET /integrations/v1/tags/{tagId}` (scope `tags:read`) with an HTTP Request node — it returns `{ id, name, color, archivedAt }` and works for archived tags. For `lead.tagged` events the Fondaro node's **Tag > Get** on the lead also works; for `lead.untagged` the id lookup is the only way, since the tag is no longer in the lead's set.

**Filtering tag events:** the trigger node has an optional **Only for Tags** field (shown when Lead Tagged/Untagged is selected). Non-matching deliveries are acknowledged and dropped inside the node, by stable tag ID, so the filter survives renames. Note that merging tags in the dashboard deliberately fires **no** `lead.tagged` events for the re-pointed leads — a merge is a catalogue correction, not thousands of lead events.

`value` is the deal's own amount (the sale figure you entered) in your organization's currency — not Fondaro's lead pricing, which is never emitted. `status` is the CRM status (`lead`/New, `potential`, …); `assigneeIds` is the set of `user_…` IDs the lead is assigned to (empty ⇒ unassigned). A `lead.assigned` delivery, for example:

```json
{
  "organizationId": "…",
  "leadId": 123,
  "added": ["user_abc"],
  "removed": [],
  "assigneeIds": ["user_abc"],
  "status": "lead",
  "changedBy": "user_admin"
}
```

> Ordering note: for leads created through this node, auto-routing assigns the owner *after* the create commits, so `lead.created` may carry an empty `assigneeIds` for those leads.

**`call.logged`** fires the first time a call reaches a terminal state, for both outbound and inbound calls attached to a lead. The `data` carries the outcome but no PII:

```json
{
  "organizationId": "…",
  "leadId": 123,
  "callId": "…",
  "direction": "outbound",
  "outcome": "no_answer",
  "status": "no-answer",
  "durationSeconds": 0,
  "missed": true,
  "occurredAt": "2026-06-15T10:00:00.000Z"
}
```

It does **not** fire for calls from unknown numbers that aren't matched to a lead (there is nothing for a lead-centric automation to act on). Use **Lead > Get Activities** to read the full call log back.

**`call.analyzed`** fires separately, when a call's AI analysis is ready (summary, sentiment, lead interest, objections, next steps). It's distinct from `call.logged`, which still carries the carrier-level outcome unchanged. Analysis runs asynchronously and only after a transcript exists, so this arrives after `call.logged` (and only for calls that get analyzed). The `data`:

```json
{
  "organizationId": "…",
  "leadId": 123,
  "callId": "…",
  "direction": "outbound",
  "occurredAt": "2026-06-15T10:05:00.000Z",
  "analysis": {
    "summary": "…",
    "sentiment": "positive",
    "leadInterest": "high",
    "objections": ["price"],
    "nextSteps": ["send brochure"],
    "coachingTips": ["…"],
    "keyTopics": ["financing"]
  }
}
```

> **Content-bearing event — opt in deliberately.** Unlike every other event, `call.analyzed` carries an AI-generated `summary` (free text) that **may mention names, numbers or other details spoken on the call**. It carries no transcript or recording URL. It only arrives if you subscribe to **Call Analyzed**; it never rides the other events.

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
