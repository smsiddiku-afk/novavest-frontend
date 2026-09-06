import { EnergySystem, FaqItem } from '../types';

export const ENERGY_SYSTEMS: EnergySystem[] = [
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
      'Zero greenhouse direct emissions'
    ],
    minParticipation: '৳5,000',
    expectedAnnualYield: '12.4% - 15.8% (Production-Indexed)'
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
      'Essential regional grid reliability backbone'
    ],
    minParticipation: '৳10,000',
    expectedAnnualYield: '13.8% - 17.2% (Frequency Service Indexed)'
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
      'AI combustion acoustic monitoring & vibration dampening',
      'Ultra-low NOx burner system with digital twin controls',
      'Continuous 24/7 industrial base load stability',
      'Dual-fuel flexible dispatch capability'
    ],
    minParticipation: '৳20,000',
    expectedAnnualYield: '11.5% - 14.5% (Base Load Contracted)'
  },
  {
    id: 'sys-matrix-04',
    name: 'NovaWind Offshore Aeroturbine Matrix',
    category: 'Coastal Wind Generation Facility',
    image: '/src/assets/images/energy_hero_facility_1788465969350.jpg',
    capacity: '680 MW Installed',
    annualOutput: '1,420,000 MWh / Year',
    status: 'Phase II Expansion',
    statusColor: 'text-purple-400 border-purple-500/30 bg-purple-950/40',
    efficiency: '96.8% Availability',
    location: 'Bay of Bengal Coastal Terminal',
    gridFrequency: '50.01 Hz Synchronized',
    description: 'Deep-water high-capacity wind turbine farm equipped with LiDAR wind gust prediction sensors and automated pitch control algorithms to maximize electricity generation.',
    highlights: [
      'Forward-looking LiDAR anemometer forecasting',
      'Automated yaw and blade pitch optimization',
      'Subsea high-voltage DC (HVDC) transmission link',
      'Robust typhoon-grade marine engineering'
    ],
    minParticipation: '৳15,000',
    expectedAnnualYield: '14.0% - 18.0% (Wind Resource Indexed)'
  }
];

export const HOURLY_GENERATION_DATA = [
  { hour: '00:00', generation: 680, efficiency: 97.8, demand: 620 },
  { hour: '02:00', generation: 640, efficiency: 97.6, demand: 590 },
  { hour: '04:00', generation: 610, efficiency: 97.9, demand: 560 },
  { hour: '06:00', generation: 750, efficiency: 98.1, demand: 710 },
  { hour: '08:00', generation: 980, efficiency: 98.4, demand: 920 },
  { hour: '10:00', generation: 1280, efficiency: 98.8, demand: 1190 },
  { hour: '12:00', generation: 1450, efficiency: 99.1, demand: 1380 },
  { hour: '14:00', generation: 1482, efficiency: 98.9, demand: 1410 },
  { hour: '16:00', generation: 1340, efficiency: 98.5, demand: 1300 },
  { hour: '18:00', generation: 1190, efficiency: 98.2, demand: 1220 },
  { hour: '20:00', generation: 1050, efficiency: 98.0, demand: 1080 },
  { hour: '22:00', generation: 860, efficiency: 97.9, demand: 830 },
];

export const MONTHLY_PRODUCTION_DATA = [
  { month: 'Jan', outputGWh: 38.4, targetGWh: 36.0, uptime: 99.2 },
  { month: 'Feb', outputGWh: 42.1, targetGWh: 39.5, uptime: 99.4 },
  { month: 'Mar', outputGWh: 48.6, targetGWh: 45.0, uptime: 99.1 },
  { month: 'Apr', outputGWh: 54.2, targetGWh: 50.0, uptime: 98.9 },
  { month: 'May', outputGWh: 61.8, targetGWh: 58.0, uptime: 99.5 },
  { month: 'Jun', outputGWh: 59.4, targetGWh: 57.0, uptime: 99.3 },
  { month: 'Jul', outputGWh: 64.9, targetGWh: 61.0, uptime: 99.6 },
  { month: 'Aug', outputGWh: 67.2, targetGWh: 63.5, uptime: 99.7 },
];

export const ENERGY_FAQS: FaqItem[] = [
  {
    id: 'faq-1',
    category: 'general',
    question: 'How does NovaVest AI-Powered Energy Generation work?',
    answer: 'NovaVest co-finances and operates high-efficiency electricity generation and grid-scale storage infrastructure. Our proprietary AI telemetry system predicts power demand, optimizes turbine blade pitch, tracks solar angles, and directs battery storage discharge to maximize grid electricity supply and revenue generation.'
  },
  {
    id: 'faq-2',
    category: 'monitoring',
    question: 'How is electricity generation verified and monitored in real-time?',
    answer: 'Every generation facility is hardwired with certified utility-grade SCADA meters and subsea/substation telemetry gateways. Data on megawatts produced, voltage, frequency (50 Hz), and carbon offsets is streamed live to the dashboard with third-party grid verification.'
  },
  {
    id: 'faq-3',
    category: 'finance',
    question: 'How do project participation and returns function?',
    answer: 'Participants subscribe to asset allocations across vetted facilities. Revenue is derived from real physical electricity sold to national distribution companies and industrial off-takers via Power Purchase Agreements (PPAs). Yields reflect actual generation rather than speculative trading.'
  },
  {
    id: 'faq-4',
    category: 'finance',
    question: 'How are withdrawals processed and what are the limits?',
    answer: 'Withdrawal requests are processed securely into verified mobile wallets (bKash, Nagad, Rocket) or direct bank transfers within 10 to 60 minutes during banking hours. Minimum withdrawal is ৳500 with zero surprise deductions.'
  },
  {
    id: 'faq-5',
    category: 'finance',
    question: 'Are there maintenance or service fees?',
    answer: 'Operational, preventive maintenance, insurance, and grid synchronization fees are accounted for transparently at the facility level prior to net yield distribution, ensuring complete transparency.'
  },
  {
    id: 'faq-6',
    category: 'risk',
    question: 'What are the operational risks involved?',
    answer: 'Industrial risks include weather variations (such as seasonal solar irradiance or wind fluctuations), grid maintenance outages, and transmission line balancing. All facilities are insured against equipment breakdown and force majeure.'
  },
  {
    id: 'faq-7',
    category: 'risk',
    question: 'Does NovaVest promise guaranteed fixed profits?',
    answer: 'No. NovaVest adheres strictly to financial compliance and industrial regulations. All returns are variable and directly indexed to actual physical electricity production and prevailing grid tariffs. We never advertise fixed or guaranteed returns.'
  },
  {
    id: 'faq-8',
    category: 'general',
    question: 'How can I contact technical support or schedule a facility tour?',
    answer: 'Our energy desk is staffed 24/7. You can reach out via live chat, email at support@novavest-energy.io, or call our hotline at +880 9612-ENERGY. Institutional partners can request physical substation audit visits.'
  }
];
