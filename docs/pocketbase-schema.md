# ROMS PocketBase schema

Create these collections in the PocketBase admin UI at `/ _/` (remove the space in the URL). The `users` collection should be an **Auth** collection; the others are **Base** collections.

## Collections and fields

### `branches`

- `name`: text, required
- `code`: text, required, unique
- `candidates`: number, default `0`
- `accent`: text, default `#0f766e`

### `users` (Auth collection)

- `name`: text, required
- `role`: select, single: `super_admin`, `super_finance`, `branch_staff`, `branch_finance`, `recruiter`, `candidate`
- `branch`: relation to `branches`, max select `1`, optional for global users
- `candidate`: relation to `candidates`, max select `1`, optional for non-candidates

### `candidates`

- `name`: text, required
- `passport`: text, required
- `branch`: relation to `branches`, max select `1`, required
- `status`: select, single: `Registered`, `Documents review`, `Medical cleared`, `Interview scheduled`, `Job matched`, `Awaiting payment`, `Deployed`
- `submitted`: date, optional
- `docs`: number, default `0`

### `jobs`

- `title`: text, required
- `employer`: text, required
- `country`: text, required
- `openings`: number, required
- `filled`: number, default `0`
- `posted`: date, optional
- `status`: select, single: `Open`, `Filled`, `Closed`

### `applications`

- `candidate`: relation to `candidates`, max select `1`, required
- `job`: relation to `jobs`, max select `1`, required
- `status`: select, single: `Shortlisted`, `Interview`, `Selected`, `Rejected`
- `date`: date, optional

### `transactions`

- `branch`: relation to `branches`, max select `1`, required
- `type`: select, single: `Candidate fee`, `Agency commission`, `Receipt`, `Refund`
- `party`: text, required
- `amount`: number, required
- `status`: select, single: `Pending`, `Pending approval`, `Paid`, `Rejected`
- `date`: date, optional

## API rules

These rules are the security boundary. Do not rely on frontend filtering alone.

### `branches`

```text
listRule / viewRule: @request.auth.id != ""
createRule / updateRule / deleteRule: @request.auth.role = "super_admin"
```

### `users`

```text
listRule / viewRule: @request.auth.role = "super_admin" || id = @request.auth.id
createRule / updateRule / deleteRule: @request.auth.role = "super_admin"
```

### `candidates`

```text
listRule / viewRule: @request.auth.role = "super_admin" || @request.auth.role = "super_finance" || (@request.auth.branch = branch && (@request.auth.role = "branch_staff" || @request.auth.role = "branch_finance")) || (@request.auth.role = "candidate" && @request.auth.candidate = id)
createRule: @request.auth.role = "super_admin" || (@request.auth.branch = branch && @request.auth.role = "branch_staff")
updateRule: @request.auth.role = "super_admin" || (@request.auth.branch = branch && @request.auth.role = "branch_staff") || (@request.auth.role = "candidate" && @request.auth.candidate = id)
deleteRule: @request.auth.role = "super_admin"
```

### `jobs`

```text
listRule / viewRule: @request.auth.id != ""
createRule / updateRule / deleteRule: @request.auth.role = "super_admin" || @request.auth.role = "recruiter"
```

### `applications`

```text
listRule / viewRule: @request.auth.role = "super_admin" || @request.auth.role = "super_finance" || @request.auth.role = "recruiter" || (@request.auth.role = "candidate" && candidate = @request.auth.candidate) || (@request.auth.branch != "" && candidate.branch = @request.auth.branch)
createRule: @request.auth.role = "super_admin" || @request.auth.role = "recruiter" || (@request.auth.branch != "" && candidate.branch = @request.auth.branch)
updateRule: @request.auth.role = "super_admin" || @request.auth.role = "recruiter"
deleteRule: @request.auth.role = "super_admin"
```

### `transactions`

```text
listRule / viewRule: @request.auth.role = "super_admin" || @request.auth.role = "super_finance" || (@request.auth.role = "branch_finance" && branch = @request.auth.branch)
createRule: @request.auth.role = "super_admin" || @request.auth.role = "super_finance" || (@request.auth.role = "branch_finance" && branch = @request.auth.branch)
updateRule: @request.auth.role = "super_admin" || @request.auth.role = "super_finance" || (@request.auth.role = "branch_finance" && branch = @request.auth.branch)
deleteRule: @request.auth.role = "super_admin"
```

For production, add an audit collection and append-only rules before enabling destructive actions. PocketBase relation filters use the related record path shown above; validate each rule with a test account in the admin UI.
