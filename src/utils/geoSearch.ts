import { DHAKA_HEATMAP_ZONES } from '../data/heatmapData';
import { BANGLADESH_DISTRICTS } from '../data/bangladeshLocations';
import { isValidLatLng } from './geoUtils';

export interface KnownLocationEntry {
  nameBn: string;
  nameEn: string;
  lat: number;
  lng: number;
  zoom: number;
  keywords: string[];
}

export interface GeoSearchResult {
  lat: number;
  lng: number;
  name: string;
  nameBn?: string;
  nameEn?: string;
  displayName?: string;
  zoom: number;
  source: 'local' | 'zone' | 'district' | 'nominatim';
}

export const EXTENDED_BD_LOCATIONS: KnownLocationEntry[] = [
  // Mirpur & Pallabi & Kafrul belt
  { nameBn: 'মিরপুর', nameEn: 'Mirpur', lat: 23.8069, lng: 90.3687, zoom: 14, keywords: ['mirpur', 'মিরপুর'] },
  { nameBn: 'মিরপুর ১', nameEn: 'Mirpur 1', lat: 23.7956, lng: 90.3537, zoom: 15, keywords: ['mirpur 1', 'mirpur-1', 'মিরপুর ১', 'মিরপুর-১', 'sony cinema', 'সনি সিনেমা'] },
  { nameBn: 'মিরপুর ২', nameEn: 'Mirpur 2', lat: 23.805, lng: 90.362, zoom: 15, keywords: ['mirpur 2', 'mirpur-2', 'মিরপুর ২', 'মিরপুর-২', 'cricket stadium', 'স্টেডিয়াম'] },
  { nameBn: 'মিরপুর ৬', nameEn: 'Mirpur 6', lat: 23.8125, lng: 90.3655, zoom: 15, keywords: ['mirpur 6', 'mirpur-6', 'মিরপুর ৬', 'মিরপুর-৬'] },
  { nameBn: 'মিরপুর ১০', nameEn: 'Mirpur 10', lat: 23.8069, lng: 90.3687, zoom: 15, keywords: ['mirpur 10', 'mirpur-10', 'মিরপুর ১০', 'মিরপুর-১০'] },
  { nameBn: 'মিরপুর ১১', nameEn: 'Mirpur 11', lat: 23.8184, lng: 90.3705, zoom: 15, keywords: ['mirpur 11', 'mirpur-11', 'মিরপুর ১১', 'মিরপুর-১১'] },
  { nameBn: 'মিরপুর ১২', nameEn: 'Mirpur 12', lat: 23.8286, lng: 90.3638, zoom: 15, keywords: ['mirpur 12', 'mirpur-12', 'মিরপুর ১২', 'মিরপুর-১২'] },
  { nameBn: 'মিরপুর ১৪', nameEn: 'Mirpur 14', lat: 23.7995, lng: 90.3885, zoom: 15, keywords: ['mirpur 14', 'mirpur-14', 'মিরপুর ১৪', 'মিরপুর-১৪', 'kochukhet', 'কচুক্ষেত'] },
  { nameBn: 'মিরপুর ডিওএইচএস', nameEn: 'Mirpur DOHS', lat: 23.8355, lng: 90.3712, zoom: 15, keywords: ['mirpur dohs', 'dohs mirpur', 'মিরপুর ডিওএইচএস'] },
  { nameBn: 'পল্লবী', nameEn: 'Pallabi', lat: 23.826, lng: 90.3665, zoom: 15, keywords: ['pallabi', 'পল্লবী', 'rupanagar', 'rupnagar', 'রূপনগর'] },
  { nameBn: 'শেওড়াপাড়া', nameEn: 'Shewrapara', lat: 23.7905, lng: 90.3755, zoom: 15, keywords: ['shewrapara', 'শেওড়াপাড়া', 'শেওড়াপাড়া'] },
  { nameBn: 'কাজীপাড়া', nameEn: 'Kazipara', lat: 23.7975, lng: 90.3735, zoom: 15, keywords: ['kazipara', 'কাজীপাড়া', 'কাজীপাড়া'] },
  { nameBn: 'আগারগাঁও', nameEn: 'Agargaon', lat: 23.7782, lng: 90.3792, zoom: 15, keywords: ['agargaon', 'আগারগাঁও', 'taltola', 'তালতলা', 'শেরেবাংলা নগর', 'sher e bangla nagar'] },
  { nameBn: 'কাফরুল ও ইব্রাহিমপুর', nameEn: 'Kafrul & Ibrahimpur', lat: 23.795, lng: 90.3845, zoom: 15, keywords: ['kafrul', 'কাফরুল', 'ibrahimpur', 'ইব্রাহিমপুর', 'taltola', 'ভাসানটেক', 'bhashantek'] },

  // Uttara & Airport & Tongi belt
  { nameBn: 'উত্তরা', nameEn: 'Uttara', lat: 23.8759, lng: 90.3795, zoom: 14, keywords: ['uttara', 'উত্তরা', 'uttora'] },
  { nameBn: 'উত্তরা আজমপুর', nameEn: 'Uttara Azampur', lat: 23.8682, lng: 90.4005, zoom: 15, keywords: ['azampur', 'আজমপুর', 'house building', 'হাউজ বিল্ডিং', 'rajlokkhi', 'রাজলক্ষ্মী'] },
  { nameBn: 'উত্তরা সেক্টর ১০ ও ১২', nameEn: 'Uttara Sector 10 & 12', lat: 23.8835, lng: 90.3885, zoom: 15, keywords: ['sector 10', 'sector 11', 'sector 12', 'sector 13', 'sector 14', 'সেক্টর ১০', 'সেক্টর ১১', 'সেক্টর ১২', 'সেক্টর ১৩', 'সেক্টর ১৪'] },
  { nameBn: 'দিয়াবাড়ি', nameEn: 'Diabari', lat: 23.8686, lng: 90.3654, zoom: 15, keywords: ['diabari', 'দিয়াবাড়ি', 'দিয়াবাড়ি', 'uttara north'] },
  { nameBn: 'বিমানবন্দর (এয়ারপোর্ট)', nameEn: 'Dhaka Airport', lat: 23.849, lng: 90.4027, zoom: 14, keywords: ['airport', 'এয়ারপোর্ট', 'বিমানবন্দর', 'bimanbandar', 'kawla', 'কাওলা'] },
  { nameBn: 'আব্দুল্লাহপুর', nameEn: 'Abdullahpur', lat: 23.8813, lng: 90.4018, zoom: 15, keywords: ['abdullahpur', 'আব্দুল্লাহপুর'] },
  { nameBn: 'দক্ষিণখান ও উত্তরখান', nameEn: 'Dakshinkhan & Uttarkhan', lat: 23.8565, lng: 90.4225, zoom: 14, keywords: ['dakshinkhan', 'uttarkhan', 'দক্ষিণখান', 'উত্তরখান', 'ashkona', 'আশকোনা'] },

  // Dhanmondi, Mohammadpur, Shyamoli belt
  { nameBn: 'ধানমন্ডি', nameEn: 'Dhanmondi', lat: 23.7461, lng: 90.3742, zoom: 14, keywords: ['dhanmondi', 'ধানমন্ডি', 'dhanmandi', 'dhanmondi 27', 'dhanmondi 32', 'ধানমন্ডি ২৭', 'ধানমন্ডি ৩২', 'ধানমন্ডি ১৫'] },
  { nameBn: 'কলাবাগান', nameEn: 'Kalabagan', lat: 23.7484, lng: 90.3822, zoom: 15, keywords: ['kalabagan', 'কলাবাগান', 'kathalbagan', 'কাঁঠালবাগান'] },
  { nameBn: 'লালমাটিয়া', nameEn: 'Lalmatia', lat: 23.7565, lng: 90.3688, zoom: 15, keywords: ['lalmatia', 'লালমাটিয়া', 'লালমাটিয়া'] },
  { nameBn: 'জিগাতলা', nameEn: 'Zigatola', lat: 23.7393, lng: 90.3707, zoom: 15, keywords: ['zigatola', 'jigatola', 'জিগাতলা'] },
  { nameBn: 'সায়েন্সল্যাব ও এলিফ্যান্ট রোড', nameEn: 'Science Lab & Elephant Road', lat: 23.7389, lng: 90.3834, zoom: 15, keywords: ['science lab', 'সাইন্স ল্যাব', 'সায়েন্স ল্যাব', 'elephant road', 'এলিফ্যান্ট রোড', 'new market', 'নিউ মার্কেট', 'নিউমার্কেট'] },
  { nameBn: 'পান্থপথ', nameEn: 'Panthapath', lat: 23.7524, lng: 90.3863, zoom: 15, keywords: ['panthapath', 'পান্থপথ', 'bashundhara city', 'square hospital'] },
  { nameBn: 'মোহাম্মদপুর', nameEn: 'Mohammadpur', lat: 23.7658, lng: 90.3584, zoom: 14, keywords: ['mohammadpur', 'মোহাম্মদপুর', 'mohamadpur', 'tajmahal road', 'তাজমহল রোড', 'town hall', 'টাউন হল', 'noorjahan road'] },
  { nameBn: 'আদাবর', nameEn: 'Adabor', lat: 23.7712, lng: 90.3592, zoom: 15, keywords: ['adabor', 'আদাবর', 'shekhertek', 'শেখেরটেক', 'mohammadiya housing'] },
  { nameBn: 'বসিলা', nameEn: 'Bosila', lat: 23.7468, lng: 90.3435, zoom: 15, keywords: ['bosila', 'basila', 'বসিলা'] },
  { nameBn: 'শ্যামলী', nameEn: 'Shyamoli', lat: 23.7745, lng: 90.3654, zoom: 15, keywords: ['shyamoli', 'শ্যামলী', 'shyamoli square'] },
  { nameBn: 'কল্যাণপুর ও গাবতলী', nameEn: 'Kallyanpur & Gabtoli', lat: 23.7795, lng: 90.3555, zoom: 14, keywords: ['kallyanpur', 'kalyanpur', 'কল্যাণপুর', 'gabtoli', 'গাবতলী', 'technical', 'টেকনিক্যাল'] },

  // Gulshan, Banani, Baridhara, Bashundhara, Badda
  { nameBn: 'গুলশান', nameEn: 'Gulshan', lat: 23.7925, lng: 90.4078, zoom: 14, keywords: ['gulshan', 'গুলশান', 'gulshan 1', 'gulshan 2', 'গুলশান ১', 'গুলশান ২', 'niketan', 'নিকেতন', 'police plaza'] },
  { nameBn: 'বনানী', nameEn: 'Banani', lat: 23.7937, lng: 90.4043, zoom: 14, keywords: ['banani', 'বনানী', 'banani dohs', 'chairman bari', 'চেয়ারম্যান বাড়ি', 'kemal ataturk'] },
  { nameBn: 'বারিধারা', nameEn: 'Baridhara', lat: 23.8035, lng: 90.422, zoom: 15, keywords: ['baridhara', 'বারিধারা', 'baridhara dohs', 'notun bazar', 'natun bazar', 'নতুন বাজার'] },
  { nameBn: 'বসুন্ধরা আবাসিক', nameEn: 'Bashundhara R/A', lat: 23.8151, lng: 90.4255, zoom: 14, keywords: ['bashundhara', 'বসুন্ধরা', 'bashundhara r/a', 'bashundhara residential', 'বসুন্ধরা আবাসিক', 'jamuna future park', 'যমুনা ফিউচার পার্ক'] },
  { nameBn: 'কুড়িল ও খিলক্ষেত', nameEn: 'Kuril & Khilkhet', lat: 23.824, lng: 90.422, zoom: 14, keywords: ['kuril', 'কুড়িল', 'কুড়িল', 'khilkhet', 'খিলক্ষেত', 'nikunja', 'নিকুঞ্জ'] },
  { nameBn: 'বাড্ডা', nameEn: 'Badda', lat: 23.7805, lng: 90.4267, zoom: 14, keywords: ['badda', 'বাড্ডা', 'middle badda', 'north badda', 'merul badda', 'মধ্য বাড্ডা', 'উত্তর বাড্ডা', 'মেরুল বাড্ডা', 'link road'] },
  { nameBn: 'আফতাবনগর', nameEn: 'Aftabnagar', lat: 23.7652, lng: 90.4342, zoom: 15, keywords: ['aftabnagar', 'আফতাবনগর'] },
  { nameBn: 'রামপুরা ও বনশ্রী', nameEn: 'Rampura & Banasree', lat: 23.761, lng: 90.428, zoom: 14, keywords: ['rampura', 'রামপুরা', 'banasree', 'বনশ্রী', 'hatirjheel', 'হাতিরঝিল'] },

  // Central & East Dhaka
  { nameBn: 'ফার্মগেট', nameEn: 'Farmgate', lat: 23.757, lng: 90.3888, zoom: 15, keywords: ['farmgate', 'ফার্মগেট', 'framgate', 'tejkunipara', 'green road', 'গ্রীন রোড', 'গ্রিন রোড'] },
  { nameBn: 'কারওয়ান বাজার', nameEn: 'Karwan Bazar', lat: 23.7516, lng: 90.3932, zoom: 15, keywords: ['karwan bazar', 'kawran bazar', 'কারওয়ান বাজার', 'কারওয়ান বাজার'] },
  { nameBn: 'তেজগাঁও', nameEn: 'Tejgaon', lat: 23.7639, lng: 90.398, zoom: 14, keywords: ['tejgaon', 'তেজগাঁও', 'nakhalpara', 'নাখালপাড়া', 'nabisco'] },
  { nameBn: 'মহাখালী', nameEn: 'Mohakhali', lat: 23.7776, lng: 90.4054, zoom: 14, keywords: ['mohakhali', 'মহাখালী', 'mohakhali dohs', 'amtoli', 'আমতলী', 'wireless', 'ওয়্যারলেস'] },
  { nameBn: 'ঢাকা ক্যান্টনমেন্ট', nameEn: 'Dhaka Cantonment', lat: 23.8085, lng: 90.3995, zoom: 14, keywords: ['cantonment', 'ক্যান্টনমেন্ট', 'banani dohs', 'matkhola'] },
  { nameBn: 'মগবাজার ও ইস্কাটন', nameEn: 'Moghbazar & Eskaton', lat: 23.7495, lng: 90.405, zoom: 15, keywords: ['moghbazar', 'mogbazar', 'মগবাজার', 'eskaton', 'ইস্কাটন', 'banglamotor', 'বাংলামোটর'] },
  { nameBn: 'মালিবাগ ও মৌচাক', nameEn: 'Malibagh & Mouchak', lat: 23.7495, lng: 90.4142, zoom: 15, keywords: ['malibagh', 'মালিবাগ', 'mouchak', 'মৌচাক', 'siddheswari', 'সিদ্ধেশ্বরী'] },
  { nameBn: 'খিলগাঁও ও বাসাবো', nameEn: 'Khilgaon & Basabo', lat: 23.749, lng: 90.427, zoom: 14, keywords: ['khilgaon', 'খিলগাঁও', 'taltola', 'basabo', 'বাসাবো', 'goran', 'গোড়ান', 'মাদারটেক', 'madartek', 'mugda', 'মুগদা', 'sabujbagh', 'সবুজবাগ'] },
  { nameBn: 'শান্তিনগর ও কাকরাইল', nameEn: 'Shantinagar & Kakrail', lat: 23.739, lng: 90.411, zoom: 15, keywords: ['shantinagar', 'শান্তিনগর', 'kakrail', 'কাকরাইল', 'bailey road', 'বেইলি রোড'] },
  { nameBn: 'পল্টন ও মতিঝিল', nameEn: 'Paltan & Motijheel', lat: 23.733, lng: 90.4172, zoom: 14, keywords: ['motijheel', 'মতিঝিল', 'paltan', 'পল্টন', 'purana paltan', 'নয়াপল্টন', 'nayapaltan', 'dilkusha', 'দিলকুশা', 'fakirapool', 'ফকিরাপুল', 'kamalapur', 'কমলাপুর'] },
  { nameBn: 'শাহবাগ', nameEn: 'Shahbagh', lat: 23.7389, lng: 90.3958, zoom: 15, keywords: ['shahbagh', 'shahbag', 'শাহবাগ', 'tsc', 'dhaka university', 'ঢাকা বিশ্ববিদ্যালয়', 'ঢাকা মেডিকেল', 'dmc', 'ramna', 'রমনা'] },

  // Old Dhaka & South Dhaka
  { nameBn: 'পুরান ঢাকা', nameEn: 'Old Dhaka', lat: 23.715, lng: 90.402, zoom: 14, keywords: ['old dhaka', 'পুরান ঢাকা', 'puran dhaka'] },
  { nameBn: 'ওয়ারী', nameEn: 'Wari', lat: 23.7186, lng: 90.4173, zoom: 15, keywords: ['wari', 'ওয়ারী', 'ওয়ারী', 'tikatuli', 'টিকাটুলী', 'gandaria', 'গেন্ডারিয়া'] },
  { nameBn: 'সদরঘাট ও সূত্রাপুর', nameEn: 'Sadarghat & Sutrapur', lat: 23.7068, lng: 90.409, zoom: 15, keywords: ['sadarghat', 'সদরঘাট', 'sutrapur', 'সূত্রাপুর', 'laxmibazar', 'লক্ষ্মীবাজার', 'bangshal', 'বংশাল', 'patuatuli'] },
  { nameBn: 'লালবাগ ও চকবাজার', nameEn: 'Lalbagh & Chawkbazar', lat: 23.7189, lng: 90.3881, zoom: 15, keywords: ['lalbagh', 'লালবাগ', 'chawkbazar', 'চকবাজার', 'azimpur', 'আজিমপুর', 'islampur', 'ইসলামপুর'] },
  { nameBn: 'হাজারীবাগ ও কামরাঙ্গীরচর', nameEn: 'Hazaribagh & Kamrangirchar', lat: 23.726, lng: 90.366, zoom: 14, keywords: ['hazaribagh', 'হাজারীবাগ', 'kamrangirchar', 'কামরাঙ্গীরচর'] },
  { nameBn: 'যাত্রাবাড়ী ও সায়েদাবাদ', nameEn: 'Jatrabari & Sayedabad', lat: 23.7104, lng: 90.4352, zoom: 14, keywords: ['jatrabari', 'যাত্রাবাড়ী', 'যাত্রাবাড়ি', 'sayedabad', 'সায়েদাবাদ', 'dholairpar', 'ধোলাইপাড়', 'donia', 'দনিয়া', 'shonir akhra', 'শনির আখড়া'] },
  { nameBn: 'ডেমরা ও শ্যামপুর', nameEn: 'Demra & Shyampur', lat: 23.712, lng: 90.468, zoom: 13, keywords: ['demra', 'ডেমরা', 'shyampur', 'শ্যামপুর', 'jurain', 'জুরাইন', 'postogola', 'পোস্তগোলা', 'matuail', 'মাতুয়াইল'] },

  // Greater Dhaka
  { nameBn: 'সাভার ও আশুলিয়া', nameEn: 'Savar & Ashulia', lat: 23.8583, lng: 90.2667, zoom: 13, keywords: ['savar', 'সাভার', 'ashulia', 'আশুলিয়া', 'আশুলিয়া', 'hemayetpur', 'হেমায়েতপুর', 'dhamrai', 'ধামরাই'] },
  { nameBn: 'কেরানীগঞ্জ', nameEn: 'Keraniganj', lat: 23.6796, lng: 90.3471, zoom: 13, keywords: ['keraniganj', 'কেরানীগঞ্জ', 'jinjira', 'জিঞ্জিরা', 'hasnabad'] },
  { nameBn: 'টঙ্গী ও গাজীপুর', nameEn: 'Tongi & Gazipur', lat: 23.8965, lng: 90.4027, zoom: 13, keywords: ['tongi', 'টঙ্গী', 'gazipur', 'গাজীপুর', 'board bazar', 'বোর্ড বাজার', 'joydebpur', 'জয়দেবপুর', 'chourasta', 'গাজীপুর চৌরাস্তা'] },
  { nameBn: 'নারায়ণগঞ্জ', nameEn: 'Narayanganj', lat: 23.6238, lng: 90.5, zoom: 13, keywords: ['narayanganj', 'নারায়ণগঞ্জ', 'নারায়ণগঞ্জ', 'chashara', 'চাষাঢ়া', 'fatullah', 'ফতুল্লা', 'siddhirganj', 'সিদ্ধিরগঞ্জ', 'signboard', 'সাইনবোর্ড'] },
];

function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[-_,./()|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const nominatimCache = new Map<string, GeoSearchResult[]>();

/**
 * Instant exact/near-exact local match for well-known Bangladesh neighborhoods, zones, and districts.
 */
export function findExactLocalLocation(
  rawQuery: string,
  isBangla: boolean
): GeoSearchResult | null {
  const cleanQ = normalizeSearchText(rawQuery);
  if (!cleanQ) return null;

  // 1. Exact match in EXTENDED_BD_LOCATIONS
  for (const loc of EXTENDED_BD_LOCATIONS) {
    const cleanBn = normalizeSearchText(loc.nameBn);
    const cleanEn = normalizeSearchText(loc.nameEn);
    const exactKeyword = loc.keywords.some((k) => normalizeSearchText(k) === cleanQ);
    if (cleanQ === cleanBn || cleanQ === cleanEn || exactKeyword) {
      return {
        lat: loc.lat,
        lng: loc.lng,
        name: isBangla ? loc.nameBn : loc.nameEn,
        nameBn: loc.nameBn,
        nameEn: loc.nameEn,
        zoom: loc.zoom,
        source: 'local',
      };
    }
  }

  // 2. Exact match in DHAKA_HEATMAP_ZONES
  for (const z of DHAKA_HEATMAP_ZONES) {
    const baseEn = normalizeSearchText(z.nameEn.split('(')[0]);
    const baseBn = normalizeSearchText(z.nameBn.split('(')[0]);
    if (
      cleanQ === baseEn ||
      cleanQ === baseBn ||
      cleanQ === normalizeSearchText(z.nameEn) ||
      cleanQ === normalizeSearchText(z.nameBn)
    ) {
      return {
        lat: z.lat,
        lng: z.lng,
        name: isBangla ? z.nameBn.split('(')[0].trim() : z.nameEn.split('(')[0].trim(),
        nameBn: z.nameBn,
        nameEn: z.nameEn,
        zoom: 14,
        source: 'zone',
      };
    }
  }

  // 3. Exact match in all 64 BANGLADESH_DISTRICTS
  for (const dist of BANGLADESH_DISTRICTS) {
    const cleanBn = normalizeSearchText(dist.nameBn);
    const cleanEn = normalizeSearchText(dist.nameEn);
    if (cleanQ === cleanBn || cleanQ === cleanEn || cleanQ === normalizeSearchText(dist.id)) {
      return {
        lat: dist.lat,
        lng: dist.lng,
        name: isBangla ? dist.nameBn : dist.nameEn,
        nameBn: dist.nameBn,
        nameEn: dist.nameEn,
        zoom: dist.id === 'dhaka' ? 12 : 13,
        source: 'district',
      };
    }
  }

  return null;
}

/**
 * Fuzzy fallback match against local BD locations & 64 districts if network geocoder returns nothing.
 */
export function findFuzzyLocalLocation(
  rawQuery: string,
  isBangla: boolean
): GeoSearchResult | null {
  const cleanQ = normalizeSearchText(rawQuery);
  if (!cleanQ || cleanQ.length < 2) return null;

  for (const loc of EXTENDED_BD_LOCATIONS) {
    const matches =
      normalizeSearchText(loc.nameBn).includes(cleanQ) ||
      normalizeSearchText(loc.nameEn).includes(cleanQ) ||
      cleanQ.includes(normalizeSearchText(loc.nameBn)) ||
      cleanQ.includes(normalizeSearchText(loc.nameEn)) ||
      loc.keywords.some((k) => {
        const ck = normalizeSearchText(k);
        return ck.includes(cleanQ) || cleanQ.includes(ck);
      });
    if (matches) {
      return {
        lat: loc.lat,
        lng: loc.lng,
        name: isBangla ? loc.nameBn : loc.nameEn,
        nameBn: loc.nameBn,
        nameEn: loc.nameEn,
        zoom: loc.zoom,
        source: 'local',
      };
    }
  }

  for (const dist of BANGLADESH_DISTRICTS) {
    const distMatch =
      normalizeSearchText(dist.nameBn).includes(cleanQ) ||
      normalizeSearchText(dist.nameEn).includes(cleanQ) ||
      cleanQ.includes(normalizeSearchText(dist.nameBn)) ||
      cleanQ.includes(normalizeSearchText(dist.nameEn));
    if (distMatch) {
      return {
        lat: dist.lat,
        lng: dist.lng,
        name: isBangla ? dist.nameBn : dist.nameEn,
        nameBn: dist.nameBn,
        nameEn: dist.nameEn,
        zoom: 13,
        source: 'district',
      };
    }

    const areaMatch = dist.areas.find(
      (a) =>
        normalizeSearchText(a.nameBn).includes(cleanQ) ||
        normalizeSearchText(a.nameEn).includes(cleanQ) ||
        cleanQ.includes(normalizeSearchText(a.nameBn)) ||
        cleanQ.includes(normalizeSearchText(a.nameEn))
    );
    if (areaMatch) {
      return {
        lat: dist.lat,
        lng: dist.lng,
        name: isBangla
          ? `${areaMatch.nameBn}, ${dist.nameBn}`
          : `${areaMatch.nameEn}, ${dist.nameEn}`,
        zoom: 13,
        source: 'district',
      };
    }
  }

  return null;
}

/**
 * Local autocomplete suggestions for instant dropdown while typing.
 */
export function getLocalLocationSuggestions(
  rawQuery: string,
  isBangla: boolean,
  limit = 6
): GeoSearchResult[] {
  const cleanQ = normalizeSearchText(rawQuery);
  if (!cleanQ) return [];

  const results: GeoSearchResult[] = [];
  const seen = new Set<string>();

  for (const loc of EXTENDED_BD_LOCATIONS) {
    const match =
      normalizeSearchText(loc.nameBn).includes(cleanQ) ||
      normalizeSearchText(loc.nameEn).includes(cleanQ) ||
      loc.keywords.some((k) => normalizeSearchText(k).includes(cleanQ));
    if (match) {
      const key = `${loc.lat.toFixed(3)},${loc.lng.toFixed(3)}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          lat: loc.lat,
          lng: loc.lng,
          name: isBangla ? loc.nameBn : loc.nameEn,
          nameBn: loc.nameBn,
          nameEn: loc.nameEn,
          displayName: isBangla ? `${loc.nameBn}, ঢাকা` : `${loc.nameEn}, Dhaka`,
          zoom: loc.zoom,
          source: 'local',
        });
      }
    }
    if (results.length >= limit) return results;
  }

  for (const dist of BANGLADESH_DISTRICTS) {
    const match =
      normalizeSearchText(dist.nameBn).includes(cleanQ) ||
      normalizeSearchText(dist.nameEn).includes(cleanQ);
    if (match) {
      const key = `${dist.lat.toFixed(3)},${dist.lng.toFixed(3)}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          lat: dist.lat,
          lng: dist.lng,
          name: isBangla ? dist.nameBn : dist.nameEn,
          nameBn: dist.nameBn,
          nameEn: dist.nameEn,
          displayName: isBangla ? `${dist.nameBn} জেলা` : `${dist.nameEn} District`,
          zoom: 13,
          source: 'district',
        });
      }
    }
    if (results.length >= limit) return results;
  }

  return results;
}

function getZoomForOsmPlace(item: { addresstype?: string; type?: string; category?: string }): number {
  const t = (item.addresstype || item.type || '').toLowerCase();
  if (['house', 'building', 'amenity', 'shop', 'office', 'highway', 'road', 'residential'].includes(t)) {
    return 16;
  }
  if (['neighbourhood', 'suburb', 'quarter', 'village', 'hamlet'].includes(t)) {
    return 15;
  }
  if (['town', 'city_district', 'municipality'].includes(t)) {
    return 14;
  }
  if (['city', 'county', 'state_district'].includes(t)) {
    return 13;
  }
  return 14;
}

/**
 * Live OpenStreetMap Nominatim geocoder scoped to Bangladesh, with smart retry & caching.
 */
export async function searchNominatimBangladesh(
  rawQuery: string,
  isBangla: boolean,
  signal?: AbortSignal
): Promise<GeoSearchResult[]> {
  const cleanQ = rawQuery.trim();
  if (!cleanQ) return [];

  const cacheKey = `${isBangla ? 'bn' : 'en'}:${cleanQ.toLowerCase()}`;
  if (nominatimCache.has(cacheKey)) {
    return nominatimCache.get(cacheKey)!;
  }

  const runFetch = async (q: string, useCountryCode: boolean): Promise<GeoSearchResult[]> => {
    const params = new URLSearchParams({
      format: 'jsonv2',
      addressdetails: '1',
      limit: '5',
      'accept-language': isBangla ? 'bn,en' : 'en,bn',
      q,
    });
    if (useCountryCode) {
      params.set('countrycodes', 'bd');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6500);

    if (signal) {
      if (signal.aborted) {
        clearTimeout(timeoutId);
        return [];
      }
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!resp.ok) return [];
      const data = await resp.json();
      if (!Array.isArray(data)) return [];

      const parsed: GeoSearchResult[] = [];
      for (const item of data) {
        const lat = Number(item.lat);
        const lng = Number(item.lon);
        if (!isValidLatLng(lat, lng)) continue;

        const shortDisplay =
          (item.name && String(item.name).trim()) ||
          String(item.display_name || cleanQ)
            .split(',')
            .slice(0, 2)
            .join(', ')
            .trim();

        parsed.push({
          lat,
          lng,
          name: shortDisplay || cleanQ,
          displayName: String(item.display_name || shortDisplay || cleanQ),
          zoom: getZoomForOsmPlace(item),
          source: 'nominatim',
        });
      }
      return parsed;
    } catch {
      return [];
    } finally {
      clearTimeout(timeoutId);
    }
  };

  let results = await runFetch(cleanQ, true);
  if (results.length === 0 && !/bangladesh|বাংলাদেশ/i.test(cleanQ)) {
    results = await runFetch(`${cleanQ}, Bangladesh`, false);
  }

  if (results.length > 0) {
    nominatimCache.set(cacheKey, results);
  }
  return results;
}

/**
 * Master Bangladesh Location Geocoder:
 * 1. Exact local match (0ms instant)
 * 2. Live OpenStreetMap Nominatim (for ANY area, road, upazila, landmark across Bangladesh)
 * 3. Fuzzy local Dhaka/Bangladesh District fallback
 */
export async function geocodeBangladeshLocation(
  rawQuery: string,
  isBangla: boolean,
  signal?: AbortSignal
): Promise<GeoSearchResult | null> {
  const cleanQ = rawQuery.trim();
  if (!cleanQ) return null;

  // 1. Instant exact match (zero network latency)
  const exact = findExactLocalLocation(cleanQ, isBangla);
  if (exact) return exact;

  // 2. Live Nominatim lookup for any arbitrary area/street/landmark/upazila
  const nominatimHits = await searchNominatimBangladesh(cleanQ, isBangla, signal);
  if (nominatimHits.length > 0) {
    return nominatimHits[0];
  }

  // 3. Offline / fuzzy fallback against BD districts & local neighborhoods
  return findFuzzyLocalLocation(cleanQ, isBangla);
}
