import { Language, EnergySystem, FaqItem } from '../types';

export interface TranslationStrings {
  // Navigation & Header
  appTitle: string;
  appSubtitle: string;
  notifications: string;
  menu: string;
  language: string;
  langEn: string;
  langBn: string;

  // Banner
  bannerBadge: string;
  bannerLive: string;
  bannerTitlePrefix: string;
  bannerTitleHighlight: string;
  bannerDescription: string;
  bannerActiveLoad: string;
  bannerNeuralEfficiency: string;
  bannerFrequency: string;
  bannerExploreBtn: string;
  bannerVideoBtn: string;

  // Quick Menu
  quickMenuTitle: string;
  quickMenuShortcutsCount: string;
  qmRecharge: string;
  qmRechargeSub: string;
  qmWithdraw: string;
  qmWithdrawSub: string;
  qmCompany: string;
  qmCompanySub: string;
  qmEmployee: string;
  qmEmployeeSub: string;
  qmNew: string;
  qmNewSub: string;
  qmInvite: string;
  qmInviteSub: string;
  qmSupply: string;
  qmSupplySub: string;
  qmSupport: string;
  qmSupportSub: string;

  // Daily Bonus
  dailyBonusTitle: string;
  dailyBonusDesc: string;
  dailyBonusClaimed: string;
  dailyBonusClaim: string;

  // Energy Status Cards
  statusSectionTitle: string;
  statusSectionSubtitle: string;
  statGeneratedTitle: string;
  statGeneratedSubtitle: string;
  statSystemTitle: string;
  statSystemSubtitle: string;
  statCapacityTitle: string;
  statCapacitySubtitle: string;
  statOutputTitle: string;
  statOutputSubtitle: string;

  // Video Section
  videoTitle: string;
  videoSubtitle: string;
  videoDuration: string;
  videoHudLabel: string;
  videoDescription: string;
  videoFeature1: string;
  videoFeature2: string;
  videoFeature3: string;
  videoFeature4: string;
  videoWatchBtn: string;
  videoPlayPrompt: string;

  // Energy Systems
  systemsTitle: string;
  systemsSubtitle: string;
  filterAll: string;
  filterSolar: string;
  filterStorage: string;
  filterGas: string;
  filterWind: string;
  viewDetails: string;
  capacityLabel: string;
  annualOutputLabel: string;
  efficiencyLabel: string;
  frequencyLabel: string;
  locationLabel: string;
  highlightsLabel: string;
  closeBtn: string;

  // AI Technology
  aiTechTitle: string;
  aiTechSubtitle: string;
  tech1Title: string;
  tech1Desc: string;
  tech2Title: string;
  tech2Desc: string;
  tech3Title: string;
  tech3Desc: string;

  // Performance
  perfTitle: string;
  perfSubtitle: string;
  perfHourly: string;
  perfMonthly: string;
  perfChartLegendGen: string;
  perfChartLegendCap: string;
  perfActiveLoad: string;
  perfPeakHour: string;
  perfGridStability: string;

  // How It Works
  howItWorksTitle: string;
  howItWorksSubtitle: string;

  // Company Profile Section
  companyTitle: string;
  companySubtitle: string;
  companyRegLabel: string;
  companyLicenseLabel: string;
  companyHqLabel: string;
  companyEsgLabel: string;
  companyAssetsLabel: string;
  companyCleanShareLabel: string;
  companyViewModalBtn: string;

  // New Projects Section
  newProjectsTitle: string;
  newProjectsSubtitle: string;
  viewAllProjectsBtn: string;

  // Invitation
  inviteTitle: string;
  inviteSubtitle: string;
  referralCodeLabel: string;
  copyBtn: string;
  copiedBtn: string;
  shareTelegram: string;
  shareWhatsApp: string;
  tier1Label: string;
  tier2Label: string;
  tier3Label: string;

  // FAQ
  faqTitle: string;
  faqSubtitle: string;

  // Footer
  footerGridStatus: string;
  footerGridDesc: string;
  footerCertifications: string;
  footerHotline: string;
  footerCopyright: string;

  // Tabs
  tabHome: string;
  tabInvest: string;
  tabTransactions: string;
  tabWallet: string;
  tabProfile: string;

  // Profile Page
  profileTitle: string;
  memberId: string;
  verifiedStatus: string;
  walletBalance: string;
  personalInfo: string;
  securityCenter: string;
  paymentMethods: string;
  notificationsTitle: string;
  myWallet: string;
  appDownload: string;
  customerService: string;
  aboutUs: string;
  logOut: string;
  logoutConfirmTitle: string;
  logoutConfirmDesc: string;
  cancel: string;
  confirm: string;

  // Wallet / Recharge / Withdraw Modals
  rechargeTitle: string;
  rechargeSubtitle: string;
  amountLabel: string;
  trxIdLabel: string;
  trxIdPlaceholder: string;
  depositAddressNotice: string;
  submitRecharge: string;
  withdrawTitle: string;
  withdrawSubtitle: string;
  accountNumberLabel: string;
  securityPinLabel: string;
  submitWithdraw: string;
  feeNotice: string;

  // Employee Modal
  employeeModalTitle: string;
  employeeModalSubtitle: string;
  employeeRole1: string;
  employeeRole2: string;
  employeeRole3: string;
  employeeRole4: string;

  // Supply Modal
  supplyModalTitle: string;
  supplyModalSubtitle: string;
  substation1: string;
  substation2: string;
  substation3: string;
  substation4: string;

  // Support Modal
  supportModalTitle: string;
  supportModalSubtitle: string;
  supportEmergency: string;
  supportTelegram: string;
  supportEmail: string;

  // Toasts
  toastCopied: string;
  toastBonusClaimed: string;
  toastBonusAlready: string;
  toastRechargeSuccess: string;
  toastWithdrawSuccess: string;
  toastInvestSuccess: string;
  toastInsufficientBalance: string;
}

export const translations: Record<Language, TranslationStrings> = {
  en: {
    // Navigation & Header
    appTitle: 'NOVA ENERGY',
    appSubtitle: 'Clean Energy Infrastructure Platform',
    notifications: 'Notifications',
    menu: 'Menu',
    language: 'Language',
    langEn: 'English',
    langBn: 'বাংলা',

    // Banner
    bannerBadge: 'GREEN POWER INFRASTRUCTURE • SUSTAINABLE ENERGY',
    bannerLive: 'LIVE',
    bannerTitlePrefix: 'Invest in Clean Power, ',
    bannerTitleHighlight: 'Earn Daily Profits',
    bannerDescription: 'Partner with utility-scale solar and wind energy projects across the country. Earn guaranteed daily returns settled directly into your wallet.',
    bannerActiveLoad: 'Power Dispatched',
    bannerNeuralEfficiency: 'Plant Efficiency',
    bannerFrequency: 'Grid Frequency',
    bannerExploreBtn: 'View Projects',
    bannerVideoBtn: 'Watch Field Video 🎬',

    // Quick Menu
    quickMenuTitle: 'QUICK SERVICES',
    quickMenuShortcutsCount: '8 Actions',
    qmRecharge: 'Deposit',
    qmRechargeSub: 'Add Funds',
    qmWithdraw: 'Withdraw',
    qmWithdrawSub: 'Cash Out',
    qmCompany: 'Company Profile',
    qmCompanySub: 'Licenses & Docs',
    qmEmployee: 'Leadership',
    qmEmployeeSub: 'Engineers',
    qmNew: 'New Projects',
    qmNewSub: 'Upcoming 2026-27',
    qmInvite: 'Invite',
    qmInviteSub: 'Refer & Earn',
    qmSupply: 'Power Grid',
    qmSupplySub: 'Live Status',
    qmSupport: 'Support',
    qmSupportSub: '24/7 Helpline',

    // Daily Bonus
    dailyBonusTitle: 'Daily Free Bonus',
    dailyBonusDesc: 'Log in every day to claim your free ৳50 daily bonus',
    dailyBonusClaimed: 'Claimed Today',
    dailyBonusClaim: 'Claim +৳50',

    // Energy Status Cards
    statusSectionTitle: 'ENERGY PRODUCTION STATUS',
    statusSectionSubtitle: 'Real-time metrics from our operational power generation facilities',
    statGeneratedTitle: 'Power Generated',
    statGeneratedSubtitle: 'Delivered to National Grid',
    statSystemTitle: 'Battery Storage',
    statSystemSubtitle: 'BESS Energy Reserve',
    statCapacityTitle: 'Total Capacity',
    statCapacitySubtitle: 'Installed Infrastructure',
    statOutputTitle: 'Plant Efficiency',
    statOutputSubtitle: 'Average Facility Yield',

    // Video Section
    videoTitle: 'How Our Clean Energy Facilities Work',
    videoSubtitle: 'Watch our engineers demonstrate how solar arrays, battery storage, and high-voltage transmission deliver reliable power across the nation.',
    videoDuration: 'HD • 3:45 Duration',
    videoHudLabel: 'FIELD CAMERA TELEMETRY • LIVE FEED',
    videoDescription: 'Take an inside look at NovaVest solar parks, advanced inverters, automated tracking arrays, and our 24/7 connection to the national electricity grid.',
    videoFeature1: 'Automated Dual-Axis Solar Tracking',
    videoFeature2: 'Rapid Sub-Second Battery Response',
    videoFeature3: '132kV High-Voltage Substations',
    videoFeature4: 'Continuous Weather & Solar Monitoring',
    videoWatchBtn: 'Watch Full Presentation',
    videoPlayPrompt: 'Click to Play Field Presentation',

    // Energy Systems
    systemsTitle: 'OUR ENERGY PROJECTS',
    systemsSubtitle: 'Utility-scale generation assets synchronized directly to the national power corridor',
    filterAll: 'All Facilities',
    filterSolar: 'Solar Parks',
    filterStorage: 'Battery Storage',
    filterGas: 'Thermal Plants',
    filterWind: 'Wind Turbines',
    viewDetails: 'View Details',
    capacityLabel: 'Nominal Capacity',
    annualOutputLabel: 'Annual Output',
    efficiencyLabel: 'Plant Efficiency',
    frequencyLabel: 'Grid Frequency',
    locationLabel: 'Location & Interconnect',
    highlightsLabel: 'Engineering Highlights',
    closeBtn: 'Close',

    // AI Technology
    aiTechTitle: 'MODERN TECHNOLOGY & AUTOMATION',
    aiTechSubtitle: 'Advanced monitoring systems ensuring continuous equilibrium and maximum clean energy output',
    tech1Title: 'Automated Demand Forecasting',
    tech1Desc: 'Smart forecast algorithms predict regional electricity consumption hours in advance to optimize generation.',
    tech2Title: 'Grid Frequency Stabilization',
    tech2Desc: 'Precision governors ensure transmission frequency stays strictly balanced at 50.00 Hz.',
    tech3Title: 'Predictive Plant Maintenance',
    tech3Desc: 'Continuous thermal and vibration sensors detect wear early, ensuring near-zero unplanned downtime.',

    // Performance
    perfTitle: 'GENERATION PERFORMANCE',
    perfSubtitle: 'Historical and live power output delivered to the national electricity corridor',
    perfHourly: '24h Generation Curve (MW)',
    perfMonthly: 'Monthly Output (GWh)',
    perfChartLegendGen: 'Power Generated',
    perfChartLegendCap: 'Grid Transmission Limit',
    perfActiveLoad: 'Current Grid Demand',
    perfPeakHour: 'Peak Generation Window',
    perfGridStability: 'Grid Stability Index',

    // How It Works
    howItWorksTitle: 'HOW TO INVEST & EARN',
    howItWorksSubtitle: 'Four simple steps to partner in clean energy and earn daily profits',

    // Company Profile Section
    companyTitle: 'COMPANY PROFILE & LICENSES',
    companySubtitle: 'NovaVest Energy Infrastructure Ltd. — Leading clean energy developer',
    companyRegLabel: 'Corporate Registration No.',
    companyLicenseLabel: 'Energy Regulatory License',
    companyHqLabel: 'Corporate Headquarters',
    companyEsgLabel: 'Environmental Rating (ESG)',
    companyAssetsLabel: 'Total Infrastructure Assets',
    companyCleanShareLabel: 'Renewable Power Share',
    companyViewModalBtn: 'View Full Corporate Profile',

    // New Projects Section
    newProjectsTitle: 'UPCOMING ENERGY PROJECTS',
    newProjectsSubtitle: 'Exciting clean energy mega-projects under development for 2026 - 2027',
    viewAllProjectsBtn: 'Explore Project Pipeline',

    // Invitation
    inviteTitle: 'INVITE FRIENDS & EARN',
    inviteSubtitle: 'Share your personal referral link. Earn continuous daily commissions whenever your invited friends invest.',
    referralCodeLabel: 'Your Referral Link',
    copyBtn: 'Copy Link',
    copiedBtn: 'Copied!',
    shareTelegram: 'Telegram',
    shareWhatsApp: 'WhatsApp',
    tier1Label: 'Direct Partner (Tier 1 - 10%)',
    tier2Label: 'Sub-Partner (Tier 2 - 3%)',
    tier3Label: 'Affiliate (Tier 3 - 1%)',

    // FAQ
    faqTitle: 'FREQUENTLY ASKED QUESTIONS (FAQ)',
    faqSubtitle: 'Everything you need to know about investing, daily earnings, and withdrawals',

    // Footer
    footerGridStatus: 'National Transmission Interconnect: Normal (100% Online)',
    footerGridDesc: 'Synchronized with 400kV / 132kV National Load Dispatch Centre (NLDC). Continuous telemetry active.',
    footerCertifications: 'ISO 50001 (Energy Management) • IEC 62443 (Cybersecurity) • BERC Licensed Utility IPP',
    footerHotline: 'Customer Helpline: +880 9612-445566 (24/7 Dispatch Desk)',
    footerCopyright: '© 2026 NovaVest Energy Infrastructure Ltd. All rights reserved.',

    // Tabs
    tabHome: 'Home',
    tabInvest: 'Invest',
    tabTransactions: 'Transactions',
    tabWallet: 'Wallet',
    tabProfile: 'Profile',

    // Profile Page
    profileTitle: 'Member Account',
    memberId: 'Member ID',
    verifiedStatus: 'Verified Account',
    walletBalance: 'Available Balance',
    personalInfo: 'Personal Information',
    securityCenter: 'Security Center',
    paymentMethods: 'Payment Accounts',
    notificationsTitle: 'Notifications',
    myWallet: 'My Wallet',
    appDownload: 'Download App',
    customerService: 'Customer Support',
    aboutUs: 'About NovaVest',
    logOut: 'Log Out',
    logoutConfirmTitle: 'Confirm Sign Out',
    logoutConfirmDesc: 'Are you sure you want to sign out of your NovaVest account?',
    cancel: 'Cancel',
    confirm: 'Confirm',

    // Wallet / Recharge / Withdraw Modals
    rechargeTitle: 'Deposit & Recharge',
    rechargeSubtitle: 'Add funds instantly to your wallet via bKash, Nagad, or Bank Transfer',
    amountLabel: 'Deposit Amount (BDT)',
    trxIdLabel: 'Transaction ID (TrxID)',
    trxIdPlaceholder: 'Enter 10-digit TrxID from your payment SMS',
    depositAddressNotice: 'Please send the exact amount to the official merchant number, then enter your TrxID below.',
    submitRecharge: 'Confirm Deposit',
    withdrawTitle: 'Withdraw Funds',
    withdrawSubtitle: 'Cash out your daily earnings directly to your bKash, Nagad, or Bank account',
    accountNumberLabel: 'Receiving Account Number',
    securityPinLabel: 'Security PIN / 2FA Code',
    submitWithdraw: 'Confirm Withdrawal',
    feeNotice: 'Processing fee: 0% (Free) • Expected arrival: 5 to 30 minutes',

    // Employee Modal
    employeeModalTitle: 'Engineering & Executive Leadership',
    employeeModalSubtitle: 'Meet the certified engineers and energy specialists managing NovaVest facilities',
    employeeRole1: 'Chief Electrical Engineer & Grid Architect',
    employeeRole2: 'Head of Solar Infrastructure & Operations',
    employeeRole3: 'Director of BESS & Energy Storage Systems',
    employeeRole4: 'VP of High-Voltage Substation Engineering',

    // Supply Modal
    supplyModalTitle: 'Power Grid Supply Status',
    supplyModalSubtitle: 'Live transmission corridors, transformer loadings, and substation feeds',
    substation1: 'Dhaka North 132kV Substation',
    substation2: 'Chittagong Industrial 230kV Hub',
    substation3: 'Barind Solar Step-up Terminal 132kV',
    substation4: 'National 400kV Backbone Intertie',

    // Support Modal
    supportModalTitle: '24/7 Customer Support & Helpline',
    supportModalSubtitle: 'Our dedicated team is always ready to assist you with any questions',
    supportEmergency: 'Direct Helpline Hotline',
    supportTelegram: 'Official Telegram Channel',
    supportEmail: 'Official Support Email',

    // Toasts
    toastCopied: 'Copied to clipboard!',
    toastBonusClaimed: 'Congratulations! +৳50 daily bonus credited to your wallet!',
    toastBonusAlready: 'You have already claimed today’s login bonus!',
    toastRechargeSuccess: 'Deposit submitted successfully! Your account will update shortly.',
    toastWithdrawSuccess: 'Withdrawal request submitted! Funds will arrive in 5-30 minutes.',
    toastInvestSuccess: 'Project investment confirmed! Daily profit will credit automatically.',
    toastInsufficientBalance: 'Insufficient wallet balance. Please recharge your account first.',
  },

  bn: {
    // Navigation & Header
    appTitle: 'নোভা এনার্জি',
    appSubtitle: 'নবায়নযোগ্য বিদ্যুৎ বিনিয়োগ প্ল্যাটফর্ম',
    notifications: 'নোটিফিকেশন',
    menu: 'মেনু',
    language: 'ভাষা',
    langEn: 'English',
    langBn: 'বাংলা',

    // Banner
    bannerBadge: 'পরিবেশবান্ধব বিদ্যুৎ প্রকল্প • গ্রিন এনার্জি',
    bannerLive: 'সরাসরি',
    bannerTitlePrefix: 'পরিচ্ছন্ন জ্বালানিতে বিনিয়োগ, ',
    bannerTitleHighlight: 'প্রতিদিন নিশ্চিত লাভ',
    bannerDescription: 'দেশের শীর্ষস্থানীয় সোলার ও বায়ু বিদ্যুৎ প্রকল্পে বিনিয়োগ করুন এবং প্রতিদিন ঘরে বসেই সরাসরি আপনার ওয়ালেটে নিশ্চিত লভ্যাংশ উপভোগ করুন।',
    bannerActiveLoad: 'গ্রিডে সরবরাহ',
    bannerNeuralEfficiency: 'প্ল্যান্ট কার্যক্ষমতা',
    bannerFrequency: 'গ্রিড ফ্রিকোয়েন্সি',
    bannerExploreBtn: 'প্রকল্পগুলো দেখুন',
    bannerVideoBtn: 'ভিডিও দেখুন 🎬',

    // Quick Menu
    quickMenuTitle: 'প্রয়োজনীয় সেবা',
    quickMenuShortcutsCount: '৮টি সেবা',
    qmRecharge: 'টাকা জমা',
    qmRechargeSub: 'রিচার্জ করুন',
    qmWithdraw: 'টাকা উত্তোলন',
    qmWithdrawSub: 'ক্যাশ আউট',
    qmCompany: 'কোম্পানি প্রোফাইল',
    qmCompanySub: 'লাইসেন্স ও পরিচিতি',
    qmEmployee: 'কর্মকর্তাবৃন্দ',
    qmEmployeeSub: 'প্রকৌশলী দল',
    qmNew: 'নতুন প্রজেক্ট',
    qmNewSub: 'আসন্ন ২০২৬-২৭',
    qmInvite: 'আমন্ত্রণ',
    qmInviteSub: 'রেফার করে আয়',
    qmSupply: 'বিদ্যুৎ সরবরাহ',
    qmSupplySub: 'লাইভ তথ্য',
    qmSupport: 'হেল্পলাইন',
    qmSupportSub: '২৪/৭ সহায়তা',

    // Daily Bonus
    dailyBonusTitle: 'প্রতিদিনের ফ্রি হাজিরা বোনাস',
    dailyBonusDesc: 'প্রতি ২৪ ঘণ্টায় একবার অ্যাপে প্রবেশ করে ফ্রি ৳৫০ বোনাস গ্রহণ করুন।',
    dailyBonusClaimed: 'আজকের বোনাস নেওয়া হয়েছে',
    dailyBonusClaim: '৳৫০ গ্রহণ করুন',

    // Energy Status Cards
    statusSectionTitle: 'বিদ্যুৎ উৎপাদন ও সরবরাহ স্ট্যাটাস',
    statusSectionSubtitle: 'আমাদের চলমান বিদ্যুৎ কেন্দ্রসমূহের দৈনিক উৎপাদন ও জাতীয় গ্রিডে সরবরাহের চিত্র',
    statGeneratedTitle: 'উৎপাদিত বিদ্যুৎ',
    statGeneratedSubtitle: 'জাতীয় গ্রিডে সরাসরি সরবরাহ',
    statSystemTitle: 'ব্যাটারি সঞ্চয়াগার',
    statSystemSubtitle: 'জরুরি বিদ্যুৎ ব্যাকআপ',
    statCapacityTitle: 'মোট উৎপাদন ক্ষমতা',
    statCapacitySubtitle: 'স্থাপিত মোট অবকাঠামো',
    statOutputTitle: 'গড় কার্যক্ষমতা',
    statOutputSubtitle: 'প্ল্যান্টের সর্বোচ্চ ফলন',

    // Video Section
    videoTitle: 'আমাদের বিদ্যুৎ প্রকল্প যেভাবে পরিচালিত হয়',
    videoSubtitle: 'সরাসরি ভিডিওচিত্রে দেখুন কীভাবে আমাদের সোলার পার্ক এবং বিদ্যুৎ কেন্দ্রসমূহ দেশের জাতীয় গ্রিডে আলো ছড়াচ্ছে।',
    videoDuration: 'এইচডি • ৩:৪৫ মিনিট',
    videoHudLabel: 'ফিল্ড ক্যামেরা • সরাসরি সম্প্রচার',
    videoDescription: 'নোভাভেস্ট বিদ্যুৎ প্রকল্পসমূহের নির্মাণশৈলী, সর্বাধুনিক সোলার প্যানেল ব্যবস্থাপনা এবং জাতীয় গ্রিডে প্রতিদিন বিদ্যুৎ সরবরাহের বাস্তব দৃশ্য দেখুন।',
    videoFeature1: 'স্বয়ংক্রিয় সূর্য ট্র্যাকিং সোলার প্যানেল',
    videoFeature2: 'আধুনিক লিথিয়াম ব্যাটারি ব্যাকআপ ব্যবস্থা',
    videoFeature3: '১৩২ কেভি উচ্চ-ক্ষমতাসম্পন্ন সাবস্টেশন',
    videoFeature4: 'সার্বক্ষণিক আবহাওয়া ও মেঘ পর্যবেক্ষণ',
    videoWatchBtn: 'সম্পূর্ণ ভিডিওটি দেখুন',
    videoPlayPrompt: 'ভিডিওটি চালু করতে ক্লিক করুন',

    // Energy Systems
    systemsTitle: 'আমাদের বিদ্যুৎ উৎপাদন প্রকল্পসমূহ',
    systemsSubtitle: 'জাতীয় বিদ্যুৎ গ্রিডের সাথে সংযুক্ত নির্ভরযোগ্য পরিচ্ছন্ন বিদ্যুৎ কেন্দ্র',
    filterAll: 'সকল প্রকল্প',
    filterSolar: 'সোলার পার্ক',
    filterStorage: 'ব্যাটারি স্টোরেজ',
    filterGas: 'থার্মাল প্ল্যান্ট',
    filterWind: 'উইন্ড টারবাইন',
    viewDetails: 'বিস্তারিত দেখুন',
    capacityLabel: 'মোট উৎপাদন ক্ষমতা',
    annualOutputLabel: 'বার্ষিক উৎপাদন',
    efficiencyLabel: 'প্ল্যান্টের কার্যক্ষমতা',
    frequencyLabel: 'গ্রিড ফ্রিকোয়েন্সি',
    locationLabel: 'অবস্থান ও সংযোগ লাইন',
    highlightsLabel: 'প্রকৌশলগত বৈশিষ্ট্য',
    closeBtn: 'বন্ধ করুন',

    // AI Technology
    aiTechTitle: 'আধুনিক ও নিরাপদ প্রযুক্তি',
    aiTechSubtitle: 'সর্বাধুনিক প্রযুক্তিতে সার্বক্ষণিক বিদ্যুৎ উৎপাদন ও নিরবচ্ছিন্ন সরবরাহ নিশ্চিতকরণ',
    tech1Title: 'স্বয়ংক্রিয় বিদ্যুৎ চাহিদা পূর্বাভাস',
    tech1Desc: 'এলাকাভিত্তিক বিদ্যুতের চাহিদা আগে থেকেই পর্যবেক্ষণ করে সঠিক মাত্রায় বিদ্যুৎ উৎপাদন ও সরবরাহ সমন্বয় করা হয়।',
    tech2Title: 'স্থিতিশীল ফ্রিকোয়েন্সি নিয়ন্ত্রণ',
    tech2Desc: 'জাতীয় গ্রিডের সাথে সমন্বয় রেখে নিরবচ্ছিন্ন ৫০.০০ হার্টজ বিদ্যুৎ প্রবাহ নিশ্চিত রাখা হয়।',
    tech3Title: 'নিয়মিত প্রতিরোধমূলক রক্ষণাবেক্ষণ',
    tech3Desc: 'আধুনিক সেন্সরের মাধ্যমে যন্ত্রপাতির অবস্থা সার্বক্ষণিক যাচাই করে বিদ্যুৎ বিভ্রাট শূন্যের কোঠায় রাখা হয়।',

    // Performance
    perfTitle: 'বিদ্যুৎ উৎপাদনের পরিসংখ্যান',
    perfSubtitle: 'আমাদের বিদ্যুৎ কেন্দ্রগুলোর ২৪ ঘণ্টার ধারাবাহিক উৎপাদন ও মাসিক অগ্রগতির চিত্র',
    perfHourly: '২৪ ঘণ্টার উৎপাদন গ্রাফ (মেগাওয়াট)',
    perfMonthly: 'মাসিক মোট বিদ্যুৎ (গিগাওয়াট-ঘণ্টা)',
    perfChartLegendGen: 'উৎপাদিত বিদ্যুৎ',
    perfChartLegendCap: 'গ্রিড সঞ্চালন সীমা',
    perfActiveLoad: 'গ্রিডে বর্তমান চাহিদা',
    perfPeakHour: 'সর্বোচ্চ উৎপাদনের সময়',
    perfGridStability: 'গ্রিড স্থিতি সূচক',

    // How It Works
    howItWorksTitle: 'যেভাবে বিনিয়োগ করে আয় শুরু করবেন',
    howItWorksSubtitle: 'সহজ ৪টি ধাপে আমাদের বিদ্যুৎ প্রকল্পের অংশীদার হয়ে প্রতিদিন নিশ্চিত লাভ গ্রহণ করুন',

    // Company Profile Section
    companyTitle: 'কোম্পানি পরিচিতি ও লাইসেন্স',
    companySubtitle: 'নোভাভেস্ট এনার্জি লিমিটেড — বিদ্যুৎ খাতে দেশের অন্যতম পরিবেশবান্ধব বেসরকারি প্রতিষ্ঠান',
    companyRegLabel: 'কোম্পানি রেজিস্ট্রেশন নম্বর',
    companyLicenseLabel: 'বিদ্যুৎ উন্নয়ন বোর্ড লাইসেন্স',
    companyHqLabel: 'প্রধান কার্যালয়',
    companyEsgLabel: 'পরিবেশগত ছাড়পত্র (ESG)',
    companyAssetsLabel: 'মোট পরিকাঠামো সম্পদ',
    companyCleanShareLabel: 'সবুজ শক্তির অংশীদারিত্ব',
    companyViewModalBtn: 'পূর্ণাঙ্গ কোম্পানি প্রোফাইল ও লাইসেন্স',

    // New Projects Section
    newProjectsTitle: 'আসন্ন মেগা বিদ্যুৎ প্রকল্প',
    newProjectsSubtitle: '২০২৬ - ২০২৭ অর্থবছরে বাস্তবায়নাধীন নতুন নতুন মেগা প্রকল্পসমূহ',
    viewAllProjectsBtn: 'সকল নতুন প্রজেক্ট দেখুন',

    // Invitation
    inviteTitle: 'বন্ধুদের আমন্ত্রণ ও রেফারেল আয়',
    inviteSubtitle: 'আপনার পরিচিতজনদের নবায়নযোগ্য বিদ্যুৎ প্রকল্পে আমন্ত্রণ জানান এবং প্রতিদিন তাদের উপার্জনের ওপর নিশ্চিত কমিশন পান।',
    referralCodeLabel: 'আপনার রেফারেল লিংক',
    copyBtn: 'লিংক কপি করুন',
    copiedBtn: 'কপি হয়েছে!',
    shareTelegram: 'টেলিগ্রাম',
    shareWhatsApp: 'হোয়াটসঅ্যাপ',
    tier1Label: 'লেভেল ১ কমিশন (১০%)',
    tier2Label: 'লেভেল ২ কমিশন (৩%)',
    tier3Label: 'লেভেল ৩ কমিশন (১%)',

    // FAQ
    faqTitle: 'সচরাচর জিজ্ঞাসিত প্রশ্নাবলী (FAQ)',
    faqSubtitle: 'বিনিয়োগ, দৈনিক লাভ ও টাকা উত্তোলন সম্পর্কিত সকল প্রয়োজনীয় তথ্য',

    // Footer
    footerGridStatus: 'জাতীয় বিদ্যুৎ সঞ্চালন গ্রিড: স্বাভাবিক (১০০% সচল)',
    footerGridDesc: 'জাতীয় লোড ডেসপ্যাচ সেন্টারের (NLDC) সাথে সরাসরি সংযুক্ত। সার্বক্ষণিক বিদ্যুৎ সঞ্চালন সক্রিয়।',
    footerCertifications: 'ISO 50001 (জ্বালানি ব্যবস্থাপনা) • IEC 62443 (তথ্য নিরাপত্তা) • BERC অনুমোদিত বিদ্যুৎ কেন্দ্র',
    footerHotline: 'কাস্টমার হেল্পলাইন: +৮৮০ ৯৬১২-৪৪৫৫৬৬ (সার্বক্ষণিক খোলা)',
    footerCopyright: '© ২০২৬ নোভাভেস্ট এনার্জি ইনফ্রাস্ট্রাকচার লিমিটেড। সর্বস্বত্ব সংরক্ষিত।',

    // Tabs
    tabHome: 'হোম',
    tabInvest: 'ইনভেস্ট',
    tabTransactions: 'লেনদেন',
    tabWallet: 'ওয়ালেট',
    tabProfile: 'প্রোফাইল',

    // Profile Page
    profileTitle: 'গ্রাহক অ্যাকাউন্ট',
    memberId: 'ইউজার আইডি',
    verifiedStatus: 'যাচাইকৃত অ্যাকাউন্ট',
    walletBalance: 'বর্তমান ব্যালেন্স',
    personalInfo: 'ব্যক্তিগত তথ্য',
    securityCenter: 'নিরাপত্তা সেটিংস',
    paymentMethods: 'টাকা তোলার অ্যাকাউন্ট',
    notificationsTitle: 'নোটিফিকেশন',
    myWallet: 'আমার ওয়ালেট',
    appDownload: 'অ্যাপ ডাউনলোড',
    customerService: 'কাস্টমার সাপোর্ট',
    aboutUs: 'আমাদের সম্পর্কে',
    logOut: 'লগআউট',
    logoutConfirmTitle: 'লগআউট নিশ্চিতকরণ',
    logoutConfirmDesc: 'আপনি কি নিশ্চিতভাবে আপনার অ্যাকাউন্ট থেকে লগআউট করতে চান?',
    cancel: 'বাতিল',
    confirm: 'নিশ্চিত',

    // Wallet / Recharge / Withdraw Modals
    rechargeTitle: 'টাকা জমা ও রিচার্জ',
    rechargeSubtitle: 'বিকাশ, নগদ বা ব্যাংক একাউন্ট থেকে সহজে আপনার ওয়ালেটে টাকা যোগ করুন',
    amountLabel: 'রিচার্জের পরিমাণ (টাকা)',
    trxIdLabel: 'ট্রানজেকশন আইডি (TrxID)',
    trxIdPlaceholder: 'টাকা পাঠানোর পর প্রাপ্ত ১০ সংখ্যার TrxID লিখুন',
    depositAddressNotice: 'আমাদের অফিসিয়াল বিকাশ বা নগদ নম্বরে সঠিক পরিমাণ টাকা পাঠিয়ে নিচের বক্সে TrxID লিখে সাবমিট করুন।',
    submitRecharge: 'রিচার্জ নিশ্চিত করুন',
    withdrawTitle: 'টাকা উত্তোলন (Cash Out)',
    withdrawSubtitle: 'আপনার অর্জিত প্রতিদিনের মুনাফা সরাসরি বিকাশ, নগদ বা ব্যাংক একাউন্টে তুলে নিন',
    accountNumberLabel: 'প্রাপকের অ্যাকাউন্ট নম্বর',
    securityPinLabel: 'নিরাপত্তা পিন বা পাসওয়ার্ড',
    submitWithdraw: 'উত্তোলন নিশ্চিত করুন',
    feeNotice: 'সার্ভিস চার্জ: ০% (সম্পূর্ণ ফ্রি) • আনুমানিক পৌঁছানোর সময়: ৫ থেকে ৩০ মিনিট',

    // Employee Modal
    employeeModalTitle: 'প্রকৌশল ও পরিচালনা পর্ষদ',
    employeeModalSubtitle: 'নোভাভেস্ট বিদ্যুৎ প্রকল্প পরিচালনাকারী অভিজ্ঞ প্রকৌশলী ও বিশেষজ্ঞ দল',
    employeeRole1: 'চিফ ইলেকট্রিক্যাল ইঞ্জিনিয়ার ও গ্রিড প্রধান',
    employeeRole2: 'হেড অফ সোলার ইনফ্রাস্ট্রাকচার ও অপারেশনস',
    employeeRole3: 'পরিচালক, ব্যাটারি এনার্জি স্টোরেজ সিস্টেম',
    employeeRole4: 'ভিপি, হাই-ভোল্টেজ সাবস্টেশন ইঞ্জিনিয়ারিং',

    // Supply Modal
    supplyModalTitle: 'বিদ্যুৎ গ্রিড সরবরাহ স্ট্যাটাস',
    supplyModalSubtitle: 'সরাসরি সঞ্চালন লাইন, ট্রান্সফরমার লোড এবং সাবস্টেশন পর্যবেক্ষণ',
    substation1: 'ঢাকা উত্তর ১৩২কেভি সাবস্টেশন',
    substation2: 'চট্টগ্রাম শিল্পাঞ্চল ২৩০কেভি হাব',
    substation3: 'বরিন্দ সোলার স্টেপ-আপ টার্মিনাল ১৩২কেভি',
    substation4: 'জাতীয় ৪০০কেভি ব্যাকবোন লাইন',

    // Support Modal
    supportModalTitle: '২৪/৭ কাস্টমার সাপোর্ট ও হেল্পলাইন',
    supportModalSubtitle: 'যেকোনো প্রয়োজনে আমাদের কাস্টমার কেয়ার প্রতিনিধিদের সাথে সরাসরি যোগাযোগ করুন',
    supportEmergency: 'জরুরি কাস্টমার হেল্পলাইন',
    supportTelegram: 'অফিসিয়াল টেলিগ্রাম চ্যানেল',
    supportEmail: 'অফিসিয়াল সাপোর্ট ইমেইল',

    // Toasts
    toastCopied: 'ক্লিপবোর্ডে কপি করা হয়েছে!',
    toastBonusClaimed: 'অভিনন্দন! আজকের ফ্রি ৳৫০ বোনাস আপনার ওয়ালেটে যোগ হয়েছে!',
    toastBonusAlready: 'আপনি আজকের হাজিরা বোনাস ইতিমধ্যে গ্রহণ করেছেন!',
    toastRechargeSuccess: 'রিচার্জের আবেদন সফলভাবে জমা হয়েছে! কিছুক্ষণের মধ্যে ব্যালেন্স যুক্ত হবে।',
    toastWithdrawSuccess: 'উত্তোলনের আবেদন জমা হয়েছে! ৫-৩০ মিনিটের মধ্যে টাকা পৌঁছে যাবে।',
    toastInvestSuccess: 'প্রকল্পে বিনিয়োগ সফল হয়েছে! প্রতিদিন স্বয়ংক্রিয়ভাবে লাভ জমা হবে।',
    toastInsufficientBalance: 'আপনার ওয়ালেটে পর্যাপ্ত টাকা নেই। অনুগ্রহ করে প্রথমে রিচার্জ করুন।',
  },
};

// Bilingual systems data
export const getEnergySystems = (lang: Language): EnergySystem[] => {
  if (lang === 'en') {
    return [
      {
        id: 'sys-solar-01',
        name: 'Apex Helios Solar Array & AI Substation',
        category: 'Solar Photovoltaic + AI Inverter',
        image: '/src/assets/images/solar_ai_substation_1788465992131.jpg',
        capacity: '450 MW Peak',
        annualOutput: '820,000 MWh / Year',
        status: 'Operational & Delivering',
        statusColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40',
        efficiency: '98.6%',
        location: 'Barind Renewable Zone, Grid Node 4',
        gridFrequency: '50.02 Hz Synchronized',
        description: 'Bifacial monocrystalline tracking array with dynamic AI solar tilt optimization. Feeds directly into the regional 132kV transmission corridor with sub-second voltage stabilization.',
        highlights: [
          'Automated dual-axis sun telemetry tracking',
          'AI-driven cloud shadow predictive forecasting',
          'Direct 132kV grid interconnect substation',
          'Zero greenhouse direct emissions',
        ],
        minParticipation: '৳5,000',
        expectedAnnualYield: '12.4% - 15.8% (Production-Indexed)',
      },
      {
        id: 'sys-bess-02',
        name: 'Vanguard Industrial BESS Storage Facility',
        category: 'Grid-Scale Lithium-Iron Energy Storage',
        image: '/src/assets/images/bess_storage_facility_1788466008161.jpg',
        capacity: '820 MWh Energy Reserve',
        annualOutput: '310,000 MWh Dispatched',
        status: 'Grid Synchronized',
        statusColor: 'text-cyan-400 border-cyan-500/30 bg-cyan-950/40',
        efficiency: '94.2% Round-Trip',
        location: 'Dhaka North High-Voltage Terminal',
        gridFrequency: '49.98 Hz Balancing',
        description: 'Utility-grade battery energy storage system designed for rapid frequency response, black-start grid capability, and off-peak load shifting during peak industrial demand hours.',
        highlights: [
          'Sub-20 millisecond frequency stabilization response',
          'Liquid-cooled modular LFP cell architecture',
          'Continuous AI thermal and state-of-health monitoring',
          'Essential regional grid reliability backbone',
        ],
        minParticipation: '৳10,000',
        expectedAnnualYield: '13.8% - 17.2% (Frequency Service Indexed)',
      },
      {
        id: 'sys-turbine-03',
        name: 'TurbineGen Combined Hydro-Gas Modern Plant',
        category: 'High-Efficiency Cogeneration & Steam Cycle',
        image: '/src/assets/images/smart_turbine_plant_1788466039952.jpg',
        capacity: '1,200 MW Base Load',
        annualOutput: '4,650,000 MWh / Year',
        status: 'AI Optimization Active',
        statusColor: 'text-blue-400 border-blue-500/30 bg-blue-950/40',
        efficiency: '63.8% Thermal Efficiency',
        location: 'Meghna Industrial Energy Corridor',
        gridFrequency: '50.00 Hz Base',
        description: 'Next-generation combined cycle gas turbine integrated with heat recovery steam generators and AI fuel-air ratio governors for maximum output and minimal carbon footprint.',
        highlights: [
          'Dynamic load following with AI combustion tuning',
          '99.94% operational grid availability factor',
          'Waste heat recovery supercritical steam turbine',
          'Continuous emission monitoring telemetry (CEMS)',
        ],
        minParticipation: '৳15,000',
        expectedAnnualYield: '14.2% - 18.0% (Base-Load Guaranteed)',
      },
      {
        id: 'sys-wind-04',
        name: 'Zephyr Offshore & Coastal Wind Farm',
        category: 'Utility-Grade Aerodynamic Wind Turbines',
        image: '/src/assets/images/energy_hero_facility_1788465969350.jpg',
        capacity: '600 MW Rated',
        annualOutput: '1,420,000 MWh / Year',
        status: 'Phase II Expansion',
        statusColor: 'text-purple-400 border-purple-500/30 bg-purple-950/40',
        efficiency: '49.4% Capacity Factor',
        location: 'Bay of Bengal Coastal Zone Node 8',
        gridFrequency: '50.01 Hz Active',
        description: 'Direct-drive permanent magnet wind turbines equipped with LiDAR-assisted wind gust anticipation and individual blade pitch micro-adjustments guided by reinforcement learning.',
        highlights: [
          'LiDAR atmospheric wind shear advance sensing',
          'Saltwater corrosion-resistant nacelle encapsulation',
          'High-voltage undersea AC export cable transmission',
          'Green hydrogen electrolysis co-generation capability',
        ],
        minParticipation: '৳8,000',
        expectedAnnualYield: '13.1% - 16.5% (Wind Energy Indexed)',
      },
    ];
  }

  // Bengali data
  return [
    {
      id: 'sys-solar-01',
      name: 'অ্যাপেক্স হেলিওস সোলার অ্যারে ও এআই সাবস্টেশন',
      category: 'সোলার ফটোভোলটাইক + এআই ইনভার্টার',
      image: '/src/assets/images/solar_ai_substation_1788465992131.jpg',
      capacity: '৪৫০ মেগাওয়াট পিক',
      annualOutput: '৮২০,০০০ মেগাওয়াট-ঘণ্টা / বছর',
      status: 'Operational & Delivering',
      statusColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40',
      efficiency: '৯৮.৬%',
      location: 'বরিন্দ নবায়নযোগ্য অঞ্চল, গ্রিড নোড ৪',
      gridFrequency: '৫০.০২ হার্টজ সিঙ্ক্রোনাইজড',
      description: 'বাইফেসিয়াল মনোকনক্রিট ট্র্যাকিং অ্যারে ও গতিশীল এআই সোলার টিল্ট অপ্টিমাইজেশন। সাব-সেকেন্ড ভোল্টেজ নিয়ন্ত্রণের মাধ্যমে সরাসরি আঞ্চলিক ১৩২কেভি সঞ্চালন লাইনে বিদ্যুৎ সরবরাহ করে।',
      highlights: [
        'স্বয়ংক্রিয় ডুয়েল-অ্যাক্সিস সূর্য ট্র্যাকিং টেলিমেট্রি',
        'এআই-চালিত মেঘের ছায়া পূর্বাভাস প্রগনোসিস',
        'সরাসরি ১৩২কেভি গ্রিড ইন্টারকানেক্ট সাবস্টেশন',
        'শূন্য সরাসরি গ্রীনহাউস গ্যাস নির্গমন',
      ],
      minParticipation: '৳৫,০০০',
      expectedAnnualYield: '১২.৪% - ১৫.৮% (উৎপাদন-সূচকযুক্ত)',
    },
    {
      id: 'sys-bess-02',
      name: 'ভ্যানগার্ড ইন্ডাস্ট্রিয়াল BESS শক্তি সঞ্চয়াগার',
      category: 'গ্রিড-স্কেল লিথিয়াম-আয়রন শক্তি স্টোরেজ',
      image: '/src/assets/images/bess_storage_facility_1788466008161.jpg',
      capacity: '৮২০ মেগাওয়াট-ঘণ্টা রিজার্ভ',
      annualOutput: '৩১০,০০০ মেগাওয়াট-ঘণ্টা ডিসপ্যাচ',
      status: 'Grid Synchronized',
      statusColor: 'text-cyan-400 border-cyan-500/30 bg-cyan-950/40',
      efficiency: '৯৪.২% রাউন্ড-ট্রিপ',
      location: 'ঢাকা উত্তর হাই-ভোল্টেজ টার্মিনাল',
      gridFrequency: '৪৯.৯৮ হার্টজ ব্যালেন্সিং',
      description: 'ইউটিলিটি-গ্রেড ব্যাটারি এনার্জি স্টোরেজ সিস্টেম যা দ্রুত ফ্রিকোয়েন্সি রেসপন্স, ব্ল্যাক-স্টার্ট ক্ষমতা এবং পিক আওয়ারে লোড শিফটিংয়ের জন্য প্রকৌশলী করা।',
      highlights: [
        '২০ মিলি-সেকেন্ডের কম সময়ে ফ্রিকোয়েন্সি স্থিতিশীলতা',
        'লিকুইড-কুলড মডুলার LFP ব্যাটারি সেল আর্কিটেকচার',
        'এআই নিয়ন্ত্রিত তাপমাত্রা ও ব্যাটারি লাইফ পর্যবেক্ষণ',
        'আঞ্চলিক গ্রিড নির্ভরযোগ্যতার অপরিহার্য ব্যাকবোন',
      ],
      minParticipation: '৳১০,০০০',
      expectedAnnualYield: '১৩.৮% - ১৭.২% (ফ্রিকোয়েন্সি সার্ভিস সূচক)',
    },
    {
      id: 'sys-turbine-03',
      name: 'টারবাইনজেন সমন্বিত গ্যাস-হাইড্রো আধুনিক প্ল্যান্ট',
      category: 'উচ্চ-দক্ষতা কো-জেনারেশন ও স্টিম সাইকেল',
      image: '/src/assets/images/smart_turbine_plant_1788466039952.jpg',
      capacity: '১,২০০ মেগাওয়াট বেস লোড',
      annualOutput: '৪,৬৫০,০০০ মেগাওয়াট-ঘণ্টা / বছর',
      status: 'AI Optimization Active',
      statusColor: 'text-blue-400 border-blue-500/30 bg-blue-950/40',
      efficiency: '৬৩.৮% তাপীয় কার্যক্ষমতা',
      location: 'মেঘনা শিল্প করিডোর বিদ্যুৎ কেন্দ্র',
      gridFrequency: '৫০.০০ হার্টজ বেস',
      description: 'হিট রিকভারি স্টিম জেনারেটর এবং এআই ফুয়েল-এয়ার রেশিও গভর্নর সমন্বিত পরবর্তী প্রজন্মের কম্বাইন্ড সাইকেল গ্যাস টারবাইন।',
      highlights: [
        'এআই দহন টিউনিং সহ ডায়নামিক লোড ব্যালেন্সিং',
        '৯৯.৯৪% অপারেশনাল গ্রিড প্রাপ্যতা ফ্যাক্টর',
        'বর্জ্য তাপ পুনরুদ্ধারের সুপারক্রিটিকাল স্টিম টারবাইন',
        'নিরবচ্ছিন্ন নির্গমন পর্যবেক্ষণ টেলিমেট্রি (CEMS)',
      ],
      minParticipation: '৳১৫,০০০',
      expectedAnnualYield: '১৪.২% - ১৮.০% (বেস-লোড গ্যারান্টিড)',
    },
    {
      id: 'sys-wind-04',
      name: 'জেফির অফশোর ও উপকূলীয় উইন্ড ফার্ম',
      category: 'ইউটিলিটি-গ্রেড অ্যারোডাইনামিক উইন্ড টারবাইন',
      image: '/src/assets/images/energy_hero_facility_1788465969350.jpg',
      capacity: '৬০০ মেগাওয়াট রেটেড',
      annualOutput: '১,৪২০,০০০ মেগাওয়াট-ঘণ্টা / বছর',
      status: 'Phase II Expansion',
      statusColor: 'text-purple-400 border-purple-500/30 bg-purple-950/40',
      efficiency: '৪৯.৪% ক্যাপাসিটি ফ্যাক্টর',
      location: 'বঙ্গোপসাগর উপকূলীয় অঞ্চল নোড ৮',
      gridFrequency: '৫০.০১ হার্টজ সক্রিয়',
      description: 'LiDAR-সহায়ক বাতাসের দমকা অনুমান এবং রিইনফোর্সমেন্ট লার্নিং নির্দেশিত স্বতন্ত্র ব্লেড পিচ নিয়ন্ত্রণ সমন্বিত ডাইরেক্ট-ড্রাইভ টারবাইন।',
      highlights: [
        'LiDAR বায়ুমণ্ডলীয় উইন্ড শিয়ার অ্যাডভান্স সেন্সিং',
        'লবণাক্ত জল জারা-প্রতিরোধী ন্যাসেল এনক্যাপসুলেশন',
        'হাই-ভোল্টেজ আন্ডারসি এসি এক্সপোর্ট ক্যাবল সঞ্চালন',
        'গ্রিন হাইড্রোজেন ইলেক্ট্রোলাইসিস কো-জেনারেশন সুবিধা',
      ],
      minParticipation: '৳৮,০০০',
      expectedAnnualYield: '১৩.১% - ১৬.৫% (বায়ু শক্তি সূচকযুক্ত)',
    },
  ];
};

// Bilingual FAQ Items
export const getFaqItems = (lang: Language): FaqItem[] => {
  if (lang === 'en') {
    return [
      {
        id: 'faq-1',
        question: 'How do I earn daily profits with Nova Energy?',
        answer: 'Simply register your account and select a clean power facility to partner in. Once invested, your daily electricity production dividend is calculated and credited automatically to your wallet balance every 24 hours.',
        category: 'finance',
      },
      {
        id: 'faq-2',
        question: 'How long does a withdrawal take to reach my account?',
        answer: 'Withdrawal requests are processed promptly. Under normal conditions, funds reach your bound bKash or Nagad mobile account within 5 to 30 minutes with zero processing fees.',
        category: 'general',
      },
      {
        id: 'faq-3',
        question: 'How does the daily login bonus and referral program work?',
        answer: 'Every member can claim a free ৳50 bonus daily just by opening the app and tapping "Claim Bonus". Additionally, you earn multi-tier commissions (10% Tier 1, 3% Tier 2, 1% Tier 3) on investments made by friends you invite.',
        category: 'finance',
      },
      {
        id: 'faq-4',
        question: 'Is Nova Energy licensed and my investment secured?',
        answer: 'Yes. Nova Energy operates utility-grade clean power infrastructure compliant with national energy grid guidelines, BERC energy developer licenses, and ISO 50001 energy standards. Power purchase agreements guarantee reliable returns.',
        category: 'risk',
      },
    ];
  }

  return [
    {
      id: 'faq-1',
      question: 'নোভা এনার্জিতে কীভাবে প্রতিদিন লাভ পাওয়া যায়?',
      answer: 'অ্যাপে একাউন্ট খুলে যেকোনো বিদ্যুৎ প্রকল্পে বিনিয়োগ করলেই আপনার দৈনিক লাভ শুরু হবে। বিদ্যুৎ উৎপাদন ও বিক্রির লভ্যাংশ প্রতিদিন নির্দিষ্ট সময়ে স্বয়ংক্রিয়ভাবে আপনার ওয়ালেটে জমা হতে থাকবে।',
      category: 'finance',
    },
    {
      id: 'faq-2',
      question: 'উত্তোলনের টাকা বিকাশ বা নগদে পৌঁছাতে কত সময় লাগে?',
      answer: 'টাকা তোলার আবেদন করার পর সাধারণত ৫ থেকে ৩০ মিনিটের মধ্যেই টাকা আপনার বিকাশ বা নগদ একাউন্টে পৌঁছে যায়। ক্যাশ আউটের জন্য কোনো ফি বা চার্জ কাটা হয় না।',
      category: 'general',
    },
    {
      id: 'faq-3',
      question: 'দৈনিক ফ্রি বোনাস ও রেফারেল ইনকাম কীভাবে পাব?',
      answer: 'প্রতিদিন একবার অ্যাপে প্রবেশ করে ‘৳৫০ গ্রহণ করুন’ বাটনে ট্যাপ করলেই ফ্রি হাজিরা বোনাস পেয়ে যাবেন। এছাড়া আপনার ইনভাইট লিংকের মাধ্যমে বন্ধুদের যুক্ত করলে তাদের বিনিয়োগের ওপর ৩ স্তর পর্যন্ত (১০%, ৩%, ১%) আকর্ষণীয় কমিশন পাবেন।',
      category: 'finance',
    },
    {
      id: 'faq-4',
      question: 'এই প্রকল্পে বিনিয়োগ কতটা নিরাপদ ও নির্ভরযোগ্য?',
      answer: 'আমাদের প্রতিটি প্রকল্প সরকারি বিদ্যুৎ উন্নয়ন নীতিমালা ও পরিবেশ অধিদপ্তরের ছাড়পত্রের অধীনে পরিচালিত। জাতীয় গ্রিডের সাথে দীর্ঘমেয়াদী বিদ্যুৎ সরবরাহ চুক্তির মাধ্যমে প্রকল্পসমূহ পরিচালিত হওয়ায় আপনার বিনিয়োগ এবং দৈনিক আয় সম্পূর্ণ নিশ্চিত ও সুরক্ষিত।',
      category: 'risk',
    },
  ];
};

// Bilingual How It Works Steps
export interface HowItWorksStep {
  step: string;
  title: string;
  desc: string;
  badge: string;
}

export const getHowItWorksSteps = (lang: Language): HowItWorksStep[] => {
  if (lang === 'en') {
    return [
      {
        step: '01',
        title: 'Create Account & Deposit',
        desc: 'Register in seconds and add funds securely to your wallet via bKash, Nagad, or direct bank transfer.',
        badge: 'Step 1: Wallet Setup',
      },
      {
        step: '02',
        title: 'Select Clean Energy Project',
        desc: 'Choose from operational solar parks, wind farms, or battery storage projects that match your investment goals.',
        badge: 'Step 2: Project Selection',
      },
      {
        step: '03',
        title: 'Receive Guaranteed Daily Yield',
        desc: 'Your daily electricity dividend is automatically computed and deposited directly into your available balance every 24 hours.',
        badge: 'Step 3: Daily Settlement',
      },
      {
        step: '04',
        title: 'Cash Out Instantly Anytime',
        desc: 'Withdraw your earnings directly to your personal bKash or Nagad wallet whenever your balance reaches ৳500 or more.',
        badge: 'Step 4: Fast Withdrawal',
      },
    ];
  }

  return [
    {
      step: '০১',
      title: 'একাউন্ট খুলুন ও টাকা জমা দিন',
      desc: 'সহজেই রেজিস্ট্রেশন করে বিকাশ, নগদ বা ব্যাংকের মাধ্যমে নিরাপদে আপনার ওয়ালেটে ব্যালেন্স রিচার্জ করুন।',
      badge: 'ধাপ ১: ওয়ালেট সেটআপ',
    },
    {
      step: '০২',
      title: 'পছন্দের বিদ্যুৎ প্রকল্প বেছে নিন',
      desc: 'চলমান সোলার পার্ক, উইন্ড ফার্ম কিংবা বিদ্যুৎ সঞ্চয়াগার প্রকল্পের তালিকা থেকে আপনার পছন্দের প্যাকেজ নির্বাচন করুন।',
      badge: 'ধাপ ২: প্রকল্প নির্বাচন',
    },
    {
      step: '০৩',
      title: 'প্রতিদিন নিশ্চিত লাভ গ্রহণ করুন',
      desc: 'প্রকল্পের দৈনিক বিদ্যুৎ উৎপাদনের ওপর ভিত্তি করে প্রতিদিন নির্দিষ্ট সময়ে স্বয়ংক্রিয়ভাবে লভ্যাংশ আপনার ওয়ালেটে জমা হবে।',
      badge: 'ধাপ ৩: দৈনিক লাভ জমা',
    },
    {
      step: '০৪',
      title: 'যেকোনো সময় ক্যাশ আউট করুন',
      desc: 'আপনার ওয়ালেটে নূন্যতম ৫০০ টাকা হলেই যেকোনো সময় বিকাশ বা নগদের মাধ্যমে সরাসরি নিজের অ্যাকাউন্টে টাকা তুলে নিন।',
      badge: 'ধাপ ৪: সহজ উত্তোলন',
    },
  ];
};

// Bilingual New Projects Pipeline
export interface NewProjectItem {
  id: string;
  name: string;
  type: string;
  capacity: string;
  expectedDate: string;
  progressPercent: number;
  statusBadge: string;
  location: string;
  investmentGoal: string;
  description: string;
}

export const getNewProjects = (lang: Language): NewProjectItem[] => {
  if (lang === 'en') {
    return [
      {
        id: 'proj-01',
        name: 'Orion Floating Solar Hydro-Hybrid Hub',
        type: 'Floating PV + Reservoir Hydro Storage',
        capacity: '650 MW Capacity',
        expectedDate: 'Q1 2027 Commissioning',
        progressPercent: 68,
        statusBadge: 'Under Construction',
        location: 'Karnafuli Hydrological Reservoir Zone',
        investmentGoal: '৳450M Infrastructure Fund',
        description: 'Water-cooled floating monocrystalline panels minimizing land use while boosting solar cell efficiency by 14% via natural water convection.',
      },
      {
        id: 'proj-02',
        name: 'Boreas Offshore Deep-Sea Wind Array',
        type: 'Floating Offshore Wind Foundation',
        capacity: '900 MW Capacity',
        expectedDate: 'Q3 2027 Commissioning',
        progressPercent: 42,
        statusBadge: 'Seabed Geotechnical Phase',
        location: 'Bay of Bengal Deep Water Corridor',
        investmentGoal: '৳720M Infrastructure Fund',
        description: 'Tension-leg floating platform turbines harnessing consistent offshore maritime trade winds for uninterrupted clean baseload dispatch.',
      },
      {
        id: 'proj-03',
        name: 'Titan Solid-State BESS Megapack Facility',
        type: 'Next-Gen Solid-State Battery Storage',
        capacity: '1,500 MWh Energy Reserve',
        expectedDate: 'Q4 2026 Commissioning',
        progressPercent: 85,
        statusBadge: 'Grid Interconnect Testing',
        location: 'Dhaka Special Industrial Energy Zone',
        investmentGoal: '৳380M Infrastructure Fund',
        description: 'Non-flammable solid ceramic electrolyte energy storage delivering 4x life cycles and instantaneous black-start microgrid recovery.',
      },
    ];
  }

  return [
    {
      id: 'proj-01',
      name: 'ওরিয়ন ফ্লোটিং সোলার হাইড্রো-হাইব্রিড হাব',
      type: 'ফ্লোটিং সোলার + রিজার্ভয়ার স্টোরেজ',
      capacity: '৬৫০ মেগাওয়াট ক্ষমতা',
      expectedDate: 'প্রথম প্রান্তিক ২০২৭ উদ্বোধন',
      progressPercent: 68,
      statusBadge: 'নির্মাণাধীন',
      location: 'কর্ণফুলী হাইড্রোলজিক্যাল জলাধার অঞ্চল',
      investmentGoal: '৳৪৫০ কোটি পরিকাঠামো ফান্ড',
      description: 'জলাশয়ের উপরিভাগে ভাসমান সোলার প্যানেল যা জমির অপচয় রোধ করে এবং প্রাকৃতিক পানির ঠান্ডায় প্যানেলের বিদ্যুৎ উৎপাদন ১৪% পর্যন্ত বৃদ্ধি করে।',
    },
    {
      id: 'proj-02',
      name: 'বোরিয়াস অফশোর গভীর সমুদ্র উইন্ড অ্যারে',
      type: 'ভাসমান অফশোর উইন্ড প্ল্যাটফর্ম',
      capacity: '৯০০ মেগাওয়াট ক্ষমতা',
      expectedDate: 'তৃতীয় প্রান্তিক ২০২৭ উদ্বোধন',
      progressPercent: 42,
      statusBadge: 'সমুদ্রগর্ভ জিওটেকনিক্যাল পর্যায়',
      location: 'বঙ্গোপসাগর ডিপ-ওয়াটার করিডোর',
      investmentGoal: '৳৭২০ কোটি পরিকাঠামো ফান্ড',
      description: 'টেলিকম ও ডিপ-সি প্রযুক্তিতে ভাসমান টারবাইন যা শক্তিশালী সমুদ্রের বাতাসের শক্তি ব্যবহার করে নিরবচ্ছিন্ন সবুজ বিদ্যুৎ উৎপাদন করবে।',
    },
    {
      id: 'proj-03',
      name: 'টাইটান সলিড-স্টেট BESS মেগাপ্যাক সুবিধা',
      type: 'পরবর্তী প্রজন্মের সলিড-স্টেট ব্যাটারি স্টোরেজ',
      capacity: '১,৫০০ মেগাওয়াট-ঘণ্টা রিজার্ভ',
      expectedDate: 'চতুর্থ প্রান্তিক ২০২৬ উদ্বোধন',
      progressPercent: 85,
      statusBadge: 'গ্রিড ইন্টারকানেক্ট টেস্টিং',
      location: 'ঢাকা বিশেষ শিল্প অঞ্চল',
      investmentGoal: '৳৩৮০ কোটি পরিকাঠামো ফান্ড',
      description: 'সম্পূর্ণ অগ্নিনির্বাপক সিরামিক ইলেক্ট্রোলাইট স্টোরেজ যা ৪ গুণ বেশি দীর্ঘস্থায়ী এবং গ্রিড বিপর্যয়ে তাৎক্ষণিক বিদ্যুৎ পুনরুদ্ধার করতে সক্ষম।',
    },
  ];
};
