import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const firebaseConfig = {
  apiKey: "AIzaSyCylFAPujR2odXOCFg3dncfjNGK-edJHJM",
  authDomain: "novavest-a711c.firebaseapp.com",
  projectId: "novavest-a711c",
  storageBucket: "novavest-a711c.firebasestorage.app",
  messagingSenderId: "826750954477",
  appId: "1:826750954477:web:5cc28ef9c03318208855e4",
  measurementId: "G-J9MHHMXXVY"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const collectionsToClear = [
  "users",
  "registered_phones",
  "phone_index",
  "referral_nodes",
  "referrals",
  "registered_accounts",
  "deposits",
  "transactions",
  "withdrawals",
  "investments",
  "promo_claims",
  "deleted_accounts"
];

async function run() {
  console.log("=== Purging all Firestore collections ===");
  for (const col of collectionsToClear) {
    try {
      const snap = await getDocs(collection(db, col));
      console.log(`Checking ${col}: ${snap.size} items`);
      if (snap.empty) continue;

      // Batch delete in chunks of 450
      let batch = writeBatch(db);
      let count = 0;
      for (const d of snap.docs) {
        batch.delete(doc(db, col, d.id));
        count++;
        if (count >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) {
        await batch.commit();
      }
      console.log(`Successfully purged ${snap.size} docs from ${col}`);
    } catch (e) {
      console.warn(`Error on ${col}:`, e.message);
    }
  }

  // Also clean server data files
  const dataDir = path.join(process.cwd(), 'data');
  const filesToReset = ['phone_registry.json', 'users_backup.json', 'registered_phones.json'];
  for (const f of filesToReset) {
    const p = path.join(dataDir, f);
    if (fs.existsSync(p)) {
      fs.writeFileSync(p, '{}', 'utf-8');
      console.log(`Reset ${f} to empty`);
    }
  }

  console.log("=== All accounts and referral codes purged completely! ===");
  process.exit(0);
}

run();
