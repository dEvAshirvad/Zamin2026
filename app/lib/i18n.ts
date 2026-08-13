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
  'brand': 'Simankan',
  'brandTagline': 'Demarcation, on time',
  'brandStamp': 'Lok Seva Guarantee — Demarcation Tracker',

  // Session
  'signOut': 'Sign out',
  'signIn': 'Sign in',
  'signingIn': 'Signing in…',
  'loginTitle': 'Portal Login',
  'loginSubtitle': 'For authorised departmental users only.',
  'secureAccess': 'Secure Access',
  'portalLogin': 'Portal Login',
  'loginHelp': 'Trouble logging in? Contact your administrator.',
  'loginFooter': 'Demarcation case tracker · Lok Seva Guarantee.',
  'email': 'Email',
  'password': 'Password',
  'signInFailed': 'Sign in failed',
  'checkingSession': 'Checking session…',

  // Shared
  'loading': 'Loading…',
  'close': 'Close',
  'cancel': 'Cancel',
  'copy': 'Copy',
  'copied': 'Copied',
  'openMenu': 'Menu',
  'language': 'Language',
  'search': 'Search',
  'searchPlaceholder': 'Search…',
  'previous': 'Previous',
  'next': 'Next',
  'pageOf': 'Page {page} of {totalPages}',
  'showingRows': '{from}–{to} of {total}',
  'noResults': 'No results.',

  // Navigation
  'navOverview': 'Overview',
  'navCases': 'Cases',
  'navStaff': 'Staff',
  'navMetrics': 'Metrics',
  'navAudit': 'Audit log',

  // SLA
  'overdueOnly': 'Overdue only',
  'overdue': 'Overdue',
  'dueSoon': 'Due soon',
  'onTrack': 'On track',
  'closed': 'Closed',
  'stageLate': 'stage late',
  'guaranteeTitle': 'Lok Seva Guarantee',
  'guaranteeDue': 'Guarantee due',
  'stageDue': 'Stage due',
  'daysLeft': '{n} days left',
  'dayLeft': '1 day left',
  'dueToday': 'Due today',
  'daysOverdue': '{n} days overdue',
  'dayOverdue': '1 day overdue',

  // Case list
  'noCases': 'No cases yet.',
  'noCasesHint': 'Cases you create will appear here.',
  'noOverdueCases': 'Nothing is overdue.',
  'noOverdueCasesHint': 'Every case is inside its 30-day guarantee.',
  'open': 'Open',
  'backToList': 'Back to list',
  'caseNo': 'Case no.',
  'applicant': 'Applicant',
  'stage': 'Stage',
  'sla': 'SLA',
  'caseCount': '{n} cases',
  'caseCountOne': '1 case',

  // Case detail
  'caseDetail': 'Case detail',
  'caseNotFound': 'Case not found',
  'advanceCase': 'Advance case',
  'pipeline': 'Progress',
  'history': 'History',
  'noTransitions': 'No transitions yet.',
  'village': 'Village',
  'contact': 'Contact',
  'khasras': 'Khasras',
  'fee': 'Fee',
  'challanRef': 'Challan ref',
  'filedAt': 'Filed at',
  'assignedRi': 'Assigned RI',
  'hearing': 'Hearing',
  'ecourtRef': 'eCourt ref',
  'lastNote': 'Last note',
  'documents': 'Documents',
  'downloadMap': 'Download map',
  'downloadChallan': 'Download challan',
  'noMap': 'No map file',
  'noChallan': 'No challan file',
  'autoAssign': 'Auto-assign (least loaded)',
  'riOptional': 'Revenue Inspector',
  'riOptionalHint': 'Leave on auto-assign to pick the least-loaded RI.',
  'hearingDateTime': 'Hearing date and time',
  'ecourtReference': 'eCourt reference',
  'ecourtReferencePlaceholder': 'Reference / CNR',
  'noteOptional': 'Note',
  'transitionFailed': 'Could not advance the case',
  'hearingRequired': 'Hearing date and time is required',
  'riWorkDone': 'Your work is done',
  'riWorkDoneNote': 'Forwarded to Tehsildar. No further action needed from you.',

  // Case create
  'newCase': 'New case',
  'hideForm': 'Cancel',
  'createCase': 'Create case',
  'creatingCase': 'Creating…',
  'createCaseFailed': 'Could not create case',
  'applicantName': 'Applicant name',
  'contactOptional': 'Contact',
  'optional': 'optional',
  'khasrasHint': 'Comma or newline separated. Fee is ₹50 per khasra.',
  'khasrasPlaceholder': '12, 13, 14',
  'feeFor': 'Fee for {n} khasras',
  'mapFile': 'Map file',
  'challanFile': 'Challan file',

  // Roles
  'admin': 'Admin',
  'tehsildar': 'Tehsildar',
  'ri': 'Revenue Inspector',
  'allCases': 'All cases',
  'auditLog': 'Audit log',
  'caseMetrics': 'Case metrics',

  // Admin — staff
  'staff': 'Staff',
  'importStaff': 'Import staff',
  'importStaffHint': 'CSV or XLSX with columns name, email, tehsil. Upload each role separately.',
  'uploadTehsildars': 'Upload tehsildars',
  'uploadRis': 'Upload RIs',
  'downloadTemplate': 'Download template',
  'downloadPasswords': 'Download passwords',
  'importing': 'Importing…',
  'importFailed': 'Import failed',
  'lastImport': 'Last import',
  'importSummary': '{role}: {created} created, {skipped} skipped',
  'line': 'Line',
  'status': 'Status',
  'reason': 'Reason',
  'name': 'Name',
  'role': 'Role',
  'actions': 'Actions',
  'showPassword': 'Show password',
  'resetPassword': 'Reset',
  'tempPassword': 'Temporary password',
  'passwordLoadFailed': 'Could not load password',
  'resetFailed': 'Reset failed',
  'downloadFailed': 'Download failed',
  'noStaff': 'No staff imported yet.',
  'noStaffHint': 'Upload a tehsildar or RI sheet to provision accounts.',
  'searchStaff': 'Search name or email…',
  'searchCases': 'Search case no, applicant, village…',
  'searchAudit': 'Search case, stage, note, actor…',
  'inviteEmails': 'Invite emails',
  'inviteOn': 'On',
  'inviteOff': 'Off',
  'inviteNote': 'Passwords stay downloadable either way.',

  // Admin — metrics
  'total': 'Total',
  'openCases': 'Open',
  'closedEcourt': 'Closed (eCourt)',
  'byStage': 'By stage',
  'byTehsil': 'By tehsil',
  'tehsil': 'Tehsil',
  'count': 'Count',
  'metricsFailed': 'Could not load metrics',
  'noMetrics': 'No case data yet.',
  'metricClosureRate': 'Closure rate',
  'metricClosureHint': '{closed} of {total} closed via eCourt',
  'metricOverdueShare': 'Overdue share',
  'metricOverdueHint': '{overdue} of {total} past guarantee',
  'metricOnTrackRate': 'Open on track',
  'metricOnTrackHint': 'Share of {open} open cases still within SLA',
  'metricBottleneck': 'Pipeline bottleneck',
  'metricBottleneckHint': '{stage} holds the most open work ({count} cases)',
  'metricRiskTehsil': 'Highest SLA risk',
  'metricRiskTehsilHint': '{tehsil} — {rate}% overdue ({overdue} cases)',
  'metricStageChartHint': 'Where work sits in the demarcation pipeline',
  'metricTehsilLoad': 'Tehsil caseload',
  'metricTehsilLoadHint': 'Top tehsils by volume — total, overdue, closed',
  'metricTehsilRadar': 'Tehsil health profile',
  'metricTehsilRadarHint':
    'Closure, on-track open cases, and share of district caseload (top 5)',
  'metricCaseloadShare': 'Caseload share',

  // Case lifecycle explainer (list pages)
  'lifecycleEyebrow': 'Process',
  'lifecycleTitle': 'How a demarcation case moves',
  'lifecycleIntro':
    'Official land boundary (सर सीमांकन) work follows a fixed handoff from tehsil intake to eCourt — inside the 30-day Lok Seva Guarantee.',
  'lifecycleStep1Title': 'File & intake',
  'lifecycleStep1Body':
    'Tehsildar registers the application with village, khasras, challan (₹50 per khasra), and optional map. The case opens at Submitted and the guarantee clock starts.',
  'lifecycleStep1Meta': 'Day 0',
  'lifecycleStep2Title': 'Memo, notice & hearing',
  'lifecycleStep2Body':
    'Tehsildar issues a memo to an RI. The RI serves notice / ishtehaar to boundary farmers and schedules the hearing date.',
  'lifecycleStep2Meta': '~1 week',
  'lifecycleStep3Title': 'Objections & demarcation',
  'lifecycleStep3Body':
    'Objections window opens, then field demarcation is marked done on the scheduled date — the survey work that settles the boundary.',
  'lifecycleStep3Meta': '~2 weeks',
  'lifecycleStep4Title': 'Order & eCourt',
  'lifecycleStep4Body':
    'Tehsildar issues the order. Closing the loop means marking the case uploaded to eCourt — that ends the pipeline and clears the SLA clock.',
  'lifecycleStep4Meta': 'Within 30 days',

  // Admin — audit
  'when': 'When',
  'case': 'Case',
  'transition': 'Transition',
  'actor': 'Actor',
  'note': 'Note',
  'noAudit': 'No transitions recorded yet.',

  // Transitions
  'action.memo': 'Issue memo to RI',
  'action.notice': 'Issue notice (schedule hearing)',
  'action.objections': 'Start objections window',
  'action.demarcation': 'Mark demarcation done',
  'action.order': 'Issue order',
  'action.ecourt': 'Mark uploaded to eCourt',

  // Stages
  'stage.SUBMITTED': 'Submitted',
  'stage.MEMO_ISSUED': 'Memo issued',
  'stage.NOTICE_ISSUED': 'Notice issued',
  'stage.HEARING_SCHEDULED': 'Hearing scheduled',
  'stage.OBJECTIONS_WINDOW': 'Objections window',
  'stage.DEMARCATION_DONE': 'Demarcation done',
  'stage.ORDER_ISSUED': 'Order issued',
  'stage.ECOURT_UPLOADED': 'eCourt uploaded',

  // Stages — short, for the stepper track
  'stageShort.SUBMITTED': 'Filed',
  'stageShort.MEMO_ISSUED': 'Memo',
  'stageShort.NOTICE_ISSUED': 'Notice',
  'stageShort.HEARING_SCHEDULED': 'Hearing',
  'stageShort.OBJECTIONS_WINDOW': 'Objections',
  'stageShort.DEMARCATION_DONE': 'Demarcation',
  'stageShort.ORDER_ISSUED': 'Order',
  'stageShort.ECOURT_UPLOADED': 'eCourt',
} as const;

type MessageKey = keyof typeof en;

const hi: Record<MessageKey, string> = {
  // Brand
  'brand': 'सीमांकन',
  'brandTagline': 'सीमांकन, समय पर',
  'brandStamp': 'लोक सेवा गारंटी — सीमांकन ट्रैकर',

  // Session
  'signOut': 'साइन आउट',
  'signIn': 'साइन इन',
  'signingIn': 'साइन इन हो रहा है…',
  'loginTitle': 'पोर्टल लॉगिन',
  'loginSubtitle': 'केवल अधिकृत विभागीय उपयोगकर्ताओं के लिए।',
  'secureAccess': 'सुरक्षित पहुँच',
  'portalLogin': 'पोर्टल लॉगिन',
  'loginHelp': 'लॉगिन में समस्या? अपने प्रशासक से संपर्क करें।',
  'loginFooter': 'सीमांकन प्रकरण ट्रैकर · लोक सेवा गारंटी।',
  'email': 'ईमेल',
  'password': 'पासवर्ड',
  'signInFailed': 'साइन इन विफल',
  'checkingSession': 'सत्र जाँचा जा रहा है…',

  // Shared
  'loading': 'लोड हो रहा है…',
  'close': 'बंद करें',
  'cancel': 'रद्द करें',
  'copy': 'कॉपी',
  'copied': 'कॉपी हो गया',
  'openMenu': 'मेन्यू',
  'language': 'भाषा',
  'search': 'खोजें',
  'searchPlaceholder': 'खोजें…',
  'previous': 'पिछला',
  'next': 'अगला',
  'pageOf': 'पृष्ठ {page} / {totalPages}',
  'showingRows': '{from}–{to} / {total}',
  'noResults': 'कोई परिणाम नहीं।',

  // Navigation
  'navOverview': 'सारांश',
  'navCases': 'प्रकरण',
  'navStaff': 'कर्मचारी',
  'navMetrics': 'मेट्रिक्स',
  'navAudit': 'ऑडिट लॉग',

  // SLA
  'overdueOnly': 'केवल अतिदेय',
  'overdue': 'अतिदेय',
  'dueSoon': 'शीघ्र देय',
  'onTrack': 'समय पर',
  'closed': 'पूर्ण',
  'stageLate': 'चरण विलंबित',
  'guaranteeTitle': 'लोक सेवा गारंटी',
  'guaranteeDue': 'गारंटी देय',
  'stageDue': 'चरण देय',
  'daysLeft': '{n} दिन शेष',
  'dayLeft': '1 दिन शेष',
  'dueToday': 'आज देय',
  'daysOverdue': '{n} दिन अतिदेय',
  'dayOverdue': '1 दिन अतिदेय',

  // Case list
  'noCases': 'अभी कोई प्रकरण नहीं।',
  'noCasesHint': 'आपके द्वारा दर्ज प्रकरण यहाँ दिखाई देंगे।',
  'noOverdueCases': 'कोई प्रकरण अतिदेय नहीं।',
  'noOverdueCasesHint': 'सभी प्रकरण 30-दिवसीय गारंटी के भीतर हैं।',
  'open': 'खोलें',
  'backToList': 'सूची पर वापस',
  'caseNo': 'प्रकरण क्र.',
  'applicant': 'आवेदक',
  'stage': 'चरण',
  'sla': 'गारंटी',
  'caseCount': '{n} प्रकरण',
  'caseCountOne': '1 प्रकरण',

  // Case detail
  'caseDetail': 'प्रकरण विवरण',
  'caseNotFound': 'प्रकरण नहीं मिला',
  'advanceCase': 'प्रकरण आगे बढ़ाएँ',
  'pipeline': 'प्रगति',
  'history': 'इतिहास',
  'noTransitions': 'अभी कोई कार्यवाही दर्ज नहीं।',
  'village': 'ग्राम',
  'contact': 'संपर्क',
  'khasras': 'खसरा',
  'fee': 'शुल्क',
  'challanRef': 'चालान संदर्भ',
  'filedAt': 'दाखिल तिथि',
  'assignedRi': 'नियुक्त आरआई',
  'hearing': 'सुनवाई',
  'ecourtRef': 'ई-कोर्ट संदर्भ',
  'lastNote': 'अंतिम टिप्पणी',
  'documents': 'दस्तावेज़',
  'downloadMap': 'नक्शा डाउनलोड',
  'downloadChallan': 'चालान डाउनलोड',
  'noMap': 'नक्शा फ़ाइल नहीं',
  'noChallan': 'चालान फ़ाइल नहीं',
  'autoAssign': 'स्वतः नियुक्ति (सबसे कम भार)',
  'riOptional': 'राजस्व निरीक्षक',
  'riOptionalHint': 'स्वतः नियुक्ति पर छोड़ने से सबसे कम भार वाले आरआई चुने जाएँगे।',
  'hearingDateTime': 'सुनवाई तिथि व समय',
  'ecourtReference': 'ई-कोर्ट संदर्भ',
  'ecourtReferencePlaceholder': 'संदर्भ / CNR',
  'noteOptional': 'टिप्पणी',
  'transitionFailed': 'प्रकरण आगे नहीं बढ़ाया जा सका',
  'hearingRequired': 'सुनवाई तिथि व समय आवश्यक है',
  'riWorkDone': 'आपका कार्य पूर्ण हो गया',
  'riWorkDoneNote': 'तहसीलदार को अग्रेषित। आपकी ओर से और कोई कार्रवाई नहीं।',

  // Case create
  'newCase': 'नया प्रकरण',
  'hideForm': 'रद्द करें',
  'createCase': 'प्रकरण दर्ज करें',
  'creatingCase': 'दर्ज हो रहा है…',
  'createCaseFailed': 'प्रकरण दर्ज नहीं हो सका',
  'applicantName': 'आवेदक का नाम',
  'contactOptional': 'संपर्क',
  'optional': 'वैकल्पिक',
  'khasrasHint': 'कॉमा या नई पंक्ति से अलग करें। प्रति खसरा ₹50 शुल्क।',
  'khasrasPlaceholder': '12, 13, 14',
  'feeFor': '{n} खसरा हेतु शुल्क',
  'mapFile': 'नक्शा फ़ाइल',
  'challanFile': 'चालान फ़ाइल',

  // Roles
  'admin': 'एडमिन',
  'tehsildar': 'तहसीलदार',
  'ri': 'राजस्व निरीक्षक',
  'allCases': 'सभी प्रकरण',
  'auditLog': 'ऑडिट लॉग',
  'caseMetrics': 'प्रकरण मेट्रिक्स',

  // Admin — staff
  'staff': 'कर्मचारी',
  'importStaff': 'कर्मचारी आयात',
  'importStaffHint': 'CSV या XLSX, कॉलम: name, email, tehsil। प्रत्येक भूमिका अलग अपलोड करें।',
  'uploadTehsildars': 'तहसीलदार अपलोड',
  'uploadRis': 'आरआई अपलोड',
  'downloadTemplate': 'टेम्पलेट डाउनलोड',
  'downloadPasswords': 'पासवर्ड डाउनलोड',
  'importing': 'आयात हो रहा है…',
  'importFailed': 'आयात विफल',
  'lastImport': 'पिछला आयात',
  'importSummary': '{role}: {created} जोड़े गए, {skipped} छोड़े गए',
  'line': 'पंक्ति',
  'status': 'स्थिति',
  'reason': 'कारण',
  'name': 'नाम',
  'role': 'भूमिका',
  'actions': 'कार्रवाई',
  'showPassword': 'पासवर्ड देखें',
  'resetPassword': 'रीसेट',
  'tempPassword': 'अस्थायी पासवर्ड',
  'passwordLoadFailed': 'पासवर्ड लोड नहीं हो सका',
  'resetFailed': 'रीसेट विफल',
  'downloadFailed': 'डाउनलोड विफल',
  'noStaff': 'अभी कोई कर्मचारी आयात नहीं।',
  'noStaffHint': 'खाते बनाने हेतु तहसीलदार या आरआई शीट अपलोड करें।',
  'searchStaff': 'नाम या ईमेल खोजें…',
  'searchCases': 'प्रकरण संख्या, आवेदक, ग्राम खोजें…',
  'searchAudit': 'प्रकरण, चरण, नोट, कर्ता खोजें…',
  'inviteEmails': 'आमंत्रण ईमेल',
  'inviteOn': 'चालू',
  'inviteOff': 'बंद',
  'inviteNote': 'पासवर्ड डाउनलोड दोनों स्थितियों में उपलब्ध।',

  // Admin — metrics
  'total': 'कुल',
  'openCases': 'खुले',
  'closedEcourt': 'पूर्ण (ई-कोर्ट)',
  'byStage': 'चरण अनुसार',
  'byTehsil': 'तहसील अनुसार',
  'tehsil': 'तहसील',
  'count': 'संख्या',
  'metricsFailed': 'मेट्रिक्स लोड नहीं हो सके',
  'noMetrics': 'अभी कोई प्रकरण डेटा नहीं।',
  'metricClosureRate': 'समापन दर',
  'metricClosureHint': '{total} में से {closed} ई-कोर्ट पर पूर्ण',
  'metricOverdueShare': 'अतिदेय अंश',
  'metricOverdueHint': '{total} में से {overdue} गारंटी से आगे',
  'metricOnTrackRate': 'खुले समय पर',
  'metricOnTrackHint': '{open} खुले प्रकरणों में SLA के भीतर',
  'metricBottleneck': 'पाइपलाइन बाधा',
  'metricBottleneckHint': '{stage} में सबसे अधिक कार्य ({count} प्रकरण)',
  'metricRiskTehsil': 'सर्वाधिक SLA जोखिम',
  'metricRiskTehsilHint': '{tehsil} — {rate}% अतिदेय ({overdue} प्रकरण)',
  'metricStageChartHint': 'सीमांकन पाइपलाइन में कार्य कहाँ रुका है',
  'metricTehsilLoad': 'तहसील कार्यभार',
  'metricTehsilLoadHint': 'मात्रा के अनुसार शीर्ष तहसील — कुल, अतिदेय, पूर्ण',
  'metricTehsilRadar': 'तहसील स्वास्थ्य प्रोफ़ाइल',
  'metricTehsilRadarHint':
    'समापन, समय पर खुले प्रकरण, और जिले का अंश (शीर्ष 5)',
  'metricCaseloadShare': 'कार्यभार अंश',

  // Case lifecycle explainer (list pages)
  'lifecycleEyebrow': 'प्रक्रिया',
  'lifecycleTitle': 'सीमांकन प्रकरण कैसे आगे बढ़ता है',
  'lifecycleIntro':
    'सर सीमांकन कार्य तहसील में दाखिल होने से ई-कोर्ट तक निश्चित हस्तांतरण में चलता है — 30-दिन की लोक सेवा गारंटी के भीतर।',
  'lifecycleStep1Title': 'दाखिला एवं पंजीकरण',
  'lifecycleStep1Body':
    'तहसीलदार ग्राम, खसरा, चालान (₹50 प्रति खसरा) और वैकल्पिक नक्शा के साथ आवेदन दर्ज करता है। प्रकरण दाखिल पर खुलता है और गारंटी घड़ी शुरू होती है।',
  'lifecycleStep1Meta': 'दिन 0',
  'lifecycleStep2Title': 'ज्ञापन, सूचना एवं सुनवाई',
  'lifecycleStep2Body':
    'तहसीलदार आरआई को ज्ञापन जारी करता है। आरआई सीमा किसानों को सूचना / इश्तहार देता है और सुनवाई की तिथि तय करता है।',
  'lifecycleStep2Meta': '~1 सप्ताह',
  'lifecycleStep3Title': 'आपत्ति एवं सीमांकन',
  'lifecycleStep3Body':
    'आपत्ति अवधि खुलती है, फिर निर्धारित तिथि पर क्षेत्र सीमांकन पूर्ण चिह्नित होता है — सीमा तय करने वाला सर्वेक्षण कार्य।',
  'lifecycleStep3Meta': '~2 सप्ताह',
  'lifecycleStep4Title': 'आदेश एवं ई-कोर्ट',
  'lifecycleStep4Body':
    'तहसीलदार आदेश जारी करता है। चक्र पूर्ण करने हेतु प्रकरण ई-कोर्ट पर अपलोड चिह्नित होता है — पाइपलाइन और एसएलए घड़ी यहीं बंद होती है।',
  'lifecycleStep4Meta': '30 दिनों के भीतर',

  // Admin — audit
  'when': 'समय',
  'case': 'प्रकरण',
  'transition': 'कार्यवाही',
  'actor': 'कर्ता',
  'note': 'टिप्पणी',
  'noAudit': 'अभी कोई कार्यवाही दर्ज नहीं।',

  // Transitions
  'action.memo': 'आरआई को ज्ञापन जारी करें',
  'action.notice': 'सूचना जारी करें (सुनवाई तय करें)',
  'action.objections': 'आपत्ति अवधि शुरू करें',
  'action.demarcation': 'सीमांकन पूर्ण चिह्नित करें',
  'action.order': 'आदेश जारी करें',
  'action.ecourt': 'ई-कोर्ट अपलोड चिह्नित करें',

  // Stages
  'stage.SUBMITTED': 'दाखिल',
  'stage.MEMO_ISSUED': 'ज्ञापन जारी',
  'stage.NOTICE_ISSUED': 'सूचना जारी',
  'stage.HEARING_SCHEDULED': 'सुनवाई निर्धारित',
  'stage.OBJECTIONS_WINDOW': 'आपत्ति अवधि',
  'stage.DEMARCATION_DONE': 'सीमांकन पूर्ण',
  'stage.ORDER_ISSUED': 'आदेश जारी',
  'stage.ECOURT_UPLOADED': 'ई-कोर्ट अपलोड',

  // Stages — short
  'stageShort.SUBMITTED': 'दाखिल',
  'stageShort.MEMO_ISSUED': 'ज्ञापन',
  'stageShort.NOTICE_ISSUED': 'सूचना',
  'stageShort.HEARING_SCHEDULED': 'सुनवाई',
  'stageShort.OBJECTIONS_WINDOW': 'आपत्ति',
  'stageShort.DEMARCATION_DONE': 'सीमांकन',
  'stageShort.ORDER_ISSUED': 'आदेश',
  'stageShort.ECOURT_UPLOADED': 'ई-कोर्ट',
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
  'NOTICE_ISSUED',
  'HEARING_SCHEDULED',
  'OBJECTIONS_WINDOW',
  'DEMARCATION_DONE',
  'ORDER_ISSUED',
  'ECOURT_UPLOADED',
] as const;

export function translate(
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string | number>,
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
