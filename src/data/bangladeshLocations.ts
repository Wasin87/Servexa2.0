export interface AreaOption {
  nameEn: string;
  nameBn: string;
}

export interface BangladeshDivision {
  id: string;
  nameEn: string;
  nameBn: string;
}

export interface BangladeshDistrict {
  id: string;
  divisionId: string;
  nameEn: string;
  nameBn: string;
  lat: number;
  lng: number;
  areas: AreaOption[];
}

export const BANGLADESH_DIVISIONS: BangladeshDivision[] = [
  { id: 'dhaka', nameEn: 'Dhaka', nameBn: 'ঢাকা' },
  { id: 'chattogram', nameEn: 'Chattogram', nameBn: 'চট্টগ্রাম' },
  { id: 'rajshahi', nameEn: 'Rajshahi', nameBn: 'রাজশাহী' },
  { id: 'khulna', nameEn: 'Khulna', nameBn: 'খুলনা' },
  { id: 'barishal', nameEn: 'Barishal', nameBn: 'বরিশাল' },
  { id: 'sylhet', nameEn: 'Sylhet', nameBn: 'সিলেট' },
  { id: 'rangpur', nameEn: 'Rangpur', nameBn: 'রংপুর' },
  { id: 'mymensingh', nameEn: 'Mymensingh', nameBn: 'ময়মনসিংহ' },
];

export const BANGLADESH_DISTRICTS: BangladeshDistrict[] = [
  // Dhaka Division (13 Districts)
  {
    id: 'dhaka',
    divisionId: 'dhaka',
    nameEn: 'Dhaka',
    nameBn: 'ঢাকা',
    lat: 23.8103,
    lng: 90.4125,
    areas: [
      { nameEn: 'Mirpur', nameBn: 'মিরপুর' },
      { nameEn: 'Dhanmondi', nameBn: 'ধানমন্ডি' },
      { nameEn: 'Uttara', nameBn: 'উত্তরা' },
      { nameEn: 'Gulshan', nameBn: 'গুলশান' },
      { nameEn: 'Banani', nameBn: 'বনানী' },
      { nameEn: 'Mohammadpur', nameBn: 'মোহাম্মদপুর' },
      { nameEn: 'Bashundhara R/A', nameBn: 'বসুন্ধরা আবাসিক' },
      { nameEn: 'Badda', nameBn: 'বাড্ডা' },
      { nameEn: 'Motijheel', nameBn: 'মতিঝিল' },
      { nameEn: 'Farmgate', nameBn: 'ফার্মগেট' },
      { nameEn: 'Mohakhali', nameBn: 'মহাখালী' },
      { nameEn: 'Rampura', nameBn: 'রামপুরা' },
      { nameEn: 'Khilgaon', nameBn: 'খিলগাঁও' },
      { nameEn: 'Old Dhaka', nameBn: 'পুরান ঢাকা' },
      { nameEn: 'Savar', nameBn: 'সাভার' },
      { nameEn: 'Keraniganj', nameBn: 'কেরানীগঞ্জ' },
    ],
  },
  {
    id: 'gazipur',
    divisionId: 'dhaka',
    nameEn: 'Gazipur',
    nameBn: 'গাজীপুর',
    lat: 24.0023,
    lng: 90.4264,
    areas: [
      { nameEn: 'Gazipur Sadar', nameBn: 'গাজীপুর সদর' },
      { nameEn: 'Tongi', nameBn: 'টঙ্গী' },
      { nameEn: 'Joydebpur', nameBn: 'জয়দেবপুর' },
      { nameEn: 'Sreepur', nameBn: 'শ্রীপুর' },
      { nameEn: 'Kaliakair', nameBn: 'কালিয়াকৈর' },
    ],
  },
  {
    id: 'narayanganj',
    divisionId: 'dhaka',
    nameEn: 'Narayanganj',
    nameBn: 'নারায়ণগঞ্জ',
    lat: 23.6238,
    lng: 90.5000,
    areas: [
      { nameEn: 'Chashara', nameBn: 'চাষাঢ়া' },
      { nameEn: 'Fatullah', nameBn: 'ফতুল্লা' },
      { nameEn: 'Siddhirganj', nameBn: 'সিদ্ধিরগঞ্জ' },
      { nameEn: 'Bandar', nameBn: 'বন্দর' },
      { nameEn: 'Rupganj', nameBn: 'রূপগঞ্জ' },
    ],
  },
  {
    id: 'narsingdi',
    divisionId: 'dhaka',
    nameEn: 'Narsingdi',
    nameBn: 'নরসিংদী',
    lat: 23.9322,
    lng: 90.7154,
    areas: [
      { nameEn: 'Narsingdi Sadar', nameBn: 'নরসিংদী সদর' },
      { nameEn: 'Madhabdi', nameBn: 'মাধবদী' },
      { nameEn: 'Palash', nameBn: 'পলাশ' },
      { nameEn: 'Belabo', nameBn: 'বেলাব' },
    ],
  },
  {
    id: 'manikganj',
    divisionId: 'dhaka',
    nameEn: 'Manikganj',
    nameBn: 'মানিকগঞ্জ',
    lat: 23.8617,
    lng: 90.0003,
    areas: [
      { nameEn: 'Manikganj Sadar', nameBn: 'মানিকগঞ্জ সদর' },
      { nameEn: 'Singair', nameBn: 'সিংগাইর' },
      { nameEn: 'Saturia', nameBn: 'সাটুরিয়া' },
    ],
  },
  {
    id: 'munshiganj',
    divisionId: 'dhaka',
    nameEn: 'Munshiganj',
    nameBn: 'মুন্সীগঞ্জ',
    lat: 23.5422,
    lng: 90.5305,
    areas: [
      { nameEn: 'Munshiganj Sadar', nameBn: 'মুন্সীগঞ্জ সদর' },
      { nameEn: 'Sreenagar', nameBn: 'শ্রীনগর' },
      { nameEn: 'Sirajdikhan', nameBn: 'সিরাজদিখান' },
    ],
  },
  {
    id: 'tangail',
    divisionId: 'dhaka',
    nameEn: 'Tangail',
    nameBn: 'টাঙ্গাইল',
    lat: 24.2513,
    lng: 89.9167,
    areas: [
      { nameEn: 'Tangail Sadar', nameBn: 'টাঙ্গাইল সদর' },
      { nameEn: 'Mirzapur', nameBn: 'মির্জাপুর' },
      { nameEn: 'Kalihati', nameBn: 'কালিহাতী' },
      { nameEn: 'Madhupur', nameBn: 'মধুপুর' },
    ],
  },
  {
    id: 'kishoreganj',
    divisionId: 'dhaka',
    nameEn: 'Kishoreganj',
    nameBn: 'কিশোরগঞ্জ',
    lat: 24.4449,
    lng: 90.7766,
    areas: [
      { nameEn: 'Kishoreganj Sadar', nameBn: 'কিশোরগঞ্জ সদর' },
      { nameEn: 'Bhairab', nameBn: 'ভৈরব' },
      { nameEn: 'Katiadi', nameBn: 'কটিয়াদী' },
    ],
  },
  {
    id: 'faridpur',
    divisionId: 'dhaka',
    nameEn: 'Faridpur',
    nameBn: 'ফরিদপুর',
    lat: 23.6071,
    lng: 89.8429,
    areas: [
      { nameEn: 'Faridpur Sadar', nameBn: 'ফরিদপুর সদর' },
      { nameEn: 'Bhanga', nameBn: 'ভাঙ্গা' },
      { nameEn: 'Boalmari', nameBn: 'বোয়ালমারী' },
    ],
  },
  {
    id: 'gopalganj',
    divisionId: 'dhaka',
    nameEn: 'Gopalganj',
    nameBn: 'গোপালগঞ্জ',
    lat: 23.0051,
    lng: 89.8266,
    areas: [
      { nameEn: 'Gopalganj Sadar', nameBn: 'গোপালগঞ্জ সদর' },
      { nameEn: 'Tungipara', nameBn: 'টুঙ্গিপাড়া' },
      { nameEn: 'Kotalipara', nameBn: 'কোটালীপাড়া' },
    ],
  },
  {
    id: 'madaripur',
    divisionId: 'dhaka',
    nameEn: 'Madaripur',
    nameBn: 'মাদারীপুর',
    lat: 23.1641,
    lng: 90.1897,
    areas: [
      { nameEn: 'Madaripur Sadar', nameBn: 'মাদারীপুর সদর' },
      { nameEn: 'Shibchar', nameBn: 'শিবচর' },
      { nameEn: 'Kalkini', nameBn: 'কালকিনি' },
    ],
  },
  {
    id: 'rajbari',
    divisionId: 'dhaka',
    nameEn: 'Rajbari',
    nameBn: 'রাজবাড়ী',
    lat: 23.7574,
    lng: 89.6445,
    areas: [
      { nameEn: 'Rajbari Sadar', nameBn: 'রাজবাড়ী সদর' },
      { nameEn: 'Pangsha', nameBn: 'পাংশা' },
      { nameEn: 'Goalanda', nameBn: 'গোয়ালন্দ' },
    ],
  },
  {
    id: 'shariatpur',
    divisionId: 'dhaka',
    nameEn: 'Shariatpur',
    nameBn: 'শরীয়তপুর',
    lat: 23.2423,
    lng: 90.4348,
    areas: [
      { nameEn: 'Shariatpur Sadar', nameBn: 'শরীয়তপুর সদর' },
      { nameEn: 'Jajira', nameBn: 'জাজিরা' },
      { nameEn: 'Naria', nameBn: 'নড়িয়া' },
    ],
  },

  // Chattogram Division (11 Districts)
  {
    id: 'chattogram',
    divisionId: 'chattogram',
    nameEn: 'Chattogram',
    nameBn: 'চট্টগ্রাম',
    lat: 22.3569,
    lng: 91.7832,
    areas: [
      { nameEn: 'GEC Circle', nameBn: 'জিইসি মোড়' },
      { nameEn: 'Agrabad', nameBn: 'আগ্রাবাদ' },
      { nameEn: 'Nasirabad', nameBn: 'নাসিরাবাদ' },
      { nameEn: 'Panchlaish', nameBn: 'পাঁচলাইশ' },
      { nameEn: 'Halishahar', nameBn: 'হালিশহর' },
      { nameEn: 'Chawkbazar', nameBn: 'চকবাজার' },
      { nameEn: 'Khulshi', nameBn: 'খুলশী' },
    ],
  },
  {
    id: 'coxs-bazar',
    divisionId: 'chattogram',
    nameEn: "Cox's Bazar",
    nameBn: 'কক্সবাজার',
    lat: 21.4272,
    lng: 92.0058,
    areas: [
      { nameEn: 'Kolatoli', nameBn: 'কলাতলী' },
      { nameEn: 'Sugandha Point', nameBn: 'সুগন্ধা পয়েন্ট' },
      { nameEn: 'Chakaria', nameBn: 'চকরিয়া' },
      { nameEn: 'Teknaf', nameBn: 'টেকনাফ' },
    ],
  },
  {
    id: 'cumilla',
    divisionId: 'chattogram',
    nameEn: 'Cumilla',
    nameBn: 'কুমিল্লা',
    lat: 23.4607,
    lng: 91.1809,
    areas: [
      { nameEn: 'Kandirpar', nameBn: 'কান্দিরপাড়' },
      { nameEn: 'Kotbari', nameBn: 'কোটবাড়ি' },
      { nameEn: 'Daudkandi', nameBn: 'দাউদকান্দি' },
    ],
  },
  {
    id: 'brahmanbaria',
    divisionId: 'chattogram',
    nameEn: 'Brahmanbaria',
    nameBn: 'ব্রাহ্মণবাড়িয়া',
    lat: 23.9571,
    lng: 91.1119,
    areas: [
      { nameEn: 'Brahmanbaria Sadar', nameBn: 'ব্রাহ্মণবাড়িয়া সদর' },
      { nameEn: 'Ashuganj', nameBn: 'আশুগঞ্জ' },
    ],
  },
  {
    id: 'chandpur',
    divisionId: 'chattogram',
    nameEn: 'Chandpur',
    nameBn: 'চাঁদপুর',
    lat: 23.2333,
    lng: 90.6713,
    areas: [
      { nameEn: 'Chandpur Sadar', nameBn: 'চাঁদপুর সদর' },
      { nameEn: 'Hajiganj', nameBn: 'হাজীগঞ্জ' },
    ],
  },
  {
    id: 'feni',
    divisionId: 'chattogram',
    nameEn: 'Feni',
    nameBn: 'ফেনী',
    lat: 23.0159,
    lng: 91.3976,
    areas: [
      { nameEn: 'Feni Sadar', nameBn: 'ফেনী সদর' },
      { nameEn: 'Daganbhuiyan', nameBn: 'দাগনভূঞা' },
    ],
  },
  {
    id: 'lakshmipur',
    divisionId: 'chattogram',
    nameEn: 'Lakshmipur',
    nameBn: 'লক্ষ্মীপুর',
    lat: 22.9425,
    lng: 90.8412,
    areas: [
      { nameEn: 'Lakshmipur Sadar', nameBn: 'লক্ষ্মীপুর সদর' },
      { nameEn: 'Raipur', nameBn: 'রায়পুর' },
    ],
  },
  {
    id: 'noakhali',
    divisionId: 'chattogram',
    nameEn: 'Noakhali',
    nameBn: 'নোয়াখালী',
    lat: 22.8696,
    lng: 91.0994,
    areas: [
      { nameEn: 'Maijdee', nameBn: 'মাইজদী' },
      { nameEn: 'Chowmuhani', nameBn: 'চৌমুহনী' },
    ],
  },
  {
    id: 'rangamati',
    divisionId: 'chattogram',
    nameEn: 'Rangamati',
    nameBn: 'রাঙ্গামাটি',
    lat: 22.6533,
    lng: 92.1789,
    areas: [
      { nameEn: 'Rangamati Sadar', nameBn: 'রাঙ্গামাটি সদর' },
      { nameEn: 'Kaptai', nameBn: 'কাপ্তাই' },
    ],
  },
  {
    id: 'khagrachhari',
    divisionId: 'chattogram',
    nameEn: 'Khagrachhari',
    nameBn: 'খাগড়াছড়ি',
    lat: 23.1193,
    lng: 91.9847,
    areas: [{ nameEn: 'Khagrachhari Sadar', nameBn: 'খাগড়াছড়ি সদর' }],
  },
  {
    id: 'bandarban',
    divisionId: 'chattogram',
    nameEn: 'Bandarban',
    nameBn: 'বান্দরবান',
    lat: 22.1953,
    lng: 92.2184,
    areas: [{ nameEn: 'Bandarban Sadar', nameBn: 'বান্দরবান সদর' }],
  },

  // Rajshahi Division (8 Districts)
  {
    id: 'rajshahi',
    divisionId: 'rajshahi',
    nameEn: 'Rajshahi',
    nameBn: 'রাজশাহী',
    lat: 24.3745,
    lng: 88.6042,
    areas: [
      { nameEn: 'Shaheb Bazar', nameBn: 'সাহেব বাজার' },
      { nameEn: 'Kazla', nameBn: 'কাজলা' },
      { nameEn: 'Motihar', nameBn: 'মতিহার' },
      { nameEn: 'Padma Residential', nameBn: 'পদ্মা আবাসিক' },
    ],
  },
  {
    id: 'bogura',
    divisionId: 'rajshahi',
    nameEn: 'Bogura',
    nameBn: 'বগুড়া',
    lat: 24.8465,
    lng: 89.3773,
    areas: [
      { nameEn: 'Satmatha', nameBn: 'সাতমাথা' },
      { nameEn: 'Sherpur', nameBn: 'শেরপুর' },
    ],
  },
  {
    id: 'pabna',
    divisionId: 'rajshahi',
    nameEn: 'Pabna',
    nameBn: 'পাবনা',
    lat: 24.0064,
    lng: 89.2372,
    areas: [
      { nameEn: 'Pabna Sadar', nameBn: 'পাবনা সদর' },
      { nameEn: 'Ishwardi', nameBn: 'ঈশ্বরদী' },
    ],
  },
  {
    id: 'sirajganj',
    divisionId: 'rajshahi',
    nameEn: 'Sirajganj',
    nameBn: 'সিরাজগঞ্জ',
    lat: 24.4534,
    lng: 89.7007,
    areas: [{ nameEn: 'Sirajganj Sadar', nameBn: 'সিরাজগঞ্জ সদর' }],
  },
  {
    id: 'natore',
    divisionId: 'rajshahi',
    nameEn: 'Natore',
    nameBn: 'নাটোর',
    lat: 24.4206,
    lng: 89.0003,
    areas: [{ nameEn: 'Natore Sadar', nameBn: 'নাটোর সদর' }],
  },
  {
    id: 'naogaon',
    divisionId: 'rajshahi',
    nameEn: 'Naogaon',
    nameBn: 'নওগাঁ',
    lat: 24.8118,
    lng: 88.9466,
    areas: [{ nameEn: 'Naogaon Sadar', nameBn: 'নওগাঁ সদর' }],
  },
  {
    id: 'chapainawabganj',
    divisionId: 'rajshahi',
    nameEn: 'Chapainawabganj',
    nameBn: 'চাঁপাইনবাবগঞ্জ',
    lat: 24.5965,
    lng: 88.2775,
    areas: [{ nameEn: 'Chapainawabganj Sadar', nameBn: 'চাঁপাইনবাবগঞ্জ সদর' }],
  },
  {
    id: 'joypurhat',
    divisionId: 'rajshahi',
    nameEn: 'Joypurhat',
    nameBn: 'জয়পুরহাট',
    lat: 25.0968,
    lng: 89.0227,
    areas: [{ nameEn: 'Joypurhat Sadar', nameBn: 'জয়পুরহাট সদর' }],
  },

  // Khulna Division (10 Districts)
  {
    id: 'khulna',
    divisionId: 'khulna',
    nameEn: 'Khulna',
    nameBn: 'খুলনা',
    lat: 22.8456,
    lng: 89.5403,
    areas: [
      { nameEn: 'Shib Bari', nameBn: 'শিববাড়ি' },
      { nameEn: 'Sonadanga', nameBn: 'সোনাডাঙ্গা' },
      { nameEn: 'Khalishpur', nameBn: 'খালিশপুর' },
      { nameEn: 'Daulatpur', nameBn: 'দৌলতপুর' },
    ],
  },
  {
    id: 'jashore',
    divisionId: 'khulna',
    nameEn: 'Jashore',
    nameBn: 'যশোর',
    lat: 23.1664,
    lng: 89.2081,
    areas: [
      { nameEn: 'Jashore Sadar', nameBn: 'যশোর সদর' },
      { nameEn: 'Benapole', nameBn: 'বেনাপোল' },
    ],
  },
  {
    id: 'kushtia',
    divisionId: 'khulna',
    nameEn: 'Kushtia',
    nameBn: 'কুষ্টিয়া',
    lat: 23.9013,
    lng: 89.1205,
    areas: [{ nameEn: 'Kushtia Sadar', nameBn: 'কুষ্টিয়া সদর' }],
  },
  {
    id: 'satkhira',
    divisionId: 'khulna',
    nameEn: 'Satkhira',
    nameBn: 'সাতক্ষীরা',
    lat: 22.7185,
    lng: 89.0705,
    areas: [{ nameEn: 'Satkhira Sadar', nameBn: 'সাতক্ষীরা সদর' }],
  },
  {
    id: 'bagerhat',
    divisionId: 'khulna',
    nameEn: 'Bagerhat',
    nameBn: 'বাগেরহাট',
    lat: 22.6516,
    lng: 89.7859,
    areas: [{ nameEn: 'Bagerhat Sadar', nameBn: 'বাগেরহাট সদর' }],
  },
  {
    id: 'jhenaidah',
    divisionId: 'khulna',
    nameEn: 'Jhenaidah',
    nameBn: 'ঝিনাইদহ',
    lat: 23.5450,
    lng: 89.1726,
    areas: [{ nameEn: 'Jhenaidah Sadar', nameBn: 'ঝিনাইদহ সদর' }],
  },
  {
    id: 'magura',
    divisionId: 'khulna',
    nameEn: 'Magura',
    nameBn: 'মাগুরা',
    lat: 23.4873,
    lng: 89.4199,
    areas: [{ nameEn: 'Magura Sadar', nameBn: 'মাগুরা সদর' }],
  },
  {
    id: 'narail',
    divisionId: 'khulna',
    nameEn: 'Narail',
    nameBn: 'নড়াইল',
    lat: 23.1725,
    lng: 89.5127,
    areas: [{ nameEn: 'Narail Sadar', nameBn: 'নড়াইল সদর' }],
  },
  {
    id: 'chuadanga',
    divisionId: 'khulna',
    nameEn: 'Chuadanga',
    nameBn: 'চুয়াডাঙ্গা',
    lat: 23.6402,
    lng: 88.8418,
    areas: [{ nameEn: 'Chuadanga Sadar', nameBn: 'চুয়াডাঙ্গা সদর' }],
  },
  {
    id: 'meherpur',
    divisionId: 'khulna',
    nameEn: 'Meherpur',
    nameBn: 'মেহেরপুর',
    lat: 23.7622,
    lng: 88.6318,
    areas: [{ nameEn: 'Meherpur Sadar', nameBn: 'মেহেরপুর সদর' }],
  },

  // Barishal Division (6 Districts)
  {
    id: 'barishal',
    divisionId: 'barishal',
    nameEn: 'Barishal',
    nameBn: 'বরিশাল',
    lat: 22.7010,
    lng: 90.3535,
    areas: [
      { nameEn: 'Nathullabad', nameBn: 'নথুল্লাবাদ' },
      { nameEn: 'Rupatali', nameBn: 'রূপাতলী' },
      { nameEn: 'Band Road', nameBn: 'বান্দ রোড' },
    ],
  },
  {
    id: 'patuakhali',
    divisionId: 'barishal',
    nameEn: 'Patuakhali',
    nameBn: 'পটুয়াখালী',
    lat: 22.3596,
    lng: 90.3299,
    areas: [{ nameEn: 'Patuakhali Sadar', nameBn: 'পটুয়াখালী সদর' }],
  },
  {
    id: 'bhola',
    divisionId: 'barishal',
    nameEn: 'Bhola',
    nameBn: 'ভোলা',
    lat: 22.6859,
    lng: 90.6482,
    areas: [{ nameEn: 'Bhola Sadar', nameBn: 'ভোলা সদর' }],
  },
  {
    id: 'pirojpur',
    divisionId: 'barishal',
    nameEn: 'Pirojpur',
    nameBn: 'পিরোজপুর',
    lat: 22.5841,
    lng: 89.9720,
    areas: [{ nameEn: 'Pirojpur Sadar', nameBn: 'পিরোজপুর সদর' }],
  },
  {
    id: 'jhalokati',
    divisionId: 'barishal',
    nameEn: 'Jhalokati',
    nameBn: 'ঝালকাঠি',
    lat: 22.6406,
    lng: 90.1987,
    areas: [{ nameEn: 'Jhalokati Sadar', nameBn: 'ঝালকাঠি সদর' }],
  },
  {
    id: 'barguna',
    divisionId: 'barishal',
    nameEn: 'Barguna',
    nameBn: 'বরগুনা',
    lat: 22.1592,
    lng: 90.1262,
    areas: [{ nameEn: 'Barguna Sadar', nameBn: 'বরগুনা সদর' }],
  },

  // Sylhet Division (4 Districts)
  {
    id: 'sylhet',
    divisionId: 'sylhet',
    nameEn: 'Sylhet',
    nameBn: 'সিলেট',
    lat: 24.8949,
    lng: 91.8687,
    areas: [
      { nameEn: 'Zindabazar', nameBn: 'জিন্দাবাজার' },
      { nameEn: 'Amberkhana', nameBn: 'আম্বরখানা' },
      { nameEn: 'Shahjalal Upashahar', nameBn: 'শাহজালাল উপশহর' },
      { nameEn: 'Kumarpara', nameBn: 'কুমারপাড়া' },
    ],
  },
  {
    id: 'moulvibazar',
    divisionId: 'sylhet',
    nameEn: 'Moulvibazar',
    nameBn: 'মৌলভীবাজার',
    lat: 24.4829,
    lng: 91.7774,
    areas: [
      { nameEn: 'Moulvibazar Sadar', nameBn: 'মৌলভীবাজার সদর' },
      { nameEn: 'Sreemangal', nameBn: 'শ্রীমঙ্গল' },
    ],
  },
  {
    id: 'habiganj',
    divisionId: 'sylhet',
    nameEn: 'Habiganj',
    nameBn: 'হবিগঞ্জ',
    lat: 24.3749,
    lng: 91.4155,
    areas: [{ nameEn: 'Habiganj Sadar', nameBn: 'হবিগঞ্জ সদর' }],
  },
  {
    id: 'sunamganj',
    divisionId: 'sylhet',
    nameEn: 'Sunamganj',
    nameBn: 'সুনামগঞ্জ',
    lat: 25.0658,
    lng: 91.3950,
    areas: [{ nameEn: 'Sunamganj Sadar', nameBn: 'সুনামগঞ্জ সদর' }],
  },

  // Rangpur Division (8 Districts)
  {
    id: 'rangpur',
    divisionId: 'rangpur',
    nameEn: 'Rangpur',
    nameBn: 'রংপুর',
    lat: 25.7439,
    lng: 89.2752,
    areas: [
      { nameEn: 'Jahaj Company More', nameBn: 'জাহাজ কোম্পানি মোড়' },
      { nameEn: 'Dhap', nameBn: 'ধাপ' },
      { nameEn: 'Modern More', nameBn: 'মডার্ন মোড়' },
    ],
  },
  {
    id: 'dinajpur',
    divisionId: 'rangpur',
    nameEn: 'Dinajpur',
    nameBn: 'দিনাজপুর',
    lat: 25.6217,
    lng: 88.6355,
    areas: [{ nameEn: 'Dinajpur Sadar', nameBn: 'দিনাজপুর সদর' }],
  },
  {
    id: 'gaibandha',
    divisionId: 'rangpur',
    nameEn: 'Gaibandha',
    nameBn: 'গাইবান্ধা',
    lat: 25.3288,
    lng: 89.5281,
    areas: [{ nameEn: 'Gaibandha Sadar', nameBn: 'গাইবান্ধা সদর' }],
  },
  {
    id: 'kurigram',
    divisionId: 'rangpur',
    nameEn: 'Kurigram',
    nameBn: 'কুড়িগ্রাম',
    lat: 25.8054,
    lng: 89.6362,
    areas: [{ nameEn: 'Kurigram Sadar', nameBn: 'কুড়িগ্রাম সদর' }],
  },
  {
    id: 'lalmonirhat',
    divisionId: 'rangpur',
    nameEn: 'Lalmonirhat',
    nameBn: 'লালমনিরহাট',
    lat: 25.9923,
    lng: 89.2847,
    areas: [{ nameEn: 'Lalmonirhat Sadar', nameBn: 'লালমনিরহাট সদর' }],
  },
  {
    id: 'nilphamari',
    divisionId: 'rangpur',
    nameEn: 'Nilphamari',
    nameBn: 'নীলফামারী',
    lat: 25.9318,
    lng: 88.8560,
    areas: [
      { nameEn: 'Nilphamari Sadar', nameBn: 'নীলফামারী সদর' },
      { nameEn: 'Saidpur', nameBn: 'সৈয়দপুর' },
    ],
  },
  {
    id: 'panchagarh',
    divisionId: 'rangpur',
    nameEn: 'Panchagarh',
    nameBn: 'পঞ্চগড়',
    lat: 26.3411,
    lng: 88.5542,
    areas: [{ nameEn: 'Panchagarh Sadar', nameBn: 'পঞ্চগড় সদর' }],
  },
  {
    id: 'thakurgaon',
    divisionId: 'rangpur',
    nameEn: 'Thakurgaon',
    nameBn: 'ঠাকুরগাঁও',
    lat: 26.0337,
    lng: 88.4617,
    areas: [{ nameEn: 'Thakurgaon Sadar', nameBn: 'ঠাকুরগাঁও সদর' }],
  },

  // Mymensingh Division (4 Districts)
  {
    id: 'mymensingh',
    divisionId: 'mymensingh',
    nameEn: 'Mymensingh',
    nameBn: 'ময়মনসিংহ',
    lat: 24.7471,
    lng: 90.4203,
    areas: [
      { nameEn: 'Ganginar Par', nameBn: 'গাঙ্গিনার পাড়' },
      { nameEn: 'Town Hall', nameBn: 'টাউন হল' },
      { nameEn: 'Charpara', nameBn: 'চরপাড়া' },
    ],
  },
  {
    id: 'jamalpur',
    divisionId: 'mymensingh',
    nameEn: 'Jamalpur',
    nameBn: 'জামালপুর',
    lat: 24.9375,
    lng: 89.9378,
    areas: [{ nameEn: 'Jamalpur Sadar', nameBn: 'জামালপুর সদর' }],
  },
  {
    id: 'netrokona',
    divisionId: 'mymensingh',
    nameEn: 'Netrokona',
    nameBn: 'নেত্রকোণা',
    lat: 24.8709,
    lng: 90.7279,
    areas: [{ nameEn: 'Netrokona Sadar', nameBn: 'নেত্রকোণা সদর' }],
  },
  {
    id: 'sherpur',
    divisionId: 'mymensingh',
    nameEn: 'Sherpur',
    nameBn: 'শেরপুর',
    lat: 25.0205,
    lng: 90.0153,
    areas: [{ nameEn: 'Sherpur Sadar', nameBn: 'শেরপুর সদর' }],
  },
];

export function getDistrictsByDivision(divisionInput?: string): BangladeshDistrict[] {
  if (!divisionInput) return BANGLADESH_DISTRICTS;
  const norm = divisionInput.trim().toLowerCase();
  const matchedDiv = BANGLADESH_DIVISIONS.find(
    (d) =>
      d.id.toLowerCase() === norm ||
      d.nameEn.toLowerCase() === norm ||
      d.nameBn === divisionInput.trim()
  );
  if (!matchedDiv) return BANGLADESH_DISTRICTS;
  return BANGLADESH_DISTRICTS.filter((dist) => dist.divisionId === matchedDiv.id);
}

export function findDistrict(query?: string): BangladeshDistrict | undefined {
  if (!query) return undefined;
  const norm = query.trim().toLowerCase();
  return BANGLADESH_DISTRICTS.find(
    (d) =>
      d.id.toLowerCase() === norm ||
      d.nameEn.toLowerCase() === norm ||
      d.nameBn === query.trim() ||
      d.nameEn.toLowerCase().includes(norm)
  );
}

export function findNearestBangladeshLocation(lat: number, lng: number): {
  division: BangladeshDivision;
  district: BangladeshDistrict;
  areaNameEn: string;
  areaNameBn: string;
  distanceKm: number;
} {
  let closest = BANGLADESH_DISTRICTS[0];
  let minDistSq = Infinity;
  for (const dist of BANGLADESH_DISTRICTS) {
    const dLat = dist.lat - lat;
    const dLng = dist.lng - lng;
    const distSq = dLat * dLat + dLng * dLng;
    if (distSq < minDistSq) {
      minDistSq = distSq;
      closest = dist;
    }
  }
  const division =
    BANGLADESH_DIVISIONS.find((d) => d.id === closest.divisionId) || BANGLADESH_DIVISIONS[0];
  const distanceKm = Math.round(Math.sqrt(minDistSq) * 111 * 10) / 10;
  return {
    division,
    district: closest,
    areaNameEn: closest.areas[0]?.nameEn || closest.nameEn,
    areaNameBn: closest.areas[0]?.nameBn || closest.nameBn,
    distanceKm,
  };
}
