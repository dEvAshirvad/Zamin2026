export type Locale = 'hi' | 'en';

export const DEFAULT_LOCALE: Locale = 'hi';
export const LOCALE_STORAGE_KEY = 'pz-locale';

/**
 * `en` is the key authority. `hi` below is typed `Record<MessageKey, string>`,
 * so a missing Hindi string is a build error, not a runtime fallback. Add to
 * `en` first and let the compiler tell you what is outstanding.
 * See design.md §9.
 */
const en = {
  // Brand
  brand: 'Simankan',
  brandTagline: 'Demarcation, on time',
  brandStamp: 'Lok Seva Guarantee — Demarcation Tracker',

  // Session
  signOut: 'Sign out',
  signIn: 'Sign in',
  signingIn: 'Signing in…',
  loginTitle: 'Portal Login',
  loginSubtitle: 'For authorised departmental users only.',
  secureAccess: 'Secure Access',
  portalLogin: 'Portal Login',
  loginHelp: 'Trouble logging in? Contact your administrator.',
  loginFooter: 'Demarcation case tracker · Lok Seva Guarantee.',
  email: 'Email',
  password: 'Password',
  signInFailed: 'Sign in failed',
  checkingSession: 'Checking session…',

  // Shared
  loading: 'Loading…',
  close: 'Close',
  cancel: 'Cancel',
  copy: 'Copy',
  copied: 'Copied',
  openMenu: 'Menu',
  language: 'Language',
  search: 'Search',
  searchPlaceholder: 'Search…',
  previous: 'Previous',
  next: 'Next',
  pageOf: 'Page {page} of {totalPages}',
  showingRows: '{from}–{to} of {total}',
  noResults: 'No results.',

  // Navigation
  navOverview: 'Overview',
  navCases: 'Cases',
  navStaff: 'Staff',
  navMetrics: 'Metrics',
  navAudit: 'Audit log',

  // SLA
  overdueOnly: 'Overdue only',
  overdue: 'Overdue',
  dueSoon: 'Due soon',
  onTrack: 'On track',
  closed: 'Closed',
  stageLate: 'stage late',
  guaranteeTitle: 'Lok Seva Guarantee',
  guaranteeDue: 'Guarantee due',
  stageDue: 'Stage due',
  daysLeft: '{n} days left',
  dayLeft: '1 day left',
  dueToday: 'Due today',
  daysOverdue: '{n} days overdue',
  dayOverdue: '1 day overdue',

  // Case list
  noCases: 'No cases yet.',
  noCasesHint: 'Cases you create will appear here.',
  noOverdueCases: 'Nothing is overdue.',
  noOverdueCasesHint: 'Every case is inside its 30-day guarantee.',
  open: 'Open',
  backToList: 'Back to list',
  caseNo: 'Case no.',
  applicant: 'Applicant',
  stage: 'Stage',
  sla: 'SLA',
  caseCount: '{n} cases',
  caseCountOne: '1 case',

  // Case detail
  caseDetail: 'Case detail',
  caseNotFound: 'Case not found',
  advanceCase: 'Advance case',
  pipeline: 'Progress',
  history: 'History',
  noTransitions: 'No transitions yet.',
  village: 'Village',
  contact: 'Contact',
  khasras: 'Khasras',
  fee: 'Fee',
  filedAt: 'Filed at',
  assignedRi: 'Assigned RI',
  lastNote: 'Last note',
  documents: 'Documents',
  autoAssign: 'Auto-assign (least loaded)',
  riOptional: 'Revenue Inspector',
  riOptionalHint: 'Leave on auto-assign to pick the least-loaded RI.',
  noteOptional: 'Note',
  transitionFailed: 'Could not advance the case',
  riWorkDone: 'Your work is done',
  riWorkDoneNote: 'Forwarded to Tehsildar. No further action needed from you.',

  // Case create
  newCase: 'New case',
  hideForm: 'Cancel',
  createCase: 'Create case',
  creatingCase: 'Creating…',
  createCaseFailed: 'Could not create case',
  applicantName: 'Applicant name',
  contactOptional: 'Contact',
  optional: 'optional',
  khasrasHint: 'Comma or newline separated. Fee is ₹50 per khasra.',
  khasrasPlaceholder: '12, 13, 14',
  feeFor: 'Fee for {n} khasras',

  // Roles
  admin: 'Admin',
  tehsildar: 'Tehsildar',
  ri: 'Revenue Inspector',
  patwari: 'Patwari',
  allCases: 'All cases',
  auditLog: 'Audit log',
  caseMetrics: 'Case metrics',

  // Admin — staff
  staff: 'Staff',
  importStaff: 'Import staff',
  importStaffHint:
    'CSV or XLSX with columns name, email, tehsil. Upload each role separately.',
  uploadTehsildars: 'Upload tehsildars',
  uploadRis: 'Upload RIs',
  downloadTemplate: 'Download CSV templates',
  downloadTemplateXlsx: 'Download Excel templates',
  downloadPasswords: 'Download passwords',
  addStaff: 'Add staff',
  addStaffTitle: 'Add one staff member',
  addStaffSubmit: 'Create account',
  creatingStaff: 'Creating…',
  staffCreated: 'Staff created',
  deleteSelected: 'Delete selected',
  deleteStaffConfirm: 'Delete {n} staff account(s)? Admins cannot be deleted.',
  deleteStaffFailed: 'Could not delete staff',
  selectStaff: 'Select',
  tehsilName: 'Tehsil',
  importing: 'Importing…',
  importFailed: 'Import failed',
  lastImport: 'Last import',
  importSummary: '{role}: {created} created, {skipped} skipped',
  line: 'Line',
  status: 'Status',
  reason: 'Reason',
  name: 'Name',
  role: 'Role',
  actions: 'Actions',
  showPassword: 'Show password',
  resetPassword: 'Reset',
  tempPassword: 'Temporary password',
  passwordLoadFailed: 'Could not load password',
  resetFailed: 'Reset failed',
  downloadFailed: 'Download failed',
  noStaff: 'No staff imported yet.',
  noStaffHint: 'Upload a sheet or add one staff member to provision accounts.',
  searchStaff: 'Search name or email…',
  searchCases: 'Search case no, applicant, village…',
  filterStage: 'Stage',
  filterAllStages: 'All stages',
  filterTehsil: 'Tehsil',
  filterAllTehsils: 'All tehsils',
  clearFilters: 'Clear filters',
  searchAudit: 'Search case, stage, note, actor…',
  inviteEmails: 'Invite emails',
  inviteOn: 'On',
  inviteOff: 'Off',
  inviteNote: 'Passwords stay downloadable either way.',

  // Admin — metrics
  total: 'Total',
  openCases: 'Open',
  closedEcourt: 'Closed (order / objection)',
  byStage: 'By stage',
  byTehsil: 'By tehsil',
  tehsil: 'Tehsil',
  count: 'Count',
  metricsFailed: 'Could not load metrics',
  noMetrics: 'No case data yet.',
  metricClosureRate: 'Closure rate',
  metricClosureHint: '{closed} of {total} closed (order or objection)',
  metricOverdueShare: 'Overdue share',
  metricOverdueHint: '{overdue} of {total} past guarantee',
  metricOnTrackRate: 'Open on track',
  metricOnTrackHint: 'Share of {open} open cases still within SLA',
  metricBottleneck: 'Pipeline bottleneck',
  metricBottleneckHint: '{stage} holds the most open work ({count} cases)',
  metricRiskTehsil: 'Highest SLA risk',
  metricRiskTehsilHint: '{tehsil} — {rate}% overdue ({overdue} cases)',
  metricStageChartHint: 'Where work sits in the demarcation pipeline',
  metricTehsilLoad: 'Tehsil caseload',
  metricTehsilLoadHint: 'Top tehsils by volume — total, overdue, closed',
  metricTehsilRadar: 'Tehsil health profile',
  metricTehsilRadarHint:
    'Closure, on-track open cases, and share of district caseload (top 5)',
  metricCaseloadShare: 'Caseload share',
  metricPeriodMode: 'Period',
  metricFilterMonth: 'Month',
  metricFilterRange: 'Date range',
  metricFilterFrom: 'From',
  metricFilterTo: 'To',
  metricFilterTehsils: 'Tehsils',
  metricFilterAllTehsils: 'All tehsils',
  metricFilterReset: 'Reset filters',
  metricReportOverdue: 'Report overdue',
  metricSuperiorAlerts: 'Superior alerts',
  metricAvgOpenAge: 'Avg open age',
  metricAvgCloseDays: 'Avg days to close',
  metricDaysUnit: 'days',
  metricTopCloser: 'Top closer',
  metricHeaviestLoad: 'Heaviest load',
  metricLoadImbalance: 'imbalance',
  metricStaffReport: 'RI / Patwari report card',
  metricStaffReportHint:
    'Allotted vs completed, SLA risk, and stage stock for each field officer in the selected cohort (cases filed in period).',
  metricNoStaffRows: 'No assigned RI/Patwari work in this filter.',
  metricAllotted: 'Allotted',

  // Case lifecycle explainer (list pages)
  lifecycleEyebrow: 'Process',
  lifecycleTitle: 'How a demarcation case moves',
  lifecycleIntro:
    'Official land boundary (सर सीमांकन) work follows tehsil intake → memo → Suchna Patra → demarcation / objection → report → order, inside the 30-day Lok Seva Guarantee.',
  lifecycleStep1Title: 'File & Suchna intake',
  lifecycleStep1Body:
    'Tehsildar registers the applicant, khasra+rakba, neighbors, and demarcation date (Suchna Patra fields). Fee remains ₹50 per khasra. The guarantee clock starts.',
  lifecycleStep1Meta: 'Day 0',
  lifecycleStep2Title: 'Memo & notice',
  lifecycleStep2Body:
    'Tehsildar issues a memo to an RI and Patwari. They issue the Suchna Patra for the intake demarcation date and time.',
  lifecycleStep2Meta: '~1 week',
  lifecycleStep3Title: 'Report upload window',
  lifecycleStep3Body:
    'After notice: upload the demarcation report by 11:59 PM on the demarcation day, or reschedule. Miss the deadline and the case is Overdue; late reschedule still works but raises a superior-admin alert. Objection with reason closes the case.',
  lifecycleStep3Meta: 'Until 11:59 PM on demarcation day',
  lifecycleStep4Title: 'Report & order',
  lifecycleStep4Body:
    'Assigned RI/Patwari submit the demarcation report. Tehsildar issues the order — that ends the pipeline (no eCourt step).',
  lifecycleStep4Meta: 'Within 30 days',

  // Admin — audit
  when: 'When',
  case: 'Case',
  transition: 'Transition',
  actor: 'Actor',
  note: 'Note',
  noAudit: 'No transitions recorded yet.',

  // Transitions
  'action.memo': 'Issue memo to RI + Patwari',
  'action.notice': 'Issue notice (Suchna Patra)',
  'action.objection': 'Close with objection',
  'action.demarcationYes': 'Yes — open demarcation',
  'action.demarcationNo': 'Reschedule demarcation',
  'action.demarcationDone': 'Mark demarcation done',
  'action.report': 'Submit demarcation report',
  'action.order': 'Issue order',

  // Stages
  'stage.SUBMITTED': 'Submitted',
  'stage.MEMO_ISSUED': 'Memo issued',
  'stage.NOTICE_ISSUED': 'Notice issued',
  'stage.HEARING_SCHEDULED': 'Notice issued',
  'stage.OBJECTION_CLOSED': 'Objection closed',
  'stage.DEMARCATION_WINDOW_OPEN': 'Demarcation window open',
  'stage.DEMARCATION_DONE': 'Demarcation done',
  'stage.REPORT_SUBMITTED': 'Report submitted',
  'stage.ORDER_ISSUED': 'Order issued',

  // Stages — short, for the stepper track
  'stageShort.SUBMITTED': 'Filed',
  'stageShort.MEMO_ISSUED': 'Memo',
  'stageShort.NOTICE_ISSUED': 'Notice',
  'stageShort.HEARING_SCHEDULED': 'Notice',
  'stageShort.OBJECTION_CLOSED': 'Objection',
  'stageShort.DEMARCATION_WINDOW_OPEN': 'Window',
  'stageShort.DEMARCATION_DONE': 'Done',
  'stageShort.REPORT_SUBMITTED': 'Report',
  'stageShort.ORDER_ISSUED': 'Order',

  assignedPatwari: 'Assigned Patwari',
  patwariRequired: 'Patwari',
  riRequired: 'Revenue Inspector',
  demarcationDate: 'Demarcation date',
  demarcationTime: 'Demarcation time',
  demarcationAt: 'Demarcation date and time',
  rescheduleAt: 'New demarcation date and time',
  currentDemarcation: 'Current schedule',
  rescheduleReason: 'Reason for reschedule',
  rescheduleReasonRequired: 'Reschedule reason is required',
  rescheduleReasonPlaceholder: 'e.g. applicant request / weather / staff duty',
  guardianType: 'Father / Husband',
  guardianName: 'Father / Husband name',
  address: 'Address',
  applicationDate: 'Application date',
  applicantResidence: 'Address',
  patwariHalka: 'Patwari halka no.',
  issueDate: 'Issue date',
  officeDefaults: 'Office defaults',
  rakba: 'Rakba (ha)',
  totalRakba: 'Total rakba',
  neighbors: 'Boundary neighbors',
  neighborName: 'Owner name',
  neighborAddress: 'Address',
  addKhasra: 'Add khasra',
  addNeighbor: 'Add neighbor',
  objectionReason: 'Objection reason',
  rescheduleDate: 'New demarcation date',
  reportFile: 'Demarcation report (PDF / JPEG / PNG)',
  noticeFile: 'Notice (PDF / JPEG / PNG)',
  noticeFileRequired: 'Notice file is required',
  downloadNotice: 'Download notice',
  downloadReport: 'Download report',
  noNotice: 'No notice file',
  noReport: 'No report file',
  alertOverdue: 'Report overdue',
  filterAlertOverdue: 'Report overdue',
  closedTerminal: 'Closed',
  uploadPatwaris: 'Upload Patwaris',
  father: 'Father',
  husband: 'Husband',
  demarcationOnlyToday: 'Demarcation can only open on the scheduled date',
  reportRequired: 'Report file is required',
  objectionRequired: 'Objection reason is required',
  assignBothRequired: 'Select both RI and Patwari',
  assignStaff: 'Assign RI / Patwari',
  assignStaffRequired: 'Select an RI or Patwari',
  noticeDate: 'Notice date',
  neighborsRequired: 'Add at least one neighbor',
  generateNoticeDraft: 'Generate notice draft (PDF)',
  generatingNotice: 'Generating…',
  generateNoticeHint:
    'Fill neighbors, notice date, and demarcation time first. Download a prefilled Suchna Patra (blanks left for missing land details), then upload the final signed scan.',
  reportRemaining: 'Time left to upload report: {time}',
  reportOverdueDeadline: 'Report deadline passed — marked Overdue',
  reportUploadOverdueHint: 'You can still upload; case stays Overdue until submitted.',
  reportUploadBeforeDemarcation:
    'Report upload opens on the demarcation date (not before).',
  noticeAfterApplication: 'Notice date must be on or after the application date.',
  demarcationAfterNotice: 'Demarcation date must be on or after the notice date.',
  rescheduleAfterDemarcation:
    'Reschedule date and time must be after the current demarcation.',
  rescheduleAfterOverdueHint:
    'Rescheduling after overdue will raise an alert to the superior admin.',
  superiorAlertRaised: 'Superior alert: rescheduled after report deadline',
  reportDue: 'Report due',
  signatoryOffice: 'Office / mandal',
  district: 'District',
  state: 'State',
  tehsildarNameField: 'Tehsildar name',
} as const;

type MessageKey = keyof typeof en;

const hi: Record<MessageKey, string> = {
  // Brand
  brand: 'सीमांकन',
  brandTagline: 'सीमांकन, समय पर',
  brandStamp: 'लोक सेवा गारंटी — सीमांकन ट्रैकर',

  // Session
  signOut: 'साइन आउट',
  signIn: 'साइन इन',
  signingIn: 'साइन इन हो रहा है…',
  loginTitle: 'पोर्टल लॉगिन',
  loginSubtitle: 'केवल अधिकृत विभागीय उपयोगकर्ताओं के लिए।',
  secureAccess: 'सुरक्षित पहुँच',
  portalLogin: 'पोर्टल लॉगिन',
  loginHelp: 'लॉगिन में समस्या? अपने प्रशासक से संपर्क करें।',
  loginFooter: 'सीमांकन प्रकरण ट्रैकर · लोक सेवा गारंटी।',
  email: 'ईमेल',
  password: 'पासवर्ड',
  signInFailed: 'साइन इन विफल',
  checkingSession: 'सत्र जाँचा जा रहा है…',

  // Shared
  loading: 'लोड हो रहा है…',
  close: 'बंद करें',
  cancel: 'रद्द करें',
  copy: 'कॉपी',
  copied: 'कॉपी हो गया',
  openMenu: 'मेन्यू',
  language: 'भाषा',
  search: 'खोजें',
  searchPlaceholder: 'खोजें…',
  previous: 'पिछला',
  next: 'अगला',
  pageOf: 'पृष्ठ {page} / {totalPages}',
  showingRows: '{from}–{to} / {total}',
  noResults: 'कोई परिणाम नहीं।',

  // Navigation
  navOverview: 'सारांश',
  navCases: 'प्रकरण',
  navStaff: 'कर्मचारी',
  navMetrics: 'मेट्रिक्स',
  navAudit: 'ऑडिट लॉग',

  // SLA
  overdueOnly: 'केवल अतिदेय',
  overdue: 'अतिदेय',
  dueSoon: 'शीघ्र देय',
  onTrack: 'समय पर',
  closed: 'पूर्ण',
  stageLate: 'चरण विलंबित',
  guaranteeTitle: 'लोक सेवा गारंटी',
  guaranteeDue: 'गारंटी देय',
  stageDue: 'चरण देय',
  daysLeft: '{n} दिन शेष',
  dayLeft: '1 दिन शेष',
  dueToday: 'आज देय',
  daysOverdue: '{n} दिन अतिदेय',
  dayOverdue: '1 दिन अतिदेय',

  // Case list
  noCases: 'अभी कोई प्रकरण नहीं।',
  noCasesHint: 'आपके द्वारा दर्ज प्रकरण यहाँ दिखाई देंगे।',
  noOverdueCases: 'कोई प्रकरण अतिदेय नहीं।',
  noOverdueCasesHint: 'सभी प्रकरण 30-दिवसीय गारंटी के भीतर हैं।',
  open: 'खोलें',
  backToList: 'सूची पर वापस',
  caseNo: 'प्रकरण क्र.',
  applicant: 'आवेदक',
  stage: 'चरण',
  sla: 'गारंटी',
  caseCount: '{n} प्रकरण',
  caseCountOne: '1 प्रकरण',

  // Case detail
  caseDetail: 'प्रकरण विवरण',
  caseNotFound: 'प्रकरण नहीं मिला',
  advanceCase: 'प्रकरण आगे बढ़ाएँ',
  pipeline: 'प्रगति',
  history: 'इतिहास',
  noTransitions: 'अभी कोई कार्यवाही दर्ज नहीं।',
  village: 'ग्राम',
  contact: 'संपर्क',
  khasras: 'खसरा',
  fee: 'शुल्क',
  filedAt: 'दाखिल तिथि',
  assignedRi: 'नियुक्त आरआई',
  lastNote: 'अंतिम टिप्पणी',
  documents: 'दस्तावेज़',
  autoAssign: 'स्वतः नियुक्ति (सबसे कम भार)',
  riOptional: 'राजस्व निरीक्षक',
  riOptionalHint:
    'स्वतः नियुक्ति पर छोड़ने से सबसे कम भार वाले आरआई चुने जाएँगे।',
  noteOptional: 'टिप्पणी',
  transitionFailed: 'प्रकरण आगे नहीं बढ़ाया जा सका',
  riWorkDone: 'आपका कार्य पूर्ण हो गया',
  riWorkDoneNote: 'तहसीलदार को अग्रेषित। आपकी ओर से और कोई कार्रवाई नहीं।',

  // Case create
  newCase: 'नया प्रकरण',
  hideForm: 'रद्द करें',
  createCase: 'प्रकरण दर्ज करें',
  creatingCase: 'दर्ज हो रहा है…',
  createCaseFailed: 'प्रकरण दर्ज नहीं हो सका',
  applicantName: 'आवेदक का नाम',
  contactOptional: 'संपर्क',
  optional: 'वैकल्पिक',
  khasrasHint: 'कॉमा या नई पंक्ति से अलग करें। प्रति खसरा ₹50 शुल्क।',
  khasrasPlaceholder: '12, 13, 14',
  feeFor: '{n} खसरा हेतु शुल्क',

  // Roles
  admin: 'एडमिन',
  tehsildar: 'तहसीलदार',
  ri: 'राजस्व निरीक्षक',
  patwari: 'पटवारी',
  allCases: 'सभी प्रकरण',
  auditLog: 'ऑडिट लॉग',
  caseMetrics: 'प्रकरण मेट्रिक्स',

  // Admin — staff
  staff: 'कर्मचारी',
  importStaff: 'कर्मचारी आयात',
  importStaffHint:
    'CSV या XLSX, कॉलम: name, email, tehsil। प्रत्येक भूमिका अलग अपलोड करें।',
  uploadTehsildars: 'तहसीलदार अपलोड',
  uploadRis: 'आरआई अपलोड',
  downloadTemplate: 'CSV टेम्पलेट्स',
  downloadTemplateXlsx: 'Excel टेम्पलेट्स',
  downloadPasswords: 'पासवर्ड डाउनलोड',
  addStaff: 'कर्मचारी जोड़ें',
  addStaffTitle: 'एक कर्मचारी जोड़ें',
  addStaffSubmit: 'खाता बनाएँ',
  creatingStaff: 'बनाया जा रहा है…',
  staffCreated: 'कर्मचारी बनाया गया',
  deleteSelected: 'चयनित हटाएँ',
  deleteStaffConfirm: '{n} कर्मचारी खाते हटाएँ? एडमिन नहीं हटाए जा सकते।',
  deleteStaffFailed: 'कर्मचारी हटा नहीं सके',
  selectStaff: 'चयन',
  tehsilName: 'तहसील',
  importing: 'आयात हो रहा है…',
  importFailed: 'आयात विफल',
  lastImport: 'पिछला आयात',
  importSummary: '{role}: {created} जोड़े गए, {skipped} छोड़े गए',
  line: 'पंक्ति',
  status: 'स्थिति',
  reason: 'कारण',
  name: 'नाम',
  role: 'भूमिका',
  actions: 'कार्रवाई',
  showPassword: 'पासवर्ड देखें',
  resetPassword: 'रीसेट',
  tempPassword: 'अस्थायी पासवर्ड',
  passwordLoadFailed: 'पासवर्ड लोड नहीं हो सका',
  resetFailed: 'रीसेट विफल',
  downloadFailed: 'डाउनलोड विफल',
  noStaff: 'अभी कोई कर्मचारी आयात नहीं।',
  noStaffHint: 'शीट अपलोड करें या एक कर्मचारी जोड़कर खाते बनाएँ।',
  searchStaff: 'नाम या ईमेल खोजें…',
  searchCases: 'प्रकरण संख्या, आवेदक, ग्राम खोजें…',
  filterStage: 'चरण',
  filterAllStages: 'सभी चरण',
  filterTehsil: 'तहसील',
  filterAllTehsils: 'सभी तहसील',
  clearFilters: 'फ़िल्टर हटाएँ',
  searchAudit: 'प्रकरण, चरण, नोट, कर्ता खोजें…',
  inviteEmails: 'आमंत्रण ईमेल',
  inviteOn: 'चालू',
  inviteOff: 'बंद',
  inviteNote: 'पासवर्ड डाउनलोड दोनों स्थितियों में उपलब्ध।',

  // Admin — metrics
  total: 'कुल',
  openCases: 'खुले',
  closedEcourt: 'पूर्ण (ई-कोर्ट)',
  byStage: 'चरण अनुसार',
  byTehsil: 'तहसील अनुसार',
  tehsil: 'तहसील',
  count: 'संख्या',
  metricsFailed: 'मेट्रिक्स लोड नहीं हो सके',
  noMetrics: 'अभी कोई प्रकरण डेटा नहीं।',
  metricClosureRate: 'समापन दर',
  metricClosureHint: '{total} में से {closed} ई-कोर्ट पर पूर्ण',
  metricOverdueShare: 'अतिदेय अंश',
  metricOverdueHint: '{total} में से {overdue} गारंटी से आगे',
  metricOnTrackRate: 'खुले समय पर',
  metricOnTrackHint: '{open} खुले प्रकरणों में SLA के भीतर',
  metricBottleneck: 'पाइपलाइन बाधा',
  metricBottleneckHint: '{stage} में सबसे अधिक कार्य ({count} प्रकरण)',
  metricRiskTehsil: 'सर्वाधिक SLA जोखिम',
  metricRiskTehsilHint: '{tehsil} — {rate}% अतिदेय ({overdue} प्रकरण)',
  metricStageChartHint: 'सीमांकन पाइपलाइन में कार्य कहाँ रुका है',
  metricTehsilLoad: 'तहसील कार्यभार',
  metricTehsilLoadHint: 'मात्रा के अनुसार शीर्ष तहसील — कुल, अतिदेय, पूर्ण',
  metricTehsilRadar: 'तहसील स्वास्थ्य प्रोफ़ाइल',
  metricTehsilRadarHint: 'समापन, समय पर खुले प्रकरण, और जिले का अंश (शीर्ष 5)',
  metricCaseloadShare: 'कार्यभार अंश',
  metricPeriodMode: 'अवधि',
  metricFilterMonth: 'माह',
  metricFilterRange: 'दिनांक सीमा',
  metricFilterFrom: 'से',
  metricFilterTo: 'तक',
  metricFilterTehsils: 'तहसील',
  metricFilterAllTehsils: 'सभी तहसील',
  metricFilterReset: 'फ़िल्टर रीसेट',
  metricReportOverdue: 'प्रतिवेदन विलंबित',
  metricSuperiorAlerts: 'वरिष्ठ अलर्ट',
  metricAvgOpenAge: 'औसत खुला समय',
  metricAvgCloseDays: 'बंद होने में औसत दिन',
  metricDaysUnit: 'दिन',
  metricTopCloser: 'सर्वोत्तम पूर्णता',
  metricHeaviestLoad: 'सबसे अधिक भार',
  metricLoadImbalance: 'असंतुलन',
  metricStaffReport: 'आरआई / पटवारी रिपोर्ट कार्ड',
  metricStaffReportHint:
    'चयनित अवधि में दाखिल प्रकरणों पर प्रत्येक फील्ड अधिकारी का आवंटन, पूर्णता, एसएलए जोखिम और चरणवार स्टॉक।',
  metricNoStaffRows: 'इस फ़िल्टर में कोई आरआई/पटवारी आवंटन नहीं।',
  metricAllotted: 'आवंटित',

  // Case lifecycle explainer (list pages)
  lifecycleEyebrow: 'प्रक्रिया',
  lifecycleTitle: 'सीमांकन प्रकरण कैसे आगे बढ़ता है',
  lifecycleIntro:
    'सर सीमांकन कार्य तहसील में दाखिल होने से ई-कोर्ट तक निश्चित हस्तांतरण में चलता है — 30-दिन की लोक सेवा गारंटी के भीतर।',
  lifecycleStep1Title: 'दाखिला एवं पंजीकरण',
  lifecycleStep1Body:
    'तहसीलदार ग्राम, खसरा, चालान (₹50 प्रति खसरा) और वैकल्पिक नक्शा के साथ आवेदन दर्ज करता है। प्रकरण दाखिल पर खुलता है और गारंटी घड़ी शुरू होती है।',
  lifecycleStep1Meta: 'दिन 0',
  lifecycleStep2Title: 'ज्ञापन एवं सूचना',
  lifecycleStep2Body:
    'तहसीलदार आरआई और पटवारी को ज्ञापन जारी करता है। वे दाखिल सीमांकन दिनांक/समय पर सूचना-पत्र जारी करते हैं।',
  lifecycleStep2Meta: '~1 सप्ताह',
  lifecycleStep3Title: 'प्रतिवेदन अपलोड अवधि',
  lifecycleStep3Body:
    'सूचना के बाद: सीमांकन दिवस रात्रि 11:59 तक प्रतिवेदन अपलोड करें, या पुनर्निर्धारण करें। समय सीमा चूकने पर प्रकरण विलंबित (Overdue) होगा; बाद में पुनर्निर्धारण संभव है पर वरिष्ठ अधिकारी को अलर्ट जाता है। आपत्ति कारण सहित प्रकरण बंद करती है।',
  lifecycleStep3Meta: 'सीमांकन दिवस रात्रि 11:59 तक',
  lifecycleStep4Title: 'प्रतिवेदन एवं आदेश',
  lifecycleStep4Body:
    'नियुक्त आरआई/पटवारी सीमांकन प्रतिवेदन जमा करते हैं। तहसीलदार आदेश जारी करता है — पाइपलाइन यहीं समाप्त होती है।',
  lifecycleStep4Meta: '30 दिनों के भीतर',

  // Admin — audit
  when: 'समय',
  case: 'प्रकरण',
  transition: 'कार्यवाही',
  actor: 'कर्ता',
  note: 'टिप्पणी',
  noAudit: 'अभी कोई कार्यवाही दर्ज नहीं।',

  // Transitions
  'action.memo': 'आरआई + पटवारी को ज्ञापन जारी करें',
  'action.notice': 'सूचना-पत्र जारी करें',
  'action.objection': 'आपत्ति के साथ बंद करें',
  'action.demarcationYes': 'हाँ — सीमांकन खोलें',
  'action.demarcationNo': 'सीमांकन पुनर्निर्धारित करें',
  'action.demarcationDone': 'सीमांकन पूर्ण चिह्नित करें',
  'action.report': 'सीमांकन प्रतिवेदन जमा करें',
  'action.order': 'आदेश जारी करें',

  // Stages
  'stage.SUBMITTED': 'दाखिल',
  'stage.MEMO_ISSUED': 'ज्ञापन जारी',
  'stage.NOTICE_ISSUED': 'सूचना जारी',
  'stage.HEARING_SCHEDULED': 'सूचना जारी',
  'stage.OBJECTION_CLOSED': 'आपत्ति बंद',
  'stage.DEMARCATION_WINDOW_OPEN': 'सीमांकन विंडो खुली',
  'stage.DEMARCATION_DONE': 'सीमांकन पूर्ण',
  'stage.REPORT_SUBMITTED': 'प्रतिवेदन जमा',
  'stage.ORDER_ISSUED': 'आदेश जारी',

  // Stages — short
  'stageShort.SUBMITTED': 'दाखिल',
  'stageShort.MEMO_ISSUED': 'ज्ञापन',
  'stageShort.NOTICE_ISSUED': 'सूचना',
  'stageShort.HEARING_SCHEDULED': 'सूचना',
  'stageShort.OBJECTION_CLOSED': 'आपत्ति',
  'stageShort.DEMARCATION_WINDOW_OPEN': 'विंडो',
  'stageShort.DEMARCATION_DONE': 'पूर्ण',
  'stageShort.REPORT_SUBMITTED': 'प्रतिवेदन',
  'stageShort.ORDER_ISSUED': 'आदेश',

  assignedPatwari: 'नियुक्त पटवारी',
  patwariRequired: 'पटवारी',
  riRequired: 'राजस्व निरीक्षक',
  demarcationDate: 'सीमांकन दिनांक',
  demarcationTime: 'सीमांकन समय',
  demarcationAt: 'सीमांकन दिनांक और समय',
  rescheduleAt: 'नई सीमांकन दिनांक और समय',
  currentDemarcation: 'वर्तमान निर्धारण',
  rescheduleReason: 'पुनर्निर्धारण का कारण',
  rescheduleReasonRequired: 'पुनर्निर्धारण का कारण आवश्यक है',
  rescheduleReasonPlaceholder: 'जैसे– आवेदक अनुरोध / मौसम / ड्यूटी',
  guardianType: 'पिता / पति',
  guardianName: 'पिता / पति का नाम',
  address: 'पता',
  applicationDate: 'आवेदन तिथि',
  applicantResidence: 'पता',
  patwariHalka: 'पटवारी हल्का नम्बर',
  issueDate: 'जारी दिनांक',
  officeDefaults: 'कार्यालय डिफ़ॉल्ट',
  rakba: 'रकबा (हे.)',
  totalRakba: 'योग रकबा',
  neighbors: 'बटांकनधारी',
  neighborName: 'स्वामी का नाम',
  neighborAddress: 'पता',
  addKhasra: 'खसरा जोड़ें',
  addNeighbor: 'पड़ोसी जोड़ें',
  objectionReason: 'आपत्ति का कारण',
  rescheduleDate: 'नई सीमांकन दिनांक',
  reportFile: 'सीमांकन प्रतिवेदन (PDF / JPEG / PNG)',
  noticeFile: 'सूचना (PDF / JPEG / PNG)',
  noticeFileRequired: 'सूचना फ़ाइल आवश्यक है',
  downloadNotice: 'सूचना डाउनलोड',
  downloadReport: 'प्रतिवेदन डाउनलोड',
  noNotice: 'सूचना फ़ाइल नहीं',
  noReport: 'प्रतिवेदन फ़ाइल नहीं',
  alertOverdue: 'प्रतिवेदन विलंबित',
  filterAlertOverdue: 'प्रतिवेदन विलंबित',
  closedTerminal: 'बंद',
  uploadPatwaris: 'पटवारी अपलोड',
  father: 'पिता',
  husband: 'पति',
  demarcationOnlyToday: 'सीमांकन केवल निर्धारित दिनांक पर खुल सकता है',
  reportRequired: 'प्रतिवेदन फ़ाइल आवश्यक',
  objectionRequired: 'आपत्ति का कारण आवश्यक',
  assignBothRequired: 'आरआई और पटवारी दोनों चुनें',
  assignStaff: 'आरआई / पटवारी नियुक्त करें',
  assignStaffRequired: 'आरआई या पटवारी चुनें',
  noticeDate: 'सूचना तिथि',
  neighborsRequired: 'कम से कम एक पड़ोसी जोड़ें',
  generateNoticeDraft: 'सूचना-पत्र ड्राफ्ट बनाएँ (PDF)',
  generatingNotice: 'बनाया जा रहा है…',
  generateNoticeHint:
    'पहले पड़ोसी, सूचना दिनांक और सीमांकन समय भरें। पूर्व-भरा सूचना-पत्र डाउनलोड करें (खाली भूमि विवरण हेतु रिक्त स्थान), फिर हस्ताक्षरित स्कैन अपलोड करें।',
  reportRemaining: 'रिपोर्ट अपलोड हेतु शेष समय: {time}',
  reportOverdueDeadline: 'रिपोर्ट समय सीमा समाप्त — विलंबित चिह्नित',
  reportUploadOverdueHint:
    'फिर भी अपलोड कर सकते हैं; जमा होने तक विलंबित रहेगा।',
  reportUploadBeforeDemarcation:
    'प्रतिवेदन अपलोड सीमांकन दिनांक पर ही सक्रिय होगा (उससे पहले नहीं)।',
  noticeAfterApplication: 'सूचना दिनांक आवेदन दिनांक के दिन या उसके बाद होनी चाहिए।',
  demarcationAfterNotice: 'सीमांकन दिनांक सूचना दिनांक के दिन या उसके बाद होनी चाहिए।',
  rescheduleAfterDemarcation:
    'पुनर्निर्धारण दिनांक/समय वर्तमान सीमांकन के बाद होना चाहिए।',
  rescheduleAfterOverdueHint:
    'समय सीमा के बाद पुनर्निर्धारण से वरिष्ठ एडमिन को अलर्ट जाएगा।',
  superiorAlertRaised: 'वरिष्ठ अलर्ट: समय सीमा के बाद पुनर्निर्धारण',
  reportDue: 'प्रतिवेदन समय सीमा',
  signatoryOffice: 'कार्यालय / मण्डल',
  district: 'जिला',
  state: 'राज्य',
  tehsildarNameField: 'तहसीलदार का नाम',
};

const catalogs: Record<Locale, Record<MessageKey, string>> = {
  en: { ...en },
  hi,
};

export type { MessageKey };

/** Canonical stage order — drives the stepper track. */
export const STAGE_ORDER = [
  'SUBMITTED',
  'MEMO_ISSUED',
  'HEARING_SCHEDULED',
  'REPORT_SUBMITTED',
  'ORDER_ISSUED',
] as const;

/** Branch terminal — shown when case closed via objection. */
export const OBJECTION_STAGE = 'OBJECTION_CLOSED' as const;

export function translate(
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string | number>
): string {
  let text = catalogs[locale][key] ?? catalogs.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}

export function stageLabel(locale: Locale, stage: string): string {
  const key = `stage.${stage}` as MessageKey;
  if (key in catalogs.en) {
    return translate(locale, key);
  }
  return stage;
}

export function stageShortLabel(locale: Locale, stage: string): string {
  const key = `stageShort.${stage}` as MessageKey;
  if (key in catalogs.en) {
    return translate(locale, key);
  }
  return stageLabel(locale, stage);
}

export function parseStoredLocale(raw: string | null): Locale {
  return raw === 'en' ? 'en' : 'hi';
}

const INTL_LOCALE: Record<Locale, string> = { hi: 'hi-IN', en: 'en-IN' };

export function formatDate(locale: Locale, iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(INTL_LOCALE[locale], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(locale: Locale, iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(INTL_LOCALE[locale], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
