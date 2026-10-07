# Administration and Finance Updates

## Candidate Excel Export

On Candidates, apply the stage, search, and branch filters first. Choose **Export Excel**, select the columns to include, and use the up/down controls to arrange them. The export includes only the currently visible rows, in the displayed order, as an `.xlsx` workbook. The API also checks the user's branch permissions.

The chooser includes all registration data: first/middle/last names, DOB, gender, marital status, weight/height, passport/expiry, national ID/nationality, primary/alternate contacts, address, registered-by/sub-agent information, plus workflow and financial fields. Private tracking tokens and password hashes are not exportable.

## Passport, Branch, and User Administration

- Passport inventory search matches the displayed candidate, passport, storage, and custody information. Super Admin can delete any custody record; Branch Admin can delete records only in their own branch. Deleting custody does not delete the candidate and clears the physical-passport-received flag.
- Only Super Admin can edit or delete branches. A branch with linked users, candidates, or payments cannot be deleted until those records are reassigned or cleared.
- Super Admin can delete other staff accounts, but not their own account. Passport custody references must be reassigned first. Audit history is retained.
- System Users shows user counts and leaders by all-time audit activity. Branch administrators see only their own branch. Ties are ordered by name; users without activity do not become leaders.
- Branch Admin user access is read-only: adding/editing/deleting accounts and resetting passwords are Super Admin operations. Branch Admin can still change their own password using normal self-service.
- Audit history uses readable action names, record names, and field labels instead of raw JSON and internal IDs. Deleted records may appear as historical records.

## Finance

Finance and permitted Overview pages summarize agreements, commissions, paid totals, outstanding balances, and office fees. An agreement is a candidate with a nonzero agreed commission. Expenses are displayed as **Not configured** until an expense workflow is implemented. Branch administrators and branch finance see only their branch.

The ledger has one row per candidate showing the paid total. Click the candidate to open their statement. It begins with the agreed commission, lists their payment history, and ends with net payments and balance. Legacy paid amounts without matching ledger entries are displayed as a historical opening paid balance.

- Super Admin, Super Finance, and Branch Finance can approve pending payments within their scope.
- Only Super Admin and Super Finance can void approved payments. Voiding retains the entry with a strike-through and reverses its balance effect once. Related refunds may need voiding before a receipt can be voided without producing a negative paid total.
- Voided or approved entries cannot be permanently deleted or moved back to pending. Voided payments do not count toward balances and cannot produce a new printable receipt.
- Receipt buttons preview an approved payment PDF with printing and download controls. Statement PDFs include inactive history marked **VOIDED** and exclude it from totals.
- Receipts use stable `RCT-` serials derived from their payment record. Statements use stable `STM-` serials derived from their candidate record. A regenerated statement is the current statement, not an archived snapshot.
- Already downloaded or printed receipts cannot be recalled; a newly generated statement reflects a later void.

## Company Branding

Super Admin can edit the company name and upload/remove the logo in Settings. The default name is **Rabiya Employment Links**. Logos must be PNG or JPEG, up to 500KB. Company name and logo appear on financial PDFs and candidate tracking PDF, printable, and JPEG reports. No logo is shown until one is uploaded.

Settings also stores company email, primary and alternate contacts, office/postal address, website, registration number, and tax PIN. Contact fields are optional; websites must use HTTP or HTTPS. Financial PDFs include the configured contact and registration information.

Financial statements use labeled debit, credit, and running-balance columns, repeated headings on continuation pages, and numbered footers. Receipts have a dedicated payment-details table and amount block. The finance ledger includes search, branch and balance-status filters, filtered totals, collection progress, and a pending-payment review queue. Passport inventory summaries show the total current custody records received, currently in-office passports, and releases to candidates/embassies; deleted custody records are not included in these totals.

## Recruiters and Employer Job Ownership

Super Admin and Branch Admin can open Recruiters and create an employer account. Branch Admin-created accounts are attached to their own branch and are always role Recruiter, regardless of submitted role/branch values. This is a narrow exception to the read-only Branch users page, not permission to add ordinary staff or reset/edit existing accounts. New accounts use the existing one-time-password flow.

Job employers are selected from existing active recruiter accounts. Recruiters creating a job are automatically set as its owner. Expected salary and qualifications are shown on job cards and the order table. Qualification text uses the existing requiredSkills field; salary uses the job's currency/minimum/maximum salary fields.

Job.recruiterId is an optional foreign key to User. Legacy jobs retain their old employer text but grant no recruiter access until explicitly assigned in Edit job order. Do not guess ownership from a name. Users with linked job orders cannot be deleted until those jobs are reassigned.

Recruiters have an own-job/own-candidate workspace with application status and document preview/download. Candidate and application API responses omit financial fields, tracking credentials and private file paths. Financial endpoints and Excel export are blocked for recruiters, as are candidate/document mutations. Ownership of an application, rather than the applicant's branch, determines employer access. Open jobs are still visible to applicants on the separate public portal.

## Activity and Sessions

The bell shows pending job-order approvals, pending payment approvals, and candidate applications needing review, according to the current user's permissions. Tasks link to the relevant page; payment tasks can open their candidate statement. Refresh reloads tasks with the rest of the database data.

Sessions end after ten minutes without user activity. A suspended tab checks elapsed time when resumed. The API also expires inactive sessions and rejects logged-out tokens. An API restart requires users to sign in again.

Activity includes input, pointer, keyboard, wheel and scroll events, including scrolls inside modal panels. Heartbeats keep the API session alive throughout the browser's remaining inactivity window; heartbeats do not reset the browser's inactivity timer.

## Validation

- `npm test` runs ten focused API/PDF checks and eleven Chrome/Playwright browser flows. Native PDF appearance is visually checked with `npx playwright test --headed -g "professional financial PDFs"`, because headless Chrome may not paint its PDF viewer. The isolated PostgreSQL runner also tests recruiter ownership, document isolation, forged owner IDs and financial redaction.
- `npm run build:css` builds the local icon bundle and frontend CSS.
- `server/src/validate-postgres.js` is an explicitly invoked validation utility: it creates a temporary PostgreSQL schema, runs an isolated API, checks concurrent payment operations and role restrictions, and removes that schema. It does not run during normal startup.
- Validated desktop and 390px mobile layouts, export column order and filtering, financial void controls, branch scope, branding settings, notifications, and simulated ten-minute idle logout.

## Dependency Notes

The new ExcelJS dependency uses a patched `uuid` override. The advisory scan in `dependency-advisories.json` is the pre-remediation snapshot; its uuid finding was subsequently resolved and API export tests passed. Existing Tailwind build-tool, Prisma tooling, and Nodemailer advisories remain and require a separately scoped dependency upgrade. No force upgrades were performed.