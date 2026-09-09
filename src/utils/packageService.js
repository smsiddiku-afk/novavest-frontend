import { db } from "../lib/firebase";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";

const DEFAULT_PACKAGES = [
  { id: "pkg-1", nameEn: "Starter Solar", nameBn: "স্টার্টার সোলার", minInvestment: 500, dailyReturnPercent: 3.5, durationDays: 30 },
  { id: "pkg-2", nameEn: "Wind Turbine", nameBn: "উইন্ড টারবাইন", minInvestment: 1200, dailyReturnPercent: 4.0, durationDays: 35 },
  { id: "pkg-3", nameEn: "Hydro Plant", nameBn: "হাইড্রো প্ল্যান্ট", minInvestment: 3000, dailyReturnPercent: 4.5, durationDays: 40 },
  { id: "pkg-4", nameEn: "Biomass Energy", nameBn: "বায়োমাস এনার্জি", minInvestment: 6000, dailyReturnPercent: 5.0, durationDays: 45 },
  { id: "pkg-5", nameEn: "Geothermal Unit", nameBn: "জিওথার্মাল ইউনিট", minInvestment: 12000, dailyReturnPercent: 5.5, durationDays: 50 },
  { id: "pkg-6", nameEn: "Nuclear Core", nameBn: "নিউক্লিয়ার কোর", minInvestment: 25000, dailyReturnPercent: 6.0, durationDays: 60 }
];

export const getLivePackages = async () => {
  try {
    const snap = await getDocs(collection(db, "packages"));
    if (snap.empty) {
      for (const pkg of DEFAULT_PACKAGES) {
        await setDoc(doc(db, "packages", pkg.id), pkg);
      }
      return DEFAULT_PACKAGES;
    }
    const list = [];
    snap.forEach((d) => list.push({ ...d.data(), id: d.id }));
    return list;
  } catch (err) {
    return DEFAULT_PACKAGES;
  }
};

export const updatePackageInFirestore = async (pkg) => {
  try {
    await setDoc(doc(db, "packages", pkg.id), pkg, { merge: true });
    return true;
  } catch (err) {
    return false;
  }
};
