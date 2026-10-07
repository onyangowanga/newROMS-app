const { test, expect } = require('@playwright/test');

async function setup(page, role = 'super_admin') {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const branches = [{ id: 'branch-a', name: 'Nairobi', code: 'NAI', staff: 1, _count: { candidates: 1 } }, { id: 'branch-b', name: 'Mombasa', code: 'MOM', staff: 1, _count: { candidates: 1 } }];
  const user = { id: role === 'recruiter' ? 'recruiter-a' : 'admin-a', username: 'admin', name: role === 'recruiter' ? 'Employer A' : 'Admin User', email: 'admin@example.test', role, branchId: role.startsWith('branch') ? 'branch-a' : null, active: true };
  const candidates = [{ id: 'candidate-a', name: 'Alice Example', firstName: 'Alice', lastName: 'Example', email: 'alice@example.test', phone: '0712345678', passport: 'P123', branchId: 'branch-a', branch: branches[0], trackingNumber: 'ROMS-NAI-001', status: 'Application', commissionTotal: 2000, paidAmount: 1000, officeFee: 400, applications: [], documents: [] }, { id: 'candidate-b', name: 'Bob Example', passport: 'P456', branchId: 'branch-b', branch: branches[1], status: 'Application', commissionTotal: 9000, paidAmount: 0, officeFee: 3000, applications: [], documents: [] }].filter(item => !user.branchId || item.branchId === user.branchId);
  const transactions = [{ id: 'payment-a', candidateId: 'candidate-a', branchId: 'branch-a', candidate: candidates[0], party: 'Alice Example', type: 'Receipt', status: 'Paid', amount: 1000, amountKes: 1000, currency: 'KES', exchangeRate: 1, paymentMethod: 'Cash', date: '2026-10-04T10:00:00Z' }, { id: 'payment-b', candidateId: 'candidate-a', branchId: 'branch-a', candidate: candidates[0], party: 'Alice Example', type: 'Receipt', status: 'Pending_approval', amount: 250, amountKes: 250, currency: 'KES', exchangeRate: 1, date: '2026-10-04T11:00:00Z' }];
  const requests = [];
  await page.route('**/api/**', async route => {
    const request = route.request(); const path = new URL(request.url()).pathname.slice(4); requests.push({ path, method: request.method(), body: request.postDataJSON() });
    let json = [];
    if (path === '/auth/login') json = { token: 'test-token', user };
    else if (path === '/auth/me') json = { user };
    else if (path === '/branches' || path === '/public/branches') json = branches.filter(item => !user.branchId || item.id === user.branchId);
    else if (path === '/users') json = [user, { id: 'staff-a', name: 'Staff Example', role: 'branch_staff', branchId: 'branch-a', email: 'staff@example.test', active: true }];
    else if (path === '/users/report') json = [{ ...user, activity: 10 }, { id: 'staff-a', name: 'Staff Example', branchId: 'branch-a', active: true, activity: 20 }];
    else if (path === '/candidates') json = role === 'recruiter' ? [{ id: 'candidate-a', name: 'Alice Example', status: 'Application', documents: [{ id: 'doc-a', documentType: 'CV', fileName: 'Alice-CV.pdf', name: 'CV' }] }] : candidates;
    else if (path === '/transactions') json = transactions;
    else if (path === '/passports') json = [{ id: 'passport-a', candidate: candidates[0], candidateId: 'candidate-a', branchId: 'branch-a', branch: branches[0], status: 'In_Storage', receivedAt: '2026-10-01', storageLocation: 'Shelf 1' }];
    else if (path === '/jobs' || path === '/public/jobs') json = [{ id: 'job-a', title: 'Nurse', recruiterId: 'recruiter-a', employer: 'Employer A', country: 'Qatar', status: 'Pending_approval', reference: 'JO-QAT-001', currency: 'QAR', minimumSalary: 2000, maximumSalary: 3000, requiredSkills: 'Nursing diploma' }];
    else if (path === '/recruiters' && request.method() === 'GET') json = [{ id: 'recruiter-a', name: 'Employer A', email: 'employer@example.test', username: 'employer', branchId: 'branch-a', active: true }];
    else if (path === '/recruiters' && request.method() === 'POST') json = { id: 'recruiter-new', username: request.postDataJSON().username, email: request.postDataJSON().email, role: 'recruiter', emailSent: true };
    else if (path === '/applications' && role === 'recruiter') json = [{ id: 'application-a', candidateId: 'candidate-a', jobId: 'job-a', status: 'Shortlisted', job: { title: 'Nurse' }, candidate: { name: 'Alice Example', status: 'Application' } }];
    else if (path === '/company' || path === '/public/company') json = { companyName: 'Rabiya Employment Links', logoData: null };
    else if (path === '/audit') json = [{ id: 'audit-a', actor: user, entity: 'passport_inventory', entityId: 'passport-a', action: 'passport_custody_update', metadata: { candidateId: 'candidate-a', status: 'In_Storage' }, createdAt: '2026-10-04T11:00:00Z' }];
    else if (path === '/admin/backups') json = { snapshots: [] };
    else if (path === '/admin/backups/status') json = {};
    else if (path.endsWith('/void')) { transactions[0].voided = true; candidates[0].paidAmount = 0; json = { voided: true }; }
    else if (path === '/transactions/payment-b' && request.method() === 'PATCH') { transactions[1].status = 'Paid'; candidates[0].paidAmount += 250; }
    else if (path === '/candidates/export') return route.fulfill({ status: 200, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', body: 'fixture-export' });
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(json) });
  });
  await page.goto('/#login');
  await expect(page.locator('#login-form')).toBeVisible();
  await page.locator('[name="username"]').fill('admin'); await page.locator('[name="password"]').fill('TestOnly123');
  await page.locator('#login-form button[type="submit"]').click();
  await expect(page.locator('.topbar')).toBeVisible();
  return { errors, requests };
}

test('filtered candidate export captures visible IDs and selected/reordered columns', async ({ page }) => {
  const { requests, errors } = await setup(page);
  await page.locator('[data-nav="candidates"]').first().click();
  await page.locator('#candidate-search').fill('Alice');
  await page.getByRole('button', { name: 'Export Excel', exact: true }).click();
  await expect(page.locator('.modal-header')).toContainText('Export 1 candidates');
  await page.getByRole('button', { name: 'Move Email up', exact: true }).click();
  await page.locator('[data-column="0"]').uncheck();
  const downloadPromise = page.waitForEvent('download'); await page.locator('[data-export-save]').click(); await downloadPromise;
  const exported = requests.find(item => item.path === '/candidates/export');
  expect(exported.body.columns).toEqual(expect.arrayContaining(['firstName', 'middleName', 'lastName', 'dateOfBirth', 'gender', 'maritalStatus', 'nationalId', 'registeredBy']));
  expect(exported.body.ids).toEqual(['candidate-a']); expect(exported.body.columns.slice(0, 3)).toEqual(['trackingNumber', 'email', 'passport']); expect(errors).toEqual([]);
});
test('finance ledger, payment voiding, notifications, and branch/user/admin actions', async ({ page }) => {
  const { requests, errors } = await setup(page); page.on('dialog', dialog => dialog.accept());
  await page.locator('.notification-button').click(); await expect(page.locator('[data-task]')).toHaveCount(4);
  await page.locator('.modal-close').click();
  await page.locator('[data-nav="finance"]').first().click();
  await page.locator('.candidate-name-link[data-statement="candidate-a"]').click();
  await expect(page.locator('.statement-totals')).toContainText('1,000');
  await page.locator('[data-payment-void="payment-a"]').click();
  await expect(page.locator('.voided-entry')).toContainText('Voided');
  await expect(page.locator('[data-payment-receipt="payment-a"]')).toHaveCount(0);
  await page.locator('.modal-close').click();
  await page.locator('[data-nav="branches"]').first().click(); await expect(page.locator('[data-edit-branch]')).toHaveCount(2);
  await page.locator('[data-edit-branch]').first().click(); await page.locator('[name="name"]').fill('Nairobi Central'); await page.getByRole('button', { name: 'Save branch' }).click();
  expect(requests.some(item => item.path === '/branches/branch-a' && item.method === 'PATCH')).toBeTruthy();
  await page.locator('[data-nav="users"]').first().click(); await expect(page.locator('.business-metrics')).toContainText('Staff Example');
  await expect(page.getByRole('button', { name: 'Delete', exact: true })).toHaveCount(1);
  await page.locator('[data-nav="audit"]').first().click(); await expect(page.locator('.main')).toContainText('Passport custody'); await expect(page.locator('.main')).not.toContainText('candidate-a');
  expect(errors).toEqual([]);
});
test('branch summaries, passport search/deletion and void permissions on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); const { errors } = await setup(page, 'branch_admin');
  await expect(page.locator('.business-metrics')).toContainText('2,000'); await expect(page.locator('.business-metrics')).not.toContainText('9,000');
  await page.goto('/#finance'); await page.locator('.candidate-name-link[data-statement]').click(); await expect(page.locator('[data-payment-void]')).toHaveCount(0);
  await page.locator('.modal-close').click(); await page.goto('/#passports');
  await expect(page.locator('.business-metrics')).toContainText('Total passports received');
  await expect(page.locator('[data-passport-total]')).toHaveText('Total passports: 1');
  await page.getByRole('textbox', { name: 'Search passports' }).fill('no-match'); await expect(page.locator('.table-wrap tbody tr')).toBeHidden();
  await page.getByRole('textbox', { name: 'Search passports' }).fill('P123'); await expect(page.locator('.table-wrap tbody tr')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/branch-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy(); expect(errors).toEqual([]);
});
test('company settings and refresh without logout', async ({ page }) => {
  const { requests, errors } = await setup(page);
  await page.locator('[data-nav="settings"]').first().click(); await page.locator('[name="companyName"]').fill('Rabiya Employment Links Ltd');
  await page.locator('[name="email"]').fill('office@example.test'); await page.locator('[name="phone"]').fill('+254 700 000 000');
  await page.getByRole('button', { name: 'Save company details' }).click();
  await expect.poll(() => requests.some(item => item.path === '/company' && item.method === 'PUT')).toBeTruthy();
  expect(requests.find(item => item.path === '/company' && item.method === 'PUT').body.email).toBe('office@example.test');
  await page.getByRole('button', { name: 'Refresh data', exact: true }).click(); await expect(page.locator('.topbar')).toBeVisible();
  expect(requests.filter(item => item.path === '/auth/logout')).toHaveLength(0);
  await page.screenshot({ path: 'test-results/settings-desktop.png', fullPage: true }); expect(errors).toEqual([]);
});
test('branch admin can view users but has no add edit reset or delete controls', async ({ page }) => {
  const { errors } = await setup(page, 'branch_admin');
  await page.goto('/#users');
  await expect(page.locator('.main')).toContainText('Staff Example');
  await expect(page.locator('[data-open="new-user"]')).toHaveCount(0);
  await expect(page.locator('[data-edit-user]')).toHaveCount(0);
  await expect(page.locator('[data-reset-user]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Delete', exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('branch admin creates recruiter accounts through the dedicated page', async ({ page }) => {
  const { requests, errors } = await setup(page, 'branch_admin'); await page.goto('/#recruiters');
  await page.getByRole('button', { name: 'Add recruiter', exact: true }).click();
  await page.locator('[data-recruiter-form] [name="name"]').fill('New Employer'); await page.locator('[data-recruiter-form] [name="username"]').fill('newemployer'); await page.locator('[data-recruiter-form] [name="email"]').fill('new@example.test');
  await page.getByRole('button', { name: 'Create recruiter account' }).click();
  await expect(page.locator('#credential-username')).toHaveText('newemployer');
  expect(requests.some(item => item.path === '/users' && item.method === 'POST')).toBeFalsy(); expect(errors).toEqual([]);
});

test('recruiter sees owned jobs and candidates without financial controls', async ({ page }) => {
  const { requests, errors } = await setup(page, 'recruiter');
  await expect(page.locator('.main')).toContainText('Alice Example'); await expect(page.locator('.main')).toContainText('Shortlisted');
  await expect(page.locator('[data-nav="finance"]')).toHaveCount(0); await expect(page.locator('[data-nav="recruiters"]')).toHaveCount(0);
  await page.locator('[data-recruiter-docs]').click(); await expect(page.locator('.modal-body')).toContainText('Alice-CV.pdf'); await page.locator('.modal-close').click();
  await page.goto('/#jobs'); await expect(page.locator('.main')).toContainText('Nursing diploma'); await expect(page.locator('.main')).toContainText('2000 - 3000');
  await page.getByRole('button', { name: 'Create job order', exact: true }).click();
  await expect(page.locator('#job-employer')).toHaveValue('recruiter-a'); await expect(page.locator('#job-employer')).toBeDisabled();
  await page.locator('#job-title').fill('Clinical Nurse'); await page.locator('#job-type').selectOption('Other');
  await page.locator('#job-headcount').fill('2'); await page.locator('#job-duration').fill('12'); await page.locator('#job-currency').fill('QAR');
  await page.locator('#job-min-salary').fill('2000'); await page.locator('#job-max-salary').fill('3000'); await page.locator('#job-location').fill('Doha');
  await page.locator('#job-country').selectOption('Qatar'); await page.locator('#job-skills').fill('Nursing diploma'); await page.locator('#modal-save').click();
  await expect.poll(() => requests.some(item => item.path === '/jobs' && item.method === 'POST')).toBeTruthy();
  expect(requests.find(item => item.path === '/jobs' && item.method === 'POST').body.recruiterId).toBe('recruiter-a');
  expect(requests.some(item => item.path === '/transactions')).toBeFalsy(); expect(errors).toEqual([]);
});
test('idle logout removes signed-in UI after ten minutes', async ({ page }) => {
  await page.clock.install(); const { requests, errors } = await setup(page);
  await page.clock.runFor(601000);
  await expect(page.locator('#login-form')).toBeVisible(); await expect(page.locator('.topbar')).toHaveCount(0);
  expect(requests.some(item => item.path === '/auth/logout')).toBeTruthy(); expect(errors).toEqual([]);
});

test('activity and nested scrolling keep the session alive beyond ten minutes', async ({ page }) => {
  await page.clock.install(); const { requests, errors } = await setup(page);
  await page.locator('[data-nav="finance"]').first().click();
  await page.locator('.candidate-name-link[data-statement="candidate-a"]').click();
  for (let minute = 0; minute < 12; minute += 1) {
    await page.clock.runFor(60001);
    await page.locator('.modal-body').dispatchEvent('scroll');
  }
  await expect(page.locator('.topbar')).toBeVisible();
  expect(requests.filter(item => item.path === '/auth/me').length).toBeGreaterThan(12);
  expect(requests.some(item => item.path === '/auth/logout')).toBeFalsy();
  expect(errors).toEqual([]);
});

test('finance filters, approval queue and statement running balance on desktop and mobile', async ({ page }) => {
  const { errors } = await setup(page);
  await page.goto('/#finance'); await page.locator('#finance-search').fill('Alice');
  await expect(page.locator('[data-ledger-id="candidate-b"]')).toBeHidden();
  await expect(page.locator('[data-ledger-total]')).toContainText('1 accounts');
  await expect(page.getByRole('heading', { name: 'Payments awaiting approval' })).toBeVisible();
  await page.screenshot({ path: 'test-results/finance-desktop.png', fullPage: true });
  await page.locator('.candidate-name-link[data-statement="candidate-a"]').click();
  await expect(page.locator('.statement-table-wrap')).toContainText('Agreed commission');
  await expect(page.locator('.statement-table-wrap')).toContainText('Credit');
  await page.screenshot({ path: 'test-results/statement-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/statement-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  expect(errors).toEqual([]);
});

test('professional financial PDFs render in the actual document preview', async ({ page }) => {
  const { errors } = await setup(page);
  const { renderFinancialPdf } = await import('../server/src/business.js');
  const PDFKit = require('../server/node_modules/pdfkit');
  const candidate = { id: 'candidate-a', name: 'Alice Example', passport: 'P123', trackingNumber: 'ROMS-NAI-001', email: 'alice@example.test', phone: '+254 700 000 000', branch: { name: 'Nairobi' }, commissionTotal: 2000, paidAmount: 1000, submitted: new Date('2026-10-01') };
  const entry = { id: 'payment-a', type: 'Receipt', status: 'Paid', amount: 1000, amountKes: 1000, currency: 'KES', paymentMethod: 'Bank transfer', paymentReference: 'BANK-000123', date: new Date('2026-10-04') };
  const render = async single => {
    const pdf = new PDFKit({ size: 'A4', margin: 48, bufferPages: true }); const chunks = [];
    const completed = new Promise(resolve => { pdf.on('data', bytes => chunks.push(bytes)); pdf.on('end', () => resolve(Buffer.concat(chunks))); });
    renderFinancialPdf(pdf, single ? 'RCT' : 'STM', candidate, [entry], { companyName: 'Rabiya Employment Links', email: 'office@example.test', phone: '+254 700 000 000', address: 'Nairobi, Kenya', taxNumber: 'PIN123' }, single);
    pdf.end(); return completed;
  };
  const receipt = await render(true); const statement = await render(false);
  await page.route('**/api/transactions/payment-a/receipt.pdf', route => route.fulfill({ contentType: 'application/pdf', body: receipt }));
  await page.route('**/api/candidates/candidate-a/statement.pdf', route => route.fulfill({ contentType: 'application/pdf', body: statement }));
  await page.goto('/#finance'); await page.locator('.candidate-name-link[data-statement="candidate-a"]').click();
  await page.locator('[data-payment-receipt="payment-a"]').click();
  await expect(page.locator('.document-preview-content')).toHaveAttribute('src', /^blob:/);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test-results/receipt-pdf-preview.png', fullPage: true });
  await page.locator('.document-preview-backdrop [data-close]').click();
  await page.locator('[data-statement-pdf]').click();
  await expect(page.locator('.document-preview-content')).toHaveAttribute('src', /^blob:/);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test-results/statement-pdf-preview.png', fullPage: true });
  expect(errors).toEqual([]);
});