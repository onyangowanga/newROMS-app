export const candidateScope = user => user.role === 'recruiter'
  ? { applications: { some: { job: { recruiterId: user.id } } } }
  : ['super_admin', 'super_finance'].includes(user.role) ? {} : { branchId: user.branchId || '__none__' };

export const recruiterCandidateFields = {
  id: true, name: true, firstName: true, middleName: true, lastName: true,
  passport: true, email: true, phone: true, branchId: true,
  status: true, submitted: true,
  documents: { select: { id: true, name: true, fileName: true, documentType: true, mimeType: true } }
};

export const recruiterCandidateSelection = userId => ({
  ...recruiterCandidateFields,
  applications: { where: { job: { recruiterId: userId } }, select: { id: true, jobId: true, status: true, job: true } }
});