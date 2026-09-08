export interface EnergyPackage {
  id: string;
  vipLevel: number;
  nameBn: string;
  nameEn: string;
  locationBn: string;
  locationEn: string;
  gridNode: string;
  image: string;
  statusBn: string;
  statusEn: string;
  statusColor: string;
  fundedPercent: number;
  minInvestment: number;
  dailyRate: number; // e.g. 3.8
  cycleDays: number; // e.g. 30
  categoryBn: string;
  categoryEn: string;
}

export const ENERGY_PACKAGES_7: EnergyPackage[] = [
  {
    id: 'pkg-solar-vip1',
    vipLevel: 1,
    nameBn: 'অ্যাপেক্স হেলওস সোলার অ্যারে ও এআই সাবস্টেশন',
    nameEn: 'Apex Helios Solar Array & AI Substation',
    locationBn: 'বরিন্দ নবায়নযোগ্য অঞ্চল, গ্রিড নোড ৪',
    locationEn: 'Barind Renewable Zone, Grid Node 4',
    gridNode: 'Grid Node 4',
    image: '/images/solar_ai_substation_1788465992131.jpg',
    statusBn: 'Operational & Delivering',
    statusEn: 'Operational & Delivering',
    statusColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40',
    fundedPercent: 86,
    minInvestment: 1000,
    dailyRate: 3.8,
    cycleDays: 30,
    categoryBn: 'সোলার ফটোভোলটাইক + এআই সাবস্টেশন',
    categoryEn: 'Solar Photovoltaic + AI Inverter',
  },
  {
    id: 'pkg-bess-vip2',
    vipLevel: 2,
    nameBn: 'ভ্যানগার্ড ইন্ডাস্ট্রিয়াল BESS শক্তি সঞ্চয়াগার ও গ্রিড বাফার',
    nameEn: 'Vanguard Industrial BESS Storage & Grid Buffer',
    locationBn: 'ঢাকা উত্তর হাই-ভোল্টেজ টার্মিনাল, গ্রিড নোড ২',
    locationEn: 'Dhaka North High-Voltage Terminal, Grid Node 2',
    gridNode: 'Grid Node 2',
    image: '/images/bess_storage_facility_1788466008161.jpg',
    statusBn: 'Operational & Delivering',
    statusEn: 'Operational & Delivering',
    statusColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40',
    fundedPercent: 78,
    minInvestment: 2500,
    dailyRate: 4.0,
    cycleDays: 35,
    categoryBn: 'গ্রিড-স্কেল লিথিয়াম-আয়রন স্টোরেজ',
    categoryEn: 'Grid-Scale Lithium Energy Storage',
  },
  {
    id: 'pkg-turbine-vip3',
    vipLevel: 3,
    nameBn: 'টারবাইনজেন কম্বাইন্ড গ্যাস-স্টিম পাওয়ার স্টেশন',
    nameEn: 'TurbineGen Cogeneration Hydro-Gas Power Hub',
    locationBn: 'মেঘনা শিল্প শক্তি করিডোর, গ্রিড নোড ৫',
    locationEn: 'Meghna Industrial Energy Corridor, Grid Node 5',
    gridNode: 'Grid Node 5',
    image: '/images/smart_turbine_plant_1788466039952.jpg',
    statusBn: 'Operational & Delivering',
    statusEn: 'Operational & Delivering',
    statusColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40',
    fundedPercent: 92,
    minInvestment: 5000,
    dailyRate: 4.2,
    cycleDays: 40,
    categoryBn: 'উচ্চ-দক্ষতা সমন্বিত সাইকেল পাওয়ার হাব',
    categoryEn: 'Combined Cycle Cogeneration Hub',
  },
  {
    id: 'pkg-wind-vip4',
    vipLevel: 4,
    nameBn: 'নোভাউইন্ড উপকূলীয় অফশোর টারবাইন কমপ্লেক্স',
    nameEn: 'NovaWind Coastal Offshore Aeroturbine Matrix',
    locationBn: 'বঙ্গোপসাগর কোস্টাল টার্মিনাল, গ্রিড নোড ১',
    locationEn: 'Bay of Bengal Coastal Terminal, Grid Node 1',
    gridNode: 'Grid Node 1',
    image: '/images/energy_hero_facility_1788465969350.jpg',
    statusBn: 'Operational & Delivering',
    statusEn: 'Operational & Delivering',
    statusColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40',
    fundedPercent: 64,
    minInvestment: 10000,
    dailyRate: 4.5,
    cycleDays: 45,
    categoryBn: 'ডিপ-ওয়াটার অফশোর উইন্ড ম্যাট্রিক্স',
    categoryEn: 'Deep-Water Aeroturbine Matrix',
  },
  {
    id: 'pkg-hydro-vip5',
    vipLevel: 5,
    nameBn: 'কোয়ান্টাম হাইড্রো-পাম্পড বিদ্যুৎ উৎপাদন টার্মিনাল',
    nameEn: 'Quantum Hydro-Pumped Energy Storage Hub',
    locationBn: 'কর্ণফুলী জলবিদ্যুৎ অঞ্চল, গ্রিড নোড ৭',
    locationEn: 'Karnaphuli Hydro Region, Grid Node 7',
    gridNode: 'Grid Node 7',
    image: '/images/smart_turbine_plant_1788466039952.jpg',
    statusBn: 'Operational & Delivering',
    statusEn: 'Operational & Delivering',
    statusColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40',
    fundedPercent: 89,
    minInvestment: 25000,
    dailyRate: 4.8,
    cycleDays: 50,
    categoryBn: 'পাম্পড-স্টোরেজ হাইড্রোইলেকট্রিক জেনারেটর',
    categoryEn: 'Pumped-Storage Hydro Terminal',
  },
  {
    id: 'pkg-grid-vip6',
    vipLevel: 6,
    nameBn: 'ফিউশনএক্স ৪০০কেভি আল্ট্রা-গ্রিড ট্রান্সমিশন নেটওয়ার্ক',
    nameEn: 'FusionX 400kV Ultra-Grid Transmission Backbone',
    locationBn: 'জাতীয় সেন্ট্রাল ব্যাকবোন করিডোর, গ্রিড নোড ৩',
    locationEn: 'National Central Backbone Corridor, Grid Node 3',
    gridNode: 'Grid Node 3',
    image: '/images/solar_ai_substation_1788465992131.jpg',
    statusBn: 'Operational & Delivering',
    statusEn: 'Operational & Delivering',
    statusColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40',
    fundedPercent: 94,
    minInvestment: 50000,
    dailyRate: 5.0,
    cycleDays: 60,
    categoryBn: 'আল্ট্রা হাই-ভোল্টেজ স্মার্ট গ্রিড করিডোর',
    categoryEn: 'Ultra High-Voltage Smart Grid Corridor',
  },
  {
    id: 'pkg-nuclear-vip7',
    vipLevel: 7,
    nameBn: 'নেক্সাস এআই নিউক্লিয়ার-ক্লিন এনার্জি হাব',
    nameEn: 'Nexus AI Clean Nuclear Energy Complex',
    locationBn: 'পদ্মা জাতীয় এনার্জি হাব, গ্রিড নোড ৯',
    locationEn: 'Padma National Energy Hub, Grid Node 9',
    gridNode: 'Grid Node 9',
    image: '/images/bess_storage_facility_1788466008161.jpg',
    statusBn: 'Operational & Delivering',
    statusEn: 'Operational & Delivering',
    statusColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40',
    fundedPercent: 98,
    minInvestment: 100000,
    dailyRate: 5.5,
    cycleDays: 65,
    categoryBn: 'পরবর্তী প্রজন্মের মডুলার ক্লিন এনার্জি প্ল্যান্ট',
    categoryEn: 'Next-Gen Modular Clean Energy Complex',
  },
];

// Helper to format numbers in Bengali digits
export function toBengaliNumber(num: number | string): string {
  const bnDigits: { [key: string]: string } = {
    '0': '০',
    '1': '১',
    '2': '২',
    '3': '৩',
    '4': '৪',
    '5': '৫',
    '6': '৬',
    '7': '৭',
    '8': '৮',
    '9': '৯',
    ',': ',',
    '.': '.',
  };
  const str = typeof num === 'number' ? num.toLocaleString('en-US') : String(num);
  return str.split('').map((char) => bnDigits[char] || char).join('');
}
