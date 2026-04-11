const en = {
  common: {
    appName: "Aucta",
    loading: "Loading...",
    error: "Something went wrong",
    retry: "Retry",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    confirm: "Confirm",
    back: "Back",
    next: "Next",
    done: "Done",
    close: "Close",
    search: "Search",
    noResults: "No results found",
    required: "Required",
  },

  auth: {
    login: "Log In",
    signUp: "Sign Up",
    logout: "Log Out",
    email: "Email",
    password: "Password",
    forgotPassword: "Forgot password?",
    createAccount: "Create account",
    alreadyHaveAccount: "Already have an account?",
    dontHaveAccount: "Don't have an account?",
    orgName: "Organization Name",
    createOrg: "Create Organization",
    joinOrg: "Join Organization",
    inviteCode: "Invite Code",
    scanQR: "Scan QR Code",
    invalidCredentials: "Invalid email or password",
  },

  session: {
    startSession: "Start Session",
    endSession: "End Session",
    connecting: "Connecting...",
    reconnecting: "Reconnecting...",
    active: "Session Active",
    completed: "Session Completed",
    failed: "Session Failed",
    timeout: "Connection timed out",
    micActive: "Microphone active",
    micOff: "Microphone off",
    aiSpeaking: "AI is speaking",
    connectionLost: "Connection lost",
    connectionRestored: "Connection restored",
    tapToStart: "Point camera at equipment and tap to start",
    endConfirmTitle: "End Session?",
    endConfirmMessage:
      "This will end the current AI-assisted session. A summary will be generated.",
    feedbackTitle: "How was this session?",
    feedbackPlaceholder: "Optional notes about this session...",
    feedbackSubmit: "Submit Feedback",
    feedbackSkip: "Skip",
    feedbackThanks: "Thanks for your feedback!",
    findings: "Findings",
    toolCalls: "Tool Calls",
    duration: "Duration",
  },

  aiDisclosure: {
    title: "AI-Assisted Session",
    body: "This session uses artificial intelligence to provide real-time guidance. AI-generated suggestions should always be verified by a qualified technician. The AI does not replace professional judgment or manufacturer guidelines.",
    accept: "I Understand",
    indicator: "AI-Assisted",
  },

  knowledge: {
    title: "Knowledge Base",
    newArticle: "New Article",
    searchArticles: "Search articles...",
    categories: {
      equipment: "Equipment",
      procedure: "Procedure",
      safety: "Safety",
      regulatory: "Regulatory",
      troubleshooting: "Troubleshooting",
    },
    confidence: {
      unverified: "Unverified",
      technician_reviewed: "Technician Reviewed",
      expert_approved: "Expert Approved",
      manufacturer_sourced: "Manufacturer Sourced",
    },
    source: {
      auto: "Auto-captured",
      manual: "Manual Entry",
      session: "From Session",
    },
    usedCount: "Used {{count}} times",
    noArticles: "No articles yet",
    pendingReviews: "Pending Reviews",
    review: {
      approve: "Approve",
      reject: "Reject",
      needsRevision: "Needs Revision",
      notes: "Reviewer notes",
    },
  },

  dashboard: {
    title: "Dashboard",
    overview: "Overview of your organization's HVAC operations.",
    activeSessions: "Active Sessions",
    sessionsThisWeek: "Sessions This Week",
    teamMembers: "Team Members",
    knowledgeArticles: "Knowledge Articles",
    recentSessions: "Recent Sessions",
    kbActivity: "Knowledge Base Activity",
    currentlyInProgress: "Currently in progress",
  },

  team: {
    title: "Team",
    inviteMember: "Invite Member",
    totalMembers: "Total Members",
    active: "Active",
    inactive: "Inactive",
    roles: {
      admin: "Admin",
      manager: "Manager",
      technician: "Technician",
    },
    sessionsThisWeek: "Sessions (Week)",
  },

  settings: {
    title: "Settings",
    organization: "Organization",
    orgName: "Organization Name",
    timezone: "Timezone",
    aiConfig: "AI Configuration",
    defaultLanguage: "Default Language",
    autoDetect: "Auto-detect",
    safetyLevel: "Safety Disclaimer Level",
    notifications: "Notifications",
    sessionSummaries: "Session summaries",
    sessionSummariesDesc: "Email after each session completes",
    expertEscalations: "Expert escalations",
    expertEscalationsDesc: "Immediate alert when AI escalates",
    weeklyReports: "Weekly reports",
    weeklyReportsDesc: "Summary email every Monday",
    usage: "Usage",
    aiMinutes: "AI Session Minutes",
    kbArticles: "Knowledge Base Articles",
  },

  errors: {
    network: "Network error. Please check your connection.",
    unauthorized: "You are not authorized to perform this action.",
    notFound: "The requested resource was not found.",
    serverError: "Server error. Please try again later.",
    micPermission: "Microphone permission is required for AI sessions.",
    cameraPermission: "Camera permission is required for AI sessions.",
    tokenFailed: "Failed to create session token.",
    sessionCreateFailed: "Failed to create session.",
  },

  nav: {
    home: "Home",
    sessions: "Sessions",
    team: "Team",
    knowledge: "Knowledge Base",
    settings: "Settings",
  },
} as const;

/**
 * Recursively widens all string-literal leaves to `string`
 * so translation files can provide different text while
 * still matching the structural shape of the English source.
 */
type DeepStringRecord<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringRecord<T[K]>;
};

export type TranslationKeys = DeepStringRecord<typeof en>;
export default en;
