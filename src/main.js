import { Actor, log } from 'apify';
import { Dataset } from 'crawlee';
import { load as cheerioLoad } from 'cheerio';
import { gotScraping } from 'got-scraping';

await Actor.init();

const DETAIL_CONCURRENCY = 5;
const REQUEST_HEADERS = {
    'accept-language': 'en-US,en;q=0.9',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:147.0) Gecko/20100101 Firefox/147.0',
};

const JOB_BOARD_QUERY = `query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) {
  jobBoard: jobBoardWithTeams(
    organizationHostedJobsPageName: $organizationHostedJobsPageName
  ) {
    teams {
      id
      name
      externalName
      parentTeamId
      __typename
    }
    jobPostings {
      id
      title
      teamId
      locationId
      locationName
      workplaceType
      employmentType
      secondaryLocations {
        ...JobPostingSecondaryLocationParts
        __typename
      }
      compensationTierSummary
      __typename
    }
    __typename
  }
}

fragment JobPostingSecondaryLocationParts on JobPostingSecondaryLocation {
  locationId
  locationName
  __typename
}`;

const ORGANIZATION_QUERY = `query ApiOrganizationFromHostedJobsPageName($organizationHostedJobsPageName: String!, $searchContext: OrganizationSearchContext) {
  organization: organizationFromHostedJobsPageName(
    organizationHostedJobsPageName: $organizationHostedJobsPageName
    searchContext: $searchContext
  ) {
    ...OrganizationParts
    __typename
  }
}

fragment OrganizationParts on Organization {
  name
  publicWebsite
  customJobsPageUrl
  hostedJobsPageSlug
  allowJobPostIndexing
  theme {
    colors
    showJobFilters
    showLocationAddress
    showTeams
    showAutofillApplicationsBox
    logoWordmarkImageUrl
    logoSquareImageUrl
    applicationSubmittedSuccessMessage
    jobBoardTopDescriptionHtml
    jobBoardBottomDescriptionHtml
    jobPostingBackUrl
    __typename
  }
  appConfirmationTrackingPixelHtml
  recruitingPrivacyPolicyUrl
  activeFeatureFlags
  timezone
  candidateScheduleCancellationReasonRequirementStatus
  __typename
}`;

const JOB_POSTING_QUERY = `query ApiJobPosting($organizationHostedJobsPageName: String!, $jobPostingId: String!) {
  jobPosting(
    organizationHostedJobsPageName: $organizationHostedJobsPageName
    jobPostingId: $jobPostingId
  ) {
    id
    title
    departmentName
    departmentExternalName
    locationName
    locationAddress
    workplaceType
    employmentType
    descriptionHtml
    isListed
    isConfidential
    teamNames
    applicationForm {
      ...FormRenderParts
      __typename
    }
    surveyForms {
      ...FormRenderParts
      __typename
    }
    secondaryLocationNames
    compensationTierSummary
    compensationTiers {
      id
      title
      tierSummary
      __typename
    }
    applicationDeadline
    compensationTierGuideUrl
    scrapeableCompensationSalarySummary
    compensationPhilosophyHtml
    applicationLimitCalloutHtml
    shouldAskForTextingConsent
    candidateTextingPrivacyPolicyUrl
    candidateTextingTermsAndConditionsUrl
    legalEntityNameForTextingConsent
    automatedProcessingLegalNotice {
      automatedProcessingLegalNoticeRuleId
      automatedProcessingLegalNoticeHtml
      __typename
    }
    __typename
  }
}

fragment JSONBoxParts on JSONBox {
  value
  __typename
}

fragment FileParts on File {
  id
  filename
  __typename
}

fragment FormFieldEntryParts on FormFieldEntry {
  id
  field
  fieldValue {
    ... on JSONBox {
      ...JSONBoxParts
      __typename
    }
    ... on File {
      ...FileParts
      __typename
    }
    ... on FileList {
      files {
        ...FileParts
        __typename
      }
      __typename
    }
    __typename
  }
  isRequired
  descriptionHtml
  isHidden
  __typename
}

fragment FormRenderParts on FormRender {
  id
  formControls {
    identifier
    title
    __typename
  }
  errorMessages
  sections {
    title
    descriptionHtml
    fieldEntries {
      ...FormFieldEntryParts
      __typename
    }
    isHidden
    __typename
  }
  sourceFormDefinitionId
  __typename
}`;

function normalizeWhitespace(value) {
    return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : undefined;
}

function parsePositiveInteger(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function htmlToText(html) {
    if (!html) return undefined;

    const $ = cheerioLoad(html);
    $('script, style, noscript, iframe').remove();
    $('br').replaceWith('\n');
    $('p, li, h1, h2, h3, h4, h5, h6').append('\n');

    return normalizeWhitespace($.root().text());
}

function sanitizeDescriptionHtml(html) {
    if (!html) return undefined;

    const allowedTags = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'blockquote']);
    const $ = cheerioLoad(`<div data-root="description">${html}</div>`, { decodeEntities: false });
    const root = $('[data-root="description"]');

    root.find('script, style, noscript, iframe, canvas, svg, math').remove();

    root.find('*').each((_, element) => {
        const tag = (element.tagName || '').toLowerCase();
        const node = $(element);

        if (!allowedTags.has(tag)) {
            node.replaceWith(node.contents());
            return;
        }

        for (const attributeName of Object.keys(element.attribs || {})) {
            node.removeAttr(attributeName);
        }
    });

    const sanitized = root.html()?.trim();
    return sanitized || undefined;
}

function dedupeStrings(values) {
    return [...new Set(values.map((value) => normalizeWhitespace(value)).filter(Boolean))];
}

function pruneNullish(value) {
    if (Array.isArray(value)) {
        const items = value.map((entry) => pruneNullish(entry)).filter((entry) => entry !== undefined);
        return items.length ? items : undefined;
    }

    if (value && typeof value === 'object') {
        const entries = Object.entries(value)
            .map(([key, entry]) => [key, pruneNullish(entry)])
            .filter(([, entry]) => entry !== undefined);

        return entries.length ? Object.fromEntries(entries) : undefined;
    }

    if (typeof value === 'string') {
        const normalized = normalizeWhitespace(value);
        return normalized || undefined;
    }

    if (value === null || value === undefined) return undefined;
    return value;
}

function getBoardContext(rawUrl) {
    if (!rawUrl) {
        throw new Error('Missing required input URL. Provide startUrl (or url / first startUrls item).');
    }

    const parsed = new URL(rawUrl);

    if (parsed.hostname !== 'jobs.ashbyhq.com') {
        throw new Error(`Unsupported host: ${parsed.hostname}. Expected jobs.ashbyhq.com.`);
    }

    const segments = parsed.pathname.split('/').filter(Boolean);
    const boardSlug = segments[0];

    if (!boardSlug) {
        throw new Error('Missing Ashby board slug in start URL.');
    }

    return {
        boardSlug,
        boardUrl: `${parsed.protocol}//${parsed.host}/${boardSlug}/`,
    };
}

function buildJobUrl(boardUrl, jobPostingId) {
    return new URL(jobPostingId, boardUrl).href;
}

function getSecondaryLocationNames(job) {
    return dedupeStrings((job.secondaryLocations || []).map((location) => location.locationName));
}

function mapBoardJobSummary(job, boardUrl, teamName, companyName) {
    return pruneNullish({
        id: job.id,
        title: job.title,
        url: buildJobUrl(boardUrl, job.id),
        company_name: companyName,
        team_id: job.teamId,
        team_name: teamName,
        location_id: job.locationId,
        location_name: job.locationName,
        secondary_location_names: getSecondaryLocationNames(job),
        workplace_type: job.workplaceType,
        employment_type: job.employmentType,
        compensation_tier_summary: job.compensationTierSummary,
    });
}

function getFieldTitles(fieldEntries) {
    return dedupeStrings((fieldEntries || []).map((entry) => entry?.field?.title));
}

function getFormQuestionTitles(form) {
    const sectionFields = (form?.sections || []).flatMap((section) => getFieldTitles(section.fieldEntries));
    const topLevelFields = getFieldTitles(form?.fieldEntries);
    return dedupeStrings([...sectionFields, ...topLevelFields]);
}

function mapDetailedJob(summary, jobPosting, companyName) {
    if (!jobPosting) return summary;

    const descriptionHtml = sanitizeDescriptionHtml(jobPosting.descriptionHtml);
    const descriptionText = htmlToText(descriptionHtml);
    const applicationFormQuestionTitles = getFormQuestionTitles(jobPosting.applicationForm);
    const surveyQuestionTitles = dedupeStrings(
        (jobPosting.surveyForms || []).flatMap((surveyForm) => getFormQuestionTitles(surveyForm)),
    );
    const secondaryLocationNames = dedupeStrings([
        ...(summary.secondary_location_names || []),
        ...(jobPosting.secondaryLocationNames || []),
    ]);

    return pruneNullish({
        ...summary,
        title: jobPosting.title || summary.title,
        company_name: companyName || summary.company_name || jobPosting.legalEntityNameForTextingConsent,
        department_name: jobPosting.departmentName,
        department_external_name: jobPosting.departmentExternalName,
        team_names: dedupeStrings(jobPosting.teamNames || []),
        location_name: jobPosting.locationName || summary.location_name,
        location_address: jobPosting.locationAddress,
        secondary_location_names: secondaryLocationNames,
        workplace_type: jobPosting.workplaceType || summary.workplace_type,
        employment_type: jobPosting.employmentType || summary.employment_type,
        compensation_tier_summary: jobPosting.compensationTierSummary || summary.compensation_tier_summary,
        compensation_tiers: (jobPosting.compensationTiers || []).map((tier) => pruneNullish({
            id: tier.id,
            title: tier.title,
            tier_summary: tier.tierSummary,
        })),
        application_deadline: jobPosting.applicationDeadline,
        compensation_tier_guide_url: jobPosting.compensationTierGuideUrl,
        compensation_salary_summary: jobPosting.scrapeableCompensationSalarySummary,
        compensation_philosophy_text: htmlToText(jobPosting.compensationPhilosophyHtml),
        description_html: descriptionHtml,
        description_text: descriptionText,
        is_listed: jobPosting.isListed,
        is_confidential: jobPosting.isConfidential,
        application_limit_callout_text: htmlToText(jobPosting.applicationLimitCalloutHtml),
        application_form_question_titles: applicationFormQuestionTitles,
        survey_question_titles: surveyQuestionTitles,
        should_ask_for_texting_consent: jobPosting.shouldAskForTextingConsent,
        candidate_texting_privacy_policy_url: jobPosting.candidateTextingPrivacyPolicyUrl,
        candidate_texting_terms_url: jobPosting.candidateTextingTermsAndConditionsUrl,
        legal_entity_name_for_texting_consent: jobPosting.legalEntityNameForTextingConsent,
        automated_processing_legal_notice_rule_id: jobPosting.automatedProcessingLegalNotice?.automatedProcessingLegalNoticeRuleId,
        automated_processing_legal_notice_text: htmlToText(jobPosting.automatedProcessingLegalNotice?.automatedProcessingLegalNoticeHtml),
    });
}

async function postAshbyOperation({ operationName, query, variables, proxyConfiguration, referer }) {
    const proxyUrl = proxyConfiguration ? await proxyConfiguration.newUrl() : undefined;
    const endpoint = `https://jobs.ashbyhq.com/api/non-user-graphql?op=${encodeURIComponent(operationName)}`;

    const { statusCode, body } = await gotScraping.post(endpoint, {
        proxyUrl,
        headers: {
            ...REQUEST_HEADERS,
            accept: '*/*',
            'content-type': 'application/json',
            ...(referer ? { referer } : {}),
            'apollographql-client-name': 'frontend_non_user',
            'apollographql-client-version': '0.1.0',
        },
        body: JSON.stringify({
            operationName,
            variables,
            query,
        }),
        timeout: { request: 30000 },
    });

    if (statusCode >= 400) {
        throw new Error(`Ashby API request failed (${statusCode}) for ${operationName}.`);
    }

    let parsed;
    try {
        parsed = JSON.parse(body);
    } catch (error) {
        throw new Error(`Ashby API returned non-JSON for ${operationName}: ${error.message}`);
    }

    if (parsed.errors?.length) {
        const message = parsed.errors.map((entry) => entry.message).filter(Boolean).join('; ') || 'Unknown GraphQL error.';
        throw new Error(`Ashby API error for ${operationName}: ${message}`);
    }

    return parsed.data;
}

async function mapWithConcurrency(items, concurrency, mapper) {
    const results = new Array(items.length);
    let nextIndex = 0;

    const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
        while (nextIndex < items.length) {
            const currentIndex = nextIndex;
            nextIndex += 1;
            results[currentIndex] = await mapper(items[currentIndex], currentIndex);
        }
    });

    await Promise.all(workers);
    return results.filter(Boolean);
}

function getStartUrlFromInput(input) {
    if (typeof input.startUrl === 'string' && input.startUrl.trim()) return input.startUrl;
    if (typeof input.url === 'string' && input.url.trim()) return input.url;

    if (Array.isArray(input.startUrls) && input.startUrls.length > 0) {
        const first = input.startUrls[0];
        if (typeof first === 'string' && first.trim()) return first;
        if (first && typeof first === 'object' && typeof first.url === 'string' && first.url.trim()) return first.url;
    }

    return undefined;
}

function dedupeRecords(records) {
    const byKey = new Map();

    for (const record of records) {
        const key = record.id || record.url || JSON.stringify(record);
        const existing = byKey.get(key);
        if (!existing) {
            byKey.set(key, record);
            continue;
        }

        const currentScore = Object.keys(record).length;
        const existingScore = Object.keys(existing).length;
        if (currentScore > existingScore) {
            byKey.set(key, record);
        }
    }

    return [...byKey.values()];
}

async function main() {
    const input = (await Actor.getInput()) || {};
    const {
        collectDetails = true,
        results_wanted,
        max_pages,
        proxyConfiguration,
    } = input;

    const rawStartUrl = getStartUrlFromInput(input);
    const { boardUrl, boardSlug } = getBoardContext(rawStartUrl);
    const resultsWanted = parsePositiveInteger(results_wanted, 20);
    const maxPages = parsePositiveInteger(max_pages, 1);

    if (maxPages > 1) {
        log.info('Ashby boards return all jobs in a single board API response, so max_pages is ignored.');
    }

    const proxyConfig = proxyConfiguration ? await Actor.createProxyConfiguration(proxyConfiguration) : undefined;

    log.info(`Fetching Ashby board API for slug: ${boardSlug}`);

    let organizationName;
    try {
        const organizationData = await postAshbyOperation({
            operationName: 'ApiOrganizationFromHostedJobsPageName',
            query: ORGANIZATION_QUERY,
            variables: {
                organizationHostedJobsPageName: boardSlug,
                searchContext: 'JobBoard',
            },
            proxyConfiguration: proxyConfig,
            referer: boardUrl,
        });

        organizationName = organizationData?.organization?.name;
    } catch (error) {
        log.warning(`Failed to fetch organization metadata: ${error.message}`);
    }

    const boardData = await postAshbyOperation({
        operationName: 'ApiJobBoardWithTeams',
        query: JOB_BOARD_QUERY,
        variables: {
            organizationHostedJobsPageName: boardSlug,
        },
        proxyConfiguration: proxyConfig,
        referer: boardUrl,
    });

    const teams = boardData?.jobBoard?.teams || [];
    const boardJobs = boardData?.jobBoard?.jobPostings || [];

    if (!boardJobs.length) {
        throw new Error(`No jobs were found for board ${boardUrl}.`);
    }

    const teamNameById = new Map(teams.map((team) => [team.id, normalizeWhitespace(team.externalName) || normalizeWhitespace(team.name)]));
    const selectedJobs = boardJobs.slice(0, resultsWanted);
    log.info(`Board ${boardSlug} returned ${boardJobs.length} jobs, saving ${selectedJobs.length}.`);

    let records = selectedJobs.map((job) => mapBoardJobSummary(job, boardUrl, teamNameById.get(job.teamId), organizationName));

    if (collectDetails) {
        log.info(`Enriching ${records.length} job details via API.`);
        records = await mapWithConcurrency(records, DETAIL_CONCURRENCY, async (summary) => {
            try {
                const detailData = await postAshbyOperation({
                    operationName: 'ApiJobPosting',
                    query: JOB_POSTING_QUERY,
                    variables: {
                        organizationHostedJobsPageName: boardSlug,
                        jobPostingId: summary.id,
                    },
                    proxyConfiguration: proxyConfig,
                    referer: summary.url,
                });

                return mapDetailedJob(summary, detailData?.jobPosting, organizationName);
            } catch (error) {
                log.warning(`Failed to enrich ${summary.url}: ${error.message}`);
                return summary;
            }
        });
    }

    records = dedupeRecords(records.map((record) => pruneNullish(record)).filter(Boolean));

    if (!records.length) {
        throw new Error('The actor did not produce any dataset items.');
    }

    await Dataset.pushData(records);
    log.info(`Saved ${records.length} Ashby jobs.`);
}

try {
    await main();
    await Actor.exit();
} catch (error) {
    console.error(error);
    process.exit(1);
}
