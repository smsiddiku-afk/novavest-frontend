import { db, sanitizeFirestoreData, cleanDocId, safeDoc, safeSetDoc } from "../lib/firebase";
import { collection, doc, getDocs, setDoc, deleteDoc } from "firebase/firestore";

export const DEFAULT_INVESTMENT_PACKAGES = [
  {
    id: 'basic-plan',
    category: 'solar',
    badgeCategoryEn: 'Solar Energy',
    badgeCategoryBn: 'সোলার এনার্জি',
    badgeIconType: 'sun',
    nameEn: 'Basic Plan',
    nameBn: 'বেসিক প্ল্যান',
    taglineEn: 'Stable returns | 100% Renewable',
    taglineBn: 'স্থির রিটার্ন | ১০০% নবায়নযোগ্য',
    image: '/images/apex-helios-solar.jpg',
    minInvestmentUsd: 10,
    minInvestmentBdt: 1200,
    minInvestment: 1200,
    durationDays: 30,
    dailyReturnPercent: 1.5,
    totalReturnPercent: 45,
    maxPurchaseLimit: 2,
    requiredVipLevel: 0,
    isActive: true,
    order: 1,
  },
  {
    id: 'standard-plan',
    category: 'wind',
    badgeCategoryEn: 'Wind Energy',
    badgeCategoryBn: 'উইন্ড এনার্জি',
    badgeIconType: 'wind',
    nameEn: 'Standard Plan',
    nameBn: 'স্ট্যান্ডার্ড প্ল্যান',
    taglineEn: 'Stable returns | Clean Energy',
    taglineBn: 'স্থির রিটার্ন | ক্লিন এনার্জি',
    image: '/images/novawind-facility.jpg',
    minInvestmentUsd: 50,
    minInvestmentBdt: 6000,
    minInvestment: 6000,
    durationDays: 45,
    dailyReturnPercent: 2.6,
    totalReturnPercent: 90,
    maxPurchaseLimit: 2,
    requiredVipLevel: 0,
    isActive: true,
    order: 2,
  },
  {
    id: 'premium-plan',
    category: 'hydro',
    badgeCategoryEn: 'Hydro Energy',
    badgeCategoryBn: 'হাইড্রো এনার্জি',
    badgeIconType: 'droplet',
    nameEn: 'Premium Plan',
    nameBn: 'প্রিমিয়াম প্ল্যান',
    taglineEn: 'Long Term Growth | Sustainable',
    taglineBn: 'দীর্ঘমেয়াদী প্রবৃদ্ধি | টেকসই শক্তি',
    image: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=800&q=80',
    minInvestmentUsd: 100,
    minInvestmentBdt: 12000,
    minInvestment: 12000,
    durationDays: 60,
    dailyReturnPercent: 2.5,
    totalReturnPercent: 150,
    maxPurchaseLimit: 0,
    requiredVipLevel: 1,
    isActive: true,
    order: 3,
  },
  {
    id: 'vip-plan',
    category: 'combo',
    badgeCategoryEn: 'VIP Plan',
    badgeCategoryBn: 'ভিআইপি প্ল্যান',
    badgeIconType: 'crown',
    nameEn: 'VIP Plan',
    nameBn: 'ভিআইপি প্ল্যান',
    taglineEn: 'High Profit | Advanced Project',
    taglineBn: 'উচ্চ মুনাফা | অ্যাডভান্সড প্রজেক্ট',
    image: '/images/smart_turbine_plant_1788466039952.jpg',
    minInvestmentUsd: 200,
    minInvestmentBdt: 24000,
    minInvestment: 24000,
    durationDays: 75,
    dailyReturnPercent: 3.0,
    totalReturnPercent: 225,
    maxPurchaseLimit: 0,
    requiredVipLevel: 1,
    isActive: true,
    order: 4,
  },
  {
    id: 'diamond-plan',
    category: 'solar',
    badgeCategoryEn: 'Diamond Plan',
    badgeCategoryBn: 'ডায়মন্ড প্ল্যান',
    badgeIconType: 'gem',
    nameEn: 'Diamond Plan',
    nameBn: 'ডায়মন্ড প্ল্যান',
    taglineEn: 'Maximum Profit | Premium Project',
    taglineBn: 'সর্বোচ্চ মুনাফা | প্রিমিয়াম প্রজেক্ট',
    image: '/images/solar_ai_substation_1788465992131.jpg',
    minInvestmentUsd: 500,
    minInvestmentBdt: 60000,
    minInvestment: 60000,
    durationDays: 90,
    dailyReturnPercent: 3.5,
    totalReturnPercent: 315,
    maxPurchaseLimit: 0,
    requiredVipLevel: 1,
    isActive: true,
    order: 5,
  },
  {
    id: 'platinum-plan',
    category: 'wind',
    badgeCategoryEn: 'Platinum Plan',
    badgeCategoryBn: 'প্লাটিনাম প্ল্যান',
    badgeIconType: 'star',
    nameEn: 'Platinum Plan',
    nameBn: 'প্লাটিনাম প্ল্যান',
    taglineEn: 'Elite Investment | Long Term',
    taglineBn: 'এলিট বিনিয়োগ | দীর্ঘমেয়াদী চুক্তি',
    image: '/images/vanguard-bess-storage.jpg',
    minInvestmentUsd: 1000,
    minInvestmentBdt: 120000,
    minInvestment: 120000,
    durationDays: 120,
    dailyReturnPercent: 4.0,
    totalReturnPercent: 480,
    maxPurchaseLimit: 0,
    requiredVipLevel: 1,
    isActive: true,
    order: 6,
  },
];

const LOCAL_STORAGE_KEY = 'nova_investment_packages';

// Dispatch custom event to let any components react in real-time
function broadcastUpdate(packages) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(packages));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nova_packages_updated', { detail: packages }));
    }
  } catch (e) {
    console.warn('Storage sync error:', e);
  }
}

// Fetch live packages from Firestore with localStorage & default fallback
export const getLivePackages = async () => {
  // Check local cache first
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Attempt background fetch without blocking
        fetchFromFirestore().catch(() => {});
        return parsed;
      }
    }
  } catch (err) {
    // continue
  }

  return await fetchFromFirestore();
};

async function fetchFromFirestore() {
  try {
    const snap = await getDocs(collection(db, "packages"));
    if (snap.empty) {
      // Seed default packages into Firestore
      for (const pkg of DEFAULT_INVESTMENT_PACKAGES) {
        const safeId = cleanDocId(pkg.id, 'pkg');
        const pkgRef = safeDoc("packages", safeId);
        if (pkgRef) {
          await safeSetDoc(pkgRef, pkg, { merge: true });
        }
      }
      broadcastUpdate(DEFAULT_INVESTMENT_PACKAGES);
      return DEFAULT_INVESTMENT_PACKAGES;
    }

    const list = [];
    snap.forEach((d) => {
      const data = d.data();
      list.push({
        ...data,
        id: d.id,
        minInvestmentBdt: Number(data.minInvestmentBdt || data.minInvestment || 1000),
        minInvestment: Number(data.minInvestmentBdt || data.minInvestment || 1000),
        minInvestmentUsd: Number(data.minInvestmentUsd || Math.round((data.minInvestmentBdt || data.minInvestment || 1000) / 120)),
        dailyReturnPercent: Number(data.dailyReturnPercent || 2.0),
        durationDays: Number(data.durationDays || 30),
        totalReturnPercent: Number(data.totalReturnPercent || Math.round((data.dailyReturnPercent || 2.0) * (data.durationDays || 30))),
        requiredVipLevel: Number(data.requiredVipLevel || 0),
        maxPurchaseLimit: Number(data.maxPurchaseLimit) || 0,
        isActive: data.isActive !== false,
      });
    });

    // Sort by order or price
    list.sort((a, b) => (a.order || 0) - (b.order || 0) || (a.minInvestmentBdt || 0) - (b.minInvestmentBdt || 0));
    broadcastUpdate(list);
    return list;
  } catch (err) {
    console.warn("Error fetching packages from Firestore:", err);
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    broadcastUpdate(DEFAULT_INVESTMENT_PACKAGES);
    return DEFAULT_INVESTMENT_PACKAGES;
  }
}

// Add or update package in Firestore
export const updatePackageInFirestore = async (pkg) => {
  try {
    const rawId = pkg.id || `plan-${Date.now()}`;
    const safeId = cleanDocId(rawId, `plan-${Date.now()}`);
    const sanitized = {
      ...pkg,
      id: safeId,
      minInvestmentBdt: Number(pkg.minInvestmentBdt || pkg.minInvestment || 1000),
      minInvestment: Number(pkg.minInvestmentBdt || pkg.minInvestment || 1000),
      minInvestmentUsd: Number(pkg.minInvestmentUsd || Math.round((pkg.minInvestmentBdt || pkg.minInvestment || 1000) / 120)),
      dailyReturnPercent: Number(pkg.dailyReturnPercent || 2.0),
      durationDays: Number(pkg.durationDays || 30),
      totalReturnPercent: Number(pkg.totalReturnPercent || Math.round((pkg.dailyReturnPercent || 2.0) * (pkg.durationDays || 30))),
      requiredVipLevel: Number(pkg.requiredVipLevel || 0),
      maxPurchaseLimit: Number(pkg.maxPurchaseLimit) || 0,
      isActive: pkg.isActive !== false,
      updatedAt: new Date().toISOString(),
    };

    const pkgDoc = safeDoc("packages", safeId);
    if (pkgDoc) {
      await safeSetDoc(pkgDoc, sanitized, { merge: true });
    }

    // Update local state and broadcast
    const current = await getLivePackages();
    const index = current.findIndex((p) => p.id === safeId);
    let updatedList;
    if (index >= 0) {
      updatedList = current.map((p) => (p.id === safeId ? sanitized : p));
    } else {
      updatedList = [...current, sanitized];
    }
    broadcastUpdate(updatedList);
    return true;
  } catch (err) {
    console.error("Failed to update package in Firestore:", err);
    return false;
  }
};

// Delete package from Firestore
export const deletePackageFromFirestore = async (pkgId) => {
  try {
    const safeId = cleanDocId(pkgId, '');
    if (!safeId) return false;
    const pkgRef = safeDoc("packages", safeId);
    if (pkgRef) {
      await deleteDoc(pkgRef);
    }
    const current = await getLivePackages();
    const updatedList = current.filter((p) => p.id !== safeId && p.id !== pkgId);
    broadcastUpdate(updatedList);
    return true;
  } catch (err) {
    console.error("Failed to delete package from Firestore:", err);
    return false;
  }
};

// Reset packages to standard 6 default plans
export const resetPackagesToDefault = async () => {
  try {
    for (const pkg of DEFAULT_INVESTMENT_PACKAGES) {
      const safeId = cleanDocId(pkg.id, 'pkg');
      const pkgDoc = safeDoc("packages", safeId);
      if (pkgDoc) {
        await safeSetDoc(pkgDoc, pkg, { merge: true });
      }
    }
    broadcastUpdate(DEFAULT_INVESTMENT_PACKAGES);
    return true;
  } catch (err) {
    console.error("Failed to reset packages to default:", err);
    return false;
  }
};
