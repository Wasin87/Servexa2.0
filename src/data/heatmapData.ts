export interface TechnicianLocation {
  id: string;
  name: string;
  tradeBn: string;
  tradeEn: string;
  rating: number;
  lat: number;
  lng: number;
  available: boolean;
  etaMins: number;
  etaMinutes: number;
  phone: string;
}

export interface FeaturedZonePro {
  id: string;
  name: string;
  tradeBn: string;
  tradeEn: string;
  rating: number;
}

export interface HeatmapZone {
  id: string;
  nameEn: string;
  nameBn: string;
  shortDescEn: string;
  shortDescBn: string;
  lat: number;
  lng: number;
  demandScore: number;
  activeTechnicians: number;
  activeRequests: number;
  avgArrivalMinutes: number;
  emergencyCallsToday: number;
  status: 'HIGH_SURGE' | 'NORMAL' | 'MODERATE';
  topCategory: string;
  topCategoryBn: string;
  surgeMultiplier: number;
  featuredPros: FeaturedZonePro[];
  nearbyTechs: TechnicianLocation[];
}

export interface LiveActivityItem {
  id: string;
  zoneId: string;
  zoneNameBn: string;
  zoneNameEn: string;
  categoryBn: string;
  categoryEn: string;
  timestamp: string;
  type: 'EMERGENCY' | 'DISPATCHED' | 'COMPLETED';
  etaMinutes?: number;
}

export const DHAKA_HEATMAP_ZONES: HeatmapZone[] = [
  {
    id: 'zone-mirpur',
    nameEn: 'Mirpur (1, 2, 10, 12)',
    nameBn: 'মিরপুর (১, ২, ১০, ১২)',
    shortDescEn: 'High residential demand for AC jet wash, circuit breakers & pipe leaks.',
    shortDescBn: 'এসি জেট ওয়াশ, সার্কিট ব্রেকার ও পাইপ লিকেজের সর্বাধিক চাহিদা।',
    lat: 23.8069,
    lng: 90.3687,
    demandScore: 94,
    activeTechnicians: 34,
    activeRequests: 28,
    avgArrivalMinutes: 14,
    emergencyCallsToday: 22,
    status: 'HIGH_SURGE',
    topCategory: 'electrical',
    topCategoryBn: 'ইলেকট্রিক্যাল ও শর্ট সার্কিট',
    surgeMultiplier: 1.25,
    featuredPros: [
      { id: 'tech-1', name: 'মোঃ রহিম আহমেদ', tradeBn: 'মাস্টার ইলেকট্রিশিয়ান ও এসি টেক', tradeEn: 'Master Electrician & AC Tech', rating: 4.9 },
    ],
    nearbyTechs: [
      { id: 'tech-1', name: 'মোঃ রহিম আহমেদ', tradeBn: 'ইলেকট্রিশিয়ান', tradeEn: 'Electrician', rating: 4.9, lat: 23.8102, lng: 90.3652, available: true, etaMins: 11, etaMinutes: 11, phone: '01712-345678' },
      { id: 'tech-2', name: 'করিম হোসেন', tradeBn: 'প্লাম্বার', tradeEn: 'Plumber', rating: 4.8, lat: 23.8021, lng: 90.3718, available: true, etaMins: 14, etaMinutes: 14, phone: '01819-456789' },
    ],
  },
  {
    id: 'zone-uttara',
    nameEn: 'Uttara (Sector 3, 7, 11, 13)',
    nameBn: 'উত্তরা (সেক্টর ৩, ৭, ১১, ১৩)',
    shortDescEn: 'Rapid AC servicing, smart lock installation & inverter diagnostics.',
    shortDescBn: 'এসি গ্যাস রিফিল, স্মার্ট লক ও ইনভার্টার সার্ভিসিংয়ের উচ্চ চাপ।',
    lat: 23.8759,
    lng: 90.3795,
    demandScore: 91,
    activeTechnicians: 29,
    activeRequests: 24,
    avgArrivalMinutes: 15,
    emergencyCallsToday: 19,
    status: 'HIGH_SURGE',
    topCategory: 'ac_repair',
    topCategoryBn: 'এসি রিপেয়ার ও গ্যাস চার্জ',
    surgeMultiplier: 1.3,
    featuredPros: [
      { id: 'tech-3', name: 'তানভীর ইসলাম', tradeBn: 'সিনিয়র এসি ও ফ্রিজ ইঞ্জিনিয়ার', tradeEn: 'Senior AC & Fridge Engineer', rating: 4.9 },
    ],
    nearbyTechs: [
      { id: 'tech-3', name: 'তানভীর ইসলাম', tradeBn: 'এসি টেকনিশিয়ান', tradeEn: 'AC Technician', rating: 4.9, lat: 23.8791, lng: 90.3824, available: true, etaMins: 12, etaMinutes: 12, phone: '01911-567890' },
      { id: 'tech-5', name: 'কামরুল হাসান', tradeBn: 'সিসিটিভি ও ইলেকট্রিক', tradeEn: 'CCTV & Electrical', rating: 4.8, lat: 23.8712, lng: 90.3741, available: false, etaMins: 20, etaMinutes: 20, phone: '01755-789012' },
    ],
  },
  {
    id: 'zone-dhanmondi',
    nameEn: 'Dhanmondi & Kalabagan',
    nameBn: 'ধানমন্ডি ও কলাবাগান',
    shortDescEn: 'Steady apartment plumbing, geyser, and washing machine service requests.',
    shortDescBn: 'ফ্ল্যাটের প্লাম্বিং, গিজার ও ওয়াশিং মেশিন সার্ভিসিংয়ের নিয়মিত চাহিদা।',
    lat: 23.7461,
    lng: 90.3742,
    demandScore: 86,
    activeTechnicians: 26,
    activeRequests: 18,
    avgArrivalMinutes: 13,
    emergencyCallsToday: 14,
    status: 'HIGH_SURGE',
    topCategory: 'plumbing',
    topCategoryBn: 'প্লাম্বিং ও পাইপ লিকেজ',
    surgeMultiplier: 1.15,
    featuredPros: [
      { id: 'tech-2', name: 'করিম হোসেন', tradeBn: 'স্যানিটারি ও প্লাম্বিং এক্সপার্ট', tradeEn: 'Plumbing & Sanitary Expert', rating: 4.8 },
    ],
    nearbyTechs: [
      { id: 'tech-2', name: 'করিম হোসেন', tradeBn: 'প্লাম্বার', tradeEn: 'Plumber', rating: 4.8, lat: 23.7495, lng: 90.3768, available: true, etaMins: 10, etaMinutes: 10, phone: '01819-456789' },
      { id: 'tech-6', name: 'জাহিদুল ইসলাম', tradeBn: 'অ্যাপ্লায়েন্স স্পেশালিস্ট', tradeEn: 'Appliance Specialist', rating: 4.9, lat: 23.7420, lng: 90.3712, available: true, etaMins: 16, etaMinutes: 16, phone: '01677-890123' },
    ],
  },
  {
    id: 'zone-gulshan',
    nameEn: 'Gulshan (1 & 2) & Niketan',
    nameBn: 'গুলশান (১ ও ২) ও নিকেতন',
    shortDescEn: 'Corporate CCTV, Wi-Fi mesh, smart locks & central AC maintenance.',
    shortDescBn: 'সিসিটিভি ক্যামেরা, স্মার্ট ডোর লক ও সেন্ট্রাল এসি মেইনটেন্যান্স হাব।',
    lat: 23.7925,
    lng: 90.4078,
    demandScore: 89,
    activeTechnicians: 31,
    activeRequests: 21,
    avgArrivalMinutes: 12,
    emergencyCallsToday: 16,
    status: 'HIGH_SURGE',
    topCategory: 'cctv_installation',
    topCategoryBn: 'সিসিটিভি ও স্মার্ট সিকিউরিটি',
    surgeMultiplier: 1.2,
    featuredPros: [
      { id: 'tech-5', name: 'কামরুল হাসান', tradeBn: 'সিসিটিভি ও নেটওয়ার্ক স্পেশালিস্ট', tradeEn: 'CCTV & Network Specialist', rating: 4.8 },
    ],
    nearbyTechs: [
      { id: 'tech-5', name: 'কামরুল হাসান', tradeBn: 'সিসিটিভি ও নেটওয়ার্ক', tradeEn: 'CCTV & Networking', rating: 4.8, lat: 23.7954, lng: 90.4105, available: true, etaMins: 9, etaMinutes: 9, phone: '01755-789012' },
      { id: 'tech-3', name: 'তানভীর ইসলাম', tradeBn: 'এসি স্পেশালিস্ট', tradeEn: 'AC Specialist', rating: 4.9, lat: 23.7888, lng: 90.4041, available: true, etaMins: 14, etaMinutes: 14, phone: '01911-567890' },
    ],
  },
  {
    id: 'zone-banani',
    nameEn: 'Banani & DOHS',
    nameBn: 'বনানী ও ডিওএইচএস',
    shortDescEn: 'High-priority office electrical, UPS/IPS & appliance diagnostics.',
    shortDescBn: 'অফিস ইলেকট্রিক্যাল, আইপিএস ও অ্যাপ্লায়েন্স ডায়াগনস্টিক্সের প্রধান জোন।',
    lat: 23.7937,
    lng: 90.4043,
    demandScore: 82,
    activeTechnicians: 22,
    activeRequests: 14,
    avgArrivalMinutes: 14,
    emergencyCallsToday: 11,
    status: 'MODERATE',
    topCategory: 'electrical',
    topCategoryBn: 'ইলেকট্রিক্যাল ও আইপিএস',
    surgeMultiplier: 1.1,
    featuredPros: [
      { id: 'tech-1', name: 'মোঃ রহিম আহমেদ', tradeBn: 'মাস্টার ইলেকট্রিশিয়ান', tradeEn: 'Master Electrician', rating: 4.9 },
    ],
    nearbyTechs: [
      { id: 'tech-1', name: 'মোঃ রহিম আহমেদ', tradeBn: 'ইলেকট্রিশিয়ান', tradeEn: 'Electrician', rating: 4.9, lat: 23.7962, lng: 90.4018, available: true, etaMins: 13, etaMinutes: 13, phone: '01712-345678' },
    ],
  },
  {
    id: 'zone-mohammadpur',
    nameEn: 'Mohammadpur & Adabor',
    nameBn: 'মোহাম্মদপুর ও আদাবর',
    shortDescEn: 'Active residential demand for carpentry, painting & water pump repair.',
    shortDescBn: 'বাসাবাড়ির ফার্নিচার মেরামত, দেয়াল রং ও পানির পাম্প সার্ভিসের চাহিদা।',
    lat: 23.7658,
    lng: 90.3584,
    demandScore: 84,
    activeTechnicians: 25,
    activeRequests: 19,
    avgArrivalMinutes: 16,
    emergencyCallsToday: 15,
    status: 'HIGH_SURGE',
    topCategory: 'carpentry',
    topCategoryBn: 'কাঠ মিস্ত্রি ও লক স্মিথ',
    surgeMultiplier: 1.15,
    featuredPros: [
      { id: 'tech-4', name: 'সেলিম রেজা', tradeBn: 'কার্পেন্ট্রি ও ইন্টেরিয়র এক্সপার্ট', tradeEn: 'Carpentry & Interior Pro', rating: 4.7 },
    ],
    nearbyTechs: [
      { id: 'tech-4', name: 'সেলিম রেজা', tradeBn: 'কাঠ মিস্ত্রি', tradeEn: 'Carpenter', rating: 4.7, lat: 23.7681, lng: 90.3609, available: true, etaMins: 12, etaMinutes: 12, phone: '01611-678901' },
      { id: 'tech-2', name: 'করিম হোসেন', tradeBn: 'প্লাম্বার', tradeEn: 'Plumber', rating: 4.8, lat: 23.7625, lng: 90.3552, available: true, etaMins: 15, etaMinutes: 15, phone: '01819-456789' },
    ],
  },
  {
    id: 'zone-bashundhara',
    nameEn: 'Bashundhara R/A & Baridhara',
    nameBn: 'বসুন্ধরা আবাসিক ও বারিধারা',
    shortDescEn: 'Washing machine, fridge cooling & multi-split AC jet servicing.',
    shortDescBn: 'ওয়াশিং মেশিন, ফ্রিজ কুলিং ও মাল্টি-স্প্লিট এসি সার্ভিসের নিয়মিত অর্ডার।',
    lat: 23.8151,
    lng: 90.4255,
    demandScore: 87,
    activeTechnicians: 24,
    activeRequests: 17,
    avgArrivalMinutes: 17,
    emergencyCallsToday: 13,
    status: 'HIGH_SURGE',
    topCategory: 'washing_machine',
    topCategoryBn: 'ওয়াশিং মেশিন ও ফ্রিজ',
    surgeMultiplier: 1.2,
    featuredPros: [
      { id: 'tech-6', name: 'জাহিদুল ইসলাম', tradeBn: 'ওয়াশিং মেশিন ও ফ্রিজ টেকনিশিয়ান', tradeEn: 'Washing Machine & Fridge Tech', rating: 4.9 },
    ],
    nearbyTechs: [
      { id: 'tech-6', name: 'জাহিদুল ইসলাম', tradeBn: 'অ্যাপ্লায়েন্স টেক', tradeEn: 'Appliance Tech', rating: 4.9, lat: 23.8180, lng: 90.4290, available: true, etaMins: 11, etaMinutes: 11, phone: '01677-890123' },
    ],
  },
  {
    id: 'zone-badda',
    nameEn: 'Badda & Aftabnagar',
    nameBn: 'বাড্ডা ও আফতাবনগর',
    shortDescEn: 'Fast-growing student & family apartments needing quick electrical & plumbing fixes.',
    shortDescBn: 'নতুন অ্যাপার্টমেন্টগুলোতে দ্রুত ইলেকট্রিক ও প্লাম্বিং সমস্যার সমাধান।',
    lat: 23.7805,
    lng: 90.4267,
    demandScore: 76,
    activeTechnicians: 19,
    activeRequests: 12,
    avgArrivalMinutes: 18,
    emergencyCallsToday: 9,
    status: 'NORMAL',
    topCategory: 'electrical',
    topCategoryBn: 'ইলেকট্রিক্যাল সার্ভিস',
    surgeMultiplier: 1.0,
    featuredPros: [
      { id: 'tech-5', name: 'কামরুল হাসান', tradeBn: 'ইলেকট্রিশিয়ান ও সিসিটিভি', tradeEn: 'Electrician & CCTV', rating: 4.8 },
    ],
    nearbyTechs: [
      { id: 'tech-5', name: 'কামরুল হাসান', tradeBn: 'ইলেকট্রিক্যাল', tradeEn: 'Electrical', rating: 4.8, lat: 23.7832, lng: 90.4241, available: true, etaMins: 14, etaMinutes: 14, phone: '01755-789012' },
    ],
  },
  {
    id: 'zone-motijheel',
    nameEn: 'Motijheel & Paltan',
    nameBn: 'মতিঝিল ও পল্টন',
    shortDescEn: 'Commercial office HVAC, network cabling & generator maintenance.',
    shortDescBn: 'বাণিজ্যিক অফিসের এসি, নেটওয়ার্ক ক্যাবলিং ও জেনারেটর সার্ভিসিং।',
    lat: 23.733,
    lng: 90.4172,
    demandScore: 78,
    activeTechnicians: 20,
    activeRequests: 13,
    avgArrivalMinutes: 16,
    emergencyCallsToday: 10,
    status: 'NORMAL',
    topCategory: 'generator_service',
    topCategoryBn: 'আইপিএস ও জেনারেটর',
    surgeMultiplier: 1.05,
    featuredPros: [
      { id: 'tech-1', name: 'মোঃ রহিম আহমেদ', tradeBn: 'ইলেকট্রিক্যাল ও পাওয়ার সিস্টেম', tradeEn: 'Electrical & Power Systems', rating: 4.9 },
    ],
    nearbyTechs: [
      { id: 'tech-1', name: 'মোঃ রহিম আহমেদ', tradeBn: 'পাওয়ার টেক', tradeEn: 'Power Tech', rating: 4.9, lat: 23.7358, lng: 90.4195, available: true, etaMins: 15, etaMinutes: 15, phone: '01712-345678' },
    ],
  },
  {
    id: 'zone-farmgate',
    nameEn: 'Farmgate & Tejgaon',
    nameBn: 'ফার্মগেট ও তেজগাঁও',
    shortDescEn: 'Central hub with rapid dispatch for electrical, locksmith & AC repairs.',
    shortDescBn: 'ইলেকট্রিক্যাল, লক স্মিথ ও এসি মেরামতের কেন্দ্রীয় ডিসপ্যাচ জোন।',
    lat: 23.757,
    lng: 90.3888,
    demandScore: 81,
    activeTechnicians: 21,
    activeRequests: 15,
    avgArrivalMinutes: 14,
    emergencyCallsToday: 12,
    status: 'MODERATE',
    topCategory: 'locksmith',
    topCategoryBn: 'তালা-চাবি ও লক স্মিথ',
    surgeMultiplier: 1.1,
    featuredPros: [
      { id: 'tech-4', name: 'সেলিম রেজা', tradeBn: 'ডোর লক ও কার্পেন্ট্রি', tradeEn: 'Locksmith & Carpentry', rating: 4.7 },
    ],
    nearbyTechs: [
      { id: 'tech-4', name: 'সেলিম রেজা', tradeBn: 'লক স্মিথ', tradeEn: 'Locksmith', rating: 4.7, lat: 23.7595, lng: 90.3910, available: true, etaMins: 11, etaMinutes: 11, phone: '01611-678901' },
    ],
  },
];

export const INITIAL_LIVE_ACTIVITIES: LiveActivityItem[] = [
  {
    id: 'act-seed-1',
    zoneId: 'zone-mirpur',
    zoneNameBn: 'মিরপুর',
    zoneNameEn: 'Mirpur',
    categoryBn: 'এসি জেট ওয়াশ সার্ভিস',
    categoryEn: 'AC Jet Wash Service',
    timestamp: '২ মিনিট আগে',
    type: 'DISPATCHED',
    etaMinutes: 11,
  },
  {
    id: 'act-seed-2',
    zoneId: 'zone-uttara',
    zoneNameBn: 'উত্তরা',
    zoneNameEn: 'Uttara',
    categoryBn: 'শর্ট সার্কিট জরুরি সমাধান',
    categoryEn: 'Emergency Short Circuit Fix',
    timestamp: '৫ মিনিট আগে',
    type: 'EMERGENCY',
    etaMinutes: 9,
  },
  {
    id: 'act-seed-3',
    zoneId: 'zone-dhanmondi',
    zoneNameBn: 'ধানমন্ডি',
    zoneNameEn: 'Dhanmondi',
    categoryBn: 'বাথরুম পাইপ লিকেজ ফিক্স',
    categoryEn: 'Bathroom Pipe Leak Fix',
    timestamp: '৮ মিনিট আগে',
    type: 'DISPATCHED',
    etaMinutes: 14,
  },
  {
    id: 'act-seed-4',
    zoneId: 'zone-gulshan',
    zoneNameBn: 'গুলশান',
    zoneNameEn: 'Gulshan',
    categoryBn: 'স্মার্ট ডোর লক ও সিসিটিভি',
    categoryEn: 'Smart Door Lock & CCTV',
    timestamp: '১২ মিনিট আগে',
    type: 'COMPLETED',
  },
];
