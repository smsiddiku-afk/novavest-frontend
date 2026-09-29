import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

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

async function cleanAllAccounts() {
  console.log('[Cleaner] Starting to clean all user accounts from Firebase Firestore...');

  const collectionsToClean = [
    'users',
    'registered_accounts',
    'referrals',
    'promo_claims',
    'investments',
    'deposits',
    'withdrawals',
    'transactions'
  ];

  for (const colName of collectionsToClean) {
    try {
      const snap = await getDocs(collection(db, colName));
      console.log(`[Cleaner] Found ${snap.size} documents in '${colName}'`);
      for (const d of snap.docs) {
        await deleteDoc(doc(db, colName, d.id));
      }
      console.log(`[Cleaner] Cleaned '${colName}' completely.`);
    } catch (err: any) {
      console.warn(`[Cleaner] Warning on '${colName}':`, err.message);
    }
  }

  console.log('[Cleaner] All user accounts and related data cleaned successfully from Firestore!');
  process.exit(0);
}

cleanAllAccounts();
