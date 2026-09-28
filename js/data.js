export const seedData = {
  branches: [
    { id: 'br-nairobi', name: 'Nairobi', code: 'NBO', candidates: 148, accent: '#0f766e' },
    { id: 'br-mombasa', name: 'Mombasa', code: 'MBA', candidates: 86, accent: '#e76f51' },
    { id: 'br-kisumu', name: 'Kisumu', code: 'KSM', candidates: 54, accent: '#d9a441' }
  ],
  users: [
    { id: 'u-super', name: 'Amara Wanjiku', role: 'super_admin', branchId: null },
    { id: 'u-finance', name: 'Daniel Okafor', role: 'super_finance', branchId: null },
    { id: 'u-nbo', name: 'Wambui Kariuki', role: 'branch_staff', branchId: 'br-nairobi' },
    { id: 'u-mba-fin', name: 'Juma Salim', role: 'branch_finance', branchId: 'br-mombasa' },
    { id: 'u-recruiter', name: 'Elena Rossi', role: 'recruiter', branchId: null },
    { id: 'u-candidate', name: 'Aisha Mwangi', role: 'candidate', branchId: 'br-nairobi', candidateId: 'cand-001' }
  ],
  candidates: [
    { id: 'cand-001', name: 'Aisha Mwangi', passport: 'KE-48291', branchId: 'br-nairobi', status: 'Medical cleared', submitted: '12 Sep 2026', docs: 5 },
    { id: 'cand-002', name: 'Brian Otieno', passport: 'KE-94710', branchId: 'br-nairobi', status: 'Documents review', submitted: '10 Sep 2026', docs: 3 },
    { id: 'cand-003', name: 'Fatuma Said', passport: 'KE-10283', branchId: 'br-mombasa', status: 'Job matched', submitted: '08 Sep 2026', docs: 6 },
    { id: 'cand-004', name: 'Kevin Ochieng', passport: 'KE-77401', branchId: 'br-kisumu', status: 'Interview scheduled', submitted: '06 Sep 2026', docs: 4 },
    { id: 'cand-005', name: 'Mary Njeri', passport: 'KE-44318', branchId: 'br-nairobi', status: 'Awaiting payment', submitted: '04 Sep 2026', docs: 4 }
  ],
  jobs: [
    { id: 'job-001', title: 'Care Assistants', employer: 'NordCare Group', country: 'Finland', openings: 18, filled: 11, posted: '15 Sep 2026', status: 'Open' },
    { id: 'job-002', title: 'Welders', employer: 'Al Noor Construction', country: 'Qatar', openings: 12, filled: 8, posted: '11 Sep 2026', status: 'Open' },
    { id: 'job-003', title: 'Hotel Housekeepers', employer: 'Blue Lagoon Resorts', country: 'Malta', openings: 24, filled: 24, posted: '03 Sep 2026', status: 'Filled' }
  ],
  applications: [
    { id: 'app-001', candidateId: 'cand-001', jobId: 'job-001', status: 'Shortlisted', date: '16 Sep 2026' },
    { id: 'app-002', candidateId: 'cand-003', jobId: 'job-002', status: 'Selected', date: '14 Sep 2026' }
  ],
  transactions: [
    { id: 'txn-001', branchId: 'br-nairobi', type: 'Candidate fee', party: 'Aisha Mwangi', amount: 450, status: 'Paid', date: '17 Sep 2026' },
    { id: 'txn-002', branchId: 'br-mombasa', type: 'Agency commission', party: 'Al Noor Construction', amount: 2800, status: 'Pending approval', date: '16 Sep 2026' },
    { id: 'txn-003', branchId: 'br-nairobi', type: 'Candidate fee', party: 'Mary Njeri', amount: 300, status: 'Pending', date: '15 Sep 2026' },
    { id: 'txn-004', branchId: 'br-kisumu', type: 'Agency commission', party: 'NordCare Group', amount: 5200, status: 'Paid', date: '13 Sep 2026' }
  ]
};
