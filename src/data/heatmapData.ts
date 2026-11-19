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
    shortDescEn: 'Residential service zone covering Mirpur 1, 2, 10, and 12.',
    shortDescBn: 'মিরপুর ১, ২, ১০ ও ১২ আবাসিক সার্ভিস জোন।',
    lat: 23.8069,
    lng: 90.3687,
    demandScore: 0,
    activeTechnicians: 0,
    activeRequests: 0,
    avgArrivalMinutes: 0,
    emergencyCallsToday: 0,
    status: 'NORMAL',
    topCategory: 'electrical',
    topCategoryBn: 'ইলেকট্রিক্যাল সার্ভিস',
    surgeMultiplier: 1.0,
    featuredPros: [],
    nearbyTechs: [],
  },
  {
    id: 'zone-uttara',
    nameEn: 'Uttara (Sector 3, 7, 11, 13)',
    nameBn: 'উত্তরা (সেক্টর ৩, ৭, ১১, ১৩)',
    shortDescEn: 'North Dhaka residential and commercial service zone.',
    shortDescBn: 'উত্তরা আবাসিক ও বাণিজ্যিক সার্ভিস জোন।',
    lat: 23.8759,
    lng: 90.3795,
    demandScore: 0,
    activeTechnicians: 0,
    activeRequests: 0,
    avgArrivalMinutes: 0,
    emergencyCallsToday: 0,
    status: 'NORMAL',
    topCategory: 'ac_repair',
    topCategoryBn: 'এসি রিপেয়ার ও সার্ভিসিং',
    surgeMultiplier: 1.0,
    featuredPros: [],
    nearbyTechs: [],
  },
  {
    id: 'zone-dhanmondi',
    nameEn: 'Dhanmondi & Kalabagan',
    nameBn: 'ধানমন্ডি ও কলাবাগান',
    shortDescEn: 'Central Dhaka residential apartment and service zone.',
    shortDescBn: 'ধানমন্ডি ও কলাবাগান আবাসিক সার্ভিস জোন।',
    lat: 23.7461,
    lng: 90.3742,
    demandScore: 0,
    activeTechnicians: 0,
    activeRequests: 0,
    avgArrivalMinutes: 0,
    emergencyCallsToday: 0,
    status: 'NORMAL',
    topCategory: 'plumbing',
    topCategoryBn: 'প্লাম্বিং ও স্যানিটারি',
    surgeMultiplier: 1.0,
    featuredPros: [],
    nearbyTechs: [],
  },
  {
    id: 'zone-gulshan',
    nameEn: 'Gulshan (1 & 2) & Niketan',
    nameBn: 'গুলশান (১ ও ২) ও নিকেতন',
    shortDescEn: 'Corporate and diplomatic zone covering Gulshan 1, 2 & Niketan.',
    shortDescBn: 'গুলশান ১, ২ ও নিকেতন সার্ভিস জোন।',
    lat: 23.7925,
    lng: 90.4078,
    demandScore: 0,
    activeTechnicians: 0,
    activeRequests: 0,
    avgArrivalMinutes: 0,
    emergencyCallsToday: 0,
    status: 'NORMAL',
    topCategory: 'cctv_installation',
    topCategoryBn: 'সিসিটিভি ও স্মার্ট সিকিউরিটি',
    surgeMultiplier: 1.0,
    featuredPros: [],
    nearbyTechs: [],
  },
  {
    id: 'zone-banani',
    nameEn: 'Banani & DOHS',
    nameBn: 'বনানী ও ডিওএইচএস',
    shortDescEn: 'Banani commercial offices and DOHS residential service zone.',
    shortDescBn: 'বনানী বাণিজ্যিক এলাকা ও ডিওএইচএস সার্ভিস জোন।',
    lat: 23.7937,
    lng: 90.4043,
    demandScore: 0,
    activeTechnicians: 0,
    activeRequests: 0,
    avgArrivalMinutes: 0,
    emergencyCallsToday: 0,
    status: 'NORMAL',
    topCategory: 'electrical',
    topCategoryBn: 'ইলেকট্রিক্যাল সার্ভিস',
    surgeMultiplier: 1.0,
    featuredPros: [],
    nearbyTechs: [],
  },
  {
    id: 'zone-mohammadpur',
    nameEn: 'Mohammadpur & Adabor',
    nameBn: 'মোহাম্মদপুর ও আদাবর',
    shortDescEn: 'Mohammadpur and Adabor residential service coverage zone.',
    shortDescBn: 'মোহাম্মদপুর ও আদাবর সার্ভিস কভারেজ জোন।',
    lat: 23.7658,
    lng: 90.3584,
    demandScore: 0,
    activeTechnicians: 0,
    activeRequests: 0,
    avgArrivalMinutes: 0,
    emergencyCallsToday: 0,
    status: 'NORMAL',
    topCategory: 'carpentry',
    topCategoryBn: 'কাঠ মিস্ত্রি ও ফার্নিচার',
    surgeMultiplier: 1.0,
    featuredPros: [],
    nearbyTechs: [],
  },
  {
    id: 'zone-bashundhara',
    nameEn: 'Bashundhara R/A & Baridhara',
    nameBn: 'বসুন্ধরা আবাসিক ও বারিধারা',
    shortDescEn: 'Bashundhara Residential Area & Baridhara service zone.',
    shortDescBn: 'বসুন্ধরা আবাসিক ও বারিধারা সার্ভিস জোন।',
    lat: 23.8151,
    lng: 90.4255,
    demandScore: 0,
    activeTechnicians: 0,
    activeRequests: 0,
    avgArrivalMinutes: 0,
    emergencyCallsToday: 0,
    status: 'NORMAL',
    topCategory: 'washing_machine',
    topCategoryBn: 'ওয়াশিং মেশিন ও ফ্রিজ',
    surgeMultiplier: 1.0,
    featuredPros: [],
    nearbyTechs: [],
  },
  {
    id: 'zone-badda',
    nameEn: 'Badda & Aftabnagar',
    nameBn: 'বাড্ডা ও আফতাবনগর',
    shortDescEn: 'Badda and Aftabnagar residential service coverage zone.',
    shortDescBn: 'বাড্ডা ও আফতাবনগর সার্ভিস জোন।',
    lat: 23.7805,
    lng: 90.4267,
    demandScore: 0,
    activeTechnicians: 0,
    activeRequests: 0,
    avgArrivalMinutes: 0,
    emergencyCallsToday: 0,
    status: 'NORMAL',
    topCategory: 'electrical',
    topCategoryBn: 'ইলেকট্রিক্যাল সার্ভিস',
    surgeMultiplier: 1.0,
    featuredPros: [],
    nearbyTechs: [],
  },
  {
    id: 'zone-motijheel',
    nameEn: 'Motijheel & Paltan',
    nameBn: 'মতিঝিল ও পল্টন',
    shortDescEn: 'Motijheel and Paltan commercial service zone.',
    shortDescBn: 'মতিঝিল ও পল্টন বাণিজ্যিক সার্ভিস জোন।',
    lat: 23.733,
    lng: 90.4172,
    demandScore: 0,
    activeTechnicians: 0,
    activeRequests: 0,
    avgArrivalMinutes: 0,
    emergencyCallsToday: 0,
    status: 'NORMAL',
    topCategory: 'generator_service',
    topCategoryBn: 'আইপিএস ও জেনারেটর',
    surgeMultiplier: 1.0,
    featuredPros: [],
    nearbyTechs: [],
  },
  {
    id: 'zone-farmgate',
    nameEn: 'Farmgate & Tejgaon',
    nameBn: 'ফার্মগেট ও তেজগাঁও',
    shortDescEn: 'Central Farmgate & Tejgaon service hub.',
    shortDescBn: 'ফার্মগেট ও তেজগাঁও কেন্দ্রীয় সার্ভিস জোন।',
    lat: 23.757,
    lng: 90.3888,
    demandScore: 0,
    activeTechnicians: 0,
    activeRequests: 0,
    avgArrivalMinutes: 0,
    emergencyCallsToday: 0,
    status: 'NORMAL',
    topCategory: 'locksmith',
    topCategoryBn: 'তালা-চাবি ও লক স্মিথ',
    surgeMultiplier: 1.0,
    featuredPros: [],
    nearbyTechs: [],
  },
];

export const INITIAL_LIVE_ACTIVITIES: LiveActivityItem[] = [];
