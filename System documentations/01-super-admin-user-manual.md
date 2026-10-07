# Super Admin User Manual

## Role summary

Super Admin manages the full ROMS system, user accounts, branches, candidate workflows, finance, and backup/restore controls.

## Main responsibilities

- create and manage system users
- manage branches
- review all candidates and their statuses
- approve pending job orders
- review finance and payment records
- maintain backup and restore operations
- monitor audit logs

## Login

1. Open the ROMS login page.
2. Enter your username and password.
3. If you are logging in for the first time, follow the password reset flow.
4. After login, the Overview page appears.

## Navigation overview

From the left sidebar, access:

- Overview
- Settings
- Candidates
- Job orders
- Applications
- Finance
- Passport inventory
- Branches
- System users
- Audit log

## Settings

The Settings screen contains backup and maintenance actions.

### Backup to Google Drive

1. Open Settings.
2. Click Back up to Google Drive.
3. Wait for progress to complete.
4. Review the success or failure message.

### Restore from backup

1. Open Settings.
2. Select a snapshot from the available list.
3. Type RESTORE ROMS in the confirmation box.
4. Click Restore selected snapshot.
5. Wait for the system to complete the restore safely.

> Warning: restore replaces live database and document data. Only do this when required and with approval.

## User management

### Add a user

1. Go to System users.
2. Click Add user.
3. Fill in the required account details.
4. Assign the correct role and branch.
5. Save the user.

### Reset password

1. Open the user list.
2. Click Reset password for the relevant user.
3. Hand over the temporary password securely.

## Branch management

1. Open Branches.
2. Add or edit branch information.
3. Confirm branch codes and location details.
4. Review active candidates and revenue per branch.

## Candidate management

1. Open Candidates.
2. Search by name or filter by workflow stage.
3. Open a candidate profile.
4. Review personal data, stage, documents, and fee information.
5. Update workflow status when required.

## Finance management

1. Open Finance.
2. Review all payments and payment status.
3. Approve or reject pending entries.
4. Track due, paid, and total commission amounts.

## Audit log

Use Audit log to review system actions such as:

- logins
- profile changes
- password resets
- finance approvals
- upload actions
- restore actions

## Best practice

- never leave shared machines signed in
- protect user passwords
- verify branch assignment before creating users
- only allow restore when authorized
- review audit trail after major updates
