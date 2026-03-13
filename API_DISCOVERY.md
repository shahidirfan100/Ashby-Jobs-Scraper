## Selected API
- Endpoint: `https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams`
- Method: `POST`
- Auth: None
- Pagination: None (returns full board list in one response)
- Purpose: Board-level job listing extraction (fast, no HTML parsing)

### Supporting endpoints used
- `https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobPosting`
  - Per-job detail enrichment
- `https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiOrganizationFromHostedJobsPageName`
  - Organization/company metadata

## Discovery Notes
- URLScan public search was used to inspect existing `jobs.ashbyhq.com/openai/*` scans.
- Live request capture confirmed the production GraphQL operations used by Ashby job pages:
  - `ApiJobBoardWithTeams`
  - `ApiJobPosting`
  - `ApiOrganizationFromHostedJobsPageName`

## Fields available
- Board endpoint fields:
  - `id`, `title`, `teamId`, `locationId`, `locationName`, `workplaceType`, `employmentType`, `secondaryLocations`, `compensationTierSummary`
  - Team metadata (`id`, `name`, `externalName`, `parentTeamId`)
- Detail endpoint fields:
  - `departmentName`, `departmentExternalName`, `locationAddress`, `descriptionHtml`, `isListed`, `isConfidential`, `teamNames`
  - `secondaryLocationNames`, `applicationDeadline`, `compensationTierGuideUrl`, `scrapeableCompensationSalarySummary`, `compensationPhilosophyHtml`
  - `applicationLimitCalloutHtml`, `shouldAskForTextingConsent`, `candidateTextingPrivacyPolicyUrl`, `candidateTextingTermsAndConditionsUrl`
  - `legalEntityNameForTextingConsent`, `automatedProcessingLegalNotice`, `compensationTiers`, `applicationForm`, `surveyForms`

## Fields currently missing in old actor (now added)
- `team_id`
- `location_id`
- `department_external_name`
- `team_names`
- `location_address`
- `compensation_tiers`
- `compensation_tier_guide_url`
- `compensation_philosophy_text`
- `is_confidential`
- `should_ask_for_texting_consent`
- `candidate_texting_privacy_policy_url`
- `candidate_texting_terms_url`
- `legal_entity_name_for_texting_consent`
- `automated_processing_legal_notice_rule_id`
- `automated_processing_legal_notice_text`

## Field count comparison
- Previous actor output (top-level): ~20 fields
- Updated API-based output (top-level): ~35 fields (depending on job completeness)

## Endpoint scoring (updater criteria)
- Returns JSON directly: +30
- Has >15 unique fields: +25
- No auth required: +20
- Has pagination support: +0 (not needed for this board API)
- Matches or extends current fields: +10

Total score: **85** (selected)
