# Ashby Jobs Scraper

Extract job listings from Ashby-powered career boards with clean, structured output. Collect titles, teams, locations, compensation summaries, and full job descriptions in a format that is ready for research, monitoring, and downstream automation.

## Features

- **Board-wide extraction** — Collect listings from an entire Ashby board from a single input URL.
- **Rich job details** — Enrich each listing with description text, compensation details, and application form question titles.
- **Clean dataset output** — Null and empty values are removed so records stay compact and easier to use.
- **Production-ready defaults** — Designed to complete quickly with practical QA-safe inputs.

## Use Cases

### Hiring Market Research
Track how companies describe roles, teams, and locations across Ashby job boards. Build datasets for title research, compensation review, and hiring trend analysis.

### Competitive Intelligence
Monitor hiring activity for specific departments, teams, or locations. Use repeatable runs to detect new openings and changes in role positioning over time.

### Recruiting Operations
Collect standardized listings for internal job boards, lead lists, or outreach planning. Keep sourcing teams focused on complete board coverage from a single URL.

### Job Feed Automation
Export Ashby job data into spreadsheets, dashboards, or workflow tools. Use the dataset as a reliable source for alerts, reporting, and sync jobs.

## Input Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `startUrl` | String | Yes | `"https://jobs.ashbyhq.com/openai/"` | Ashby board URL or a job URL on the same board |
| `collectDetails` | Boolean | No | `true` | When enabled, enriches each job with full description and application form details |
| `results_wanted` | Integer | No | `20` | Maximum number of jobs to save |
| `max_pages` | Integer | No | `1` | Compatibility field retained from the previous actor; Ashby boards return all jobs in a single page |
| `proxyConfiguration` | Object | No | `{"useApifyProxy": false}` | Optional proxy configuration for requests |

## Popular Ashby Company URLs

Use these ready-to-run board URLs directly in `startUrl`.

### AI And Product

| Company | Board URL |
|---------|-----------|
| OpenAI | `https://jobs.ashbyhq.com/openai/` |
| Snowflake | `https://jobs.ashbyhq.com/snowflake/` |
| Notion | `https://jobs.ashbyhq.com/notion/` |
| Cohere | `https://jobs.ashbyhq.com/cohere/` |
| Suno | `https://jobs.ashbyhq.com/suno/` |
| Ideogram | `https://jobs.ashbyhq.com/ideogram/` |

### Fintech And Global Operations

| Company | Board URL |
|---------|-----------|
| Deel | `https://jobs.ashbyhq.com/deel/` |
| Airwallex | `https://jobs.ashbyhq.com/airwallex/` |
| Ramp | `https://jobs.ashbyhq.com/ramp/` |
| Mercury | `https://jobs.ashbyhq.com/mercury/` |
| Neo Financial | `https://jobs.ashbyhq.com/neofinancial/` |

### Developer Tools And Infrastructure

| Company | Board URL |
|---------|-----------|
| Vercel | `https://jobs.ashbyhq.com/vercel/` |
| PostHog | `https://jobs.ashbyhq.com/posthog/` |
| Replit | `https://jobs.ashbyhq.com/replit/` |
| Linear | `https://jobs.ashbyhq.com/linear/` |
| 1Password | `https://jobs.ashbyhq.com/1password/` |

### Other Notable Companies

| Company | Board URL |
|---------|-----------|
| Vanta | `https://jobs.ashbyhq.com/vanta/` |
| Deliveroo | `https://jobs.ashbyhq.com/deliveroo/` |
| Reddit | `https://jobs.ashbyhq.com/reddit/` |
| Alan | `https://jobs.ashbyhq.com/alan/` |
| Aurora Solar | `https://jobs.ashbyhq.com/aurorasolar/` |
| Tajir | `https://jobs.ashbyhq.com/tajir/` |

Figma can be checked with `https://jobs.ashbyhq.com/figma/`, but Ashby slugs can change, so always verify before bulk runs.

### How To Verify Any Other Company

1. Replace `[companyname]` in `https://jobs.ashbyhq.com/[companyname]/`.
2. Open the URL in a browser.
3. If the board loads jobs, use that URL as `startUrl`.
4. If it fails, try common slug variants (for example `company-name`, `companyname`, or brand abbreviations).

## Output Data

Each item in the dataset contains:

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Ashby job posting identifier |
| `title` | String | Job title |
| `url` | String | Direct Ashby job URL |
| `company_name` | String | Company name when available |
| `department_name` | String | Department name for the role |
| `department_external_name` | String | Public-facing department label when available |
| `team_id` | String | Team identifier |
| `team_name` | String | Primary team label |
| `team_names` | Array | Team labels attached to the role |
| `location_id` | String | Primary location identifier |
| `location_name` | String | Primary location |
| `location_address` | String | Full location address when available |
| `secondary_location_names` | Array | Additional job locations |
| `workplace_type` | String | Workplace arrangement such as Remote, Hybrid, or On-site |
| `employment_type` | String | Employment type such as FullTime or Intern |
| `application_deadline` | String | Deadline when the job posting includes one |
| `compensation_tier_summary` | String | Compensation summary shown on the board |
| `compensation_tiers` | Array | Compensation tier objects with tier IDs and summaries |
| `compensation_tier_guide_url` | String | Compensation tier guide URL when provided |
| `compensation_salary_summary` | String | Salary summary from the job posting |
| `compensation_philosophy_text` | String | Compensation philosophy text in plain language |
| `description_html` | String | Full job description as HTML |
| `description_text` | String | Plain-text job description |
| `is_listed` | Boolean | Whether the job is currently listed |
| `is_confidential` | Boolean | Whether the role is marked confidential |
| `application_limit_callout_text` | String | Application limit notice when present |
| `application_form_question_titles` | Array | Titles of questions shown in the application form |
| `survey_question_titles` | Array | Titles of survey questions shown during application |
| `should_ask_for_texting_consent` | Boolean | Whether texting consent is requested |
| `candidate_texting_privacy_policy_url` | String | Candidate texting privacy policy URL |
| `candidate_texting_terms_url` | String | Candidate texting terms URL |
| `legal_entity_name_for_texting_consent` | String | Legal entity name used for texting consent |
| `automated_processing_legal_notice_rule_id` | String | Automated processing legal notice rule ID |
| `automated_processing_legal_notice_text` | String | Automated processing legal notice text |

## Usage Examples

### OpenAI Board Snapshot

```json
{
	"startUrl": "https://jobs.ashbyhq.com/openai/",
	"results_wanted": 20,
	"collectDetails": true
}
```

### Lightweight Board Snapshot

```json
{
	"startUrl": "https://jobs.ashbyhq.com/openai/",
	"results_wanted": 15,
	"collectDetails": false
}
```

### Different Company Board

```json
{
	"startUrl": "https://jobs.ashbyhq.com/supabase/",
	"results_wanted": 25,
	"collectDetails": false
}
```

## Sample Output

```json
{
	"id": "e72077d7-2aca-4752-a0f6-1ff9ffe13fdf",
	"title": "Full Stack Software Engineer, B2B Applications",
	"url": "https://jobs.ashbyhq.com/openai/e72077d7-2aca-4752-a0f6-1ff9ffe13fdf",
	"company_name": "OpenAI",
	"department_name": "Applied AI",
	"department_external_name": "Applied AI",
	"team_id": "29457f80-62c5-4420-b64b-53037e8dc25e",
	"team_name": "B2B Applications",
	"team_names": ["Applied AI", "B2B Applications"],
	"location_id": "bbd9f7fe-aae5-476a-9108-f25aea8f6cd2",
	"location_name": "San Francisco",
	"secondary_location_names": ["New York City"],
	"employment_type": "FullTime",
	"workplace_type": "Hybrid",
	"compensation_tier_summary": "$230K – $385K • Offers Equity",
	"compensation_salary_summary": "$230K - $385K",
	"is_listed": true,
	"is_confidential": false,
	"description_text": "About the Team ...",
	"application_form_question_titles": [
		"Name",
		"Email",
		"Phone Number",
		"LinkedIn"
	]
}
```

## Tips for Best Results

### Start From The Board URL
- Use the main Ashby board URL whenever possible.
- If you paste a job URL, the actor will normalize it back to the board before collecting listings.

### Balance Speed And Detail
- Keep `collectDetails` enabled when you need descriptions or application form questions.
- Disable detail collection for the fastest board-level inventory runs.

### Proxy Configuration

For most public Ashby boards, direct requests are enough. If you need a proxy, use:

```json
{
	"proxyConfiguration": {
		"useApifyProxy": true
	}
}
```

## Integrations

Connect your data with:

- **Google Sheets** — Build live hiring trackers and research sheets
- **Airtable** — Store structured job records for filtering and review
- **Slack** — Send notifications when matching roles appear
- **Webhooks** — Push fresh jobs into internal systems
- **Make** — Automate routing, enrichment, and alerts
- **Zapier** — Connect Ashby job data to business workflows

### Export Formats

Download data in multiple formats:

- **JSON** — Best for APIs and custom processing
- **CSV** — Easy spreadsheet analysis
- **Excel** — Business-friendly reporting
- **XML** — System-to-system integrations
