// firebaseDebug.js - Debug utilities for Firebase connection

import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db, auth } from './firebase';

/**
 * Test if Firebase is properly initialized
 */
export const testFirebaseConnection = () => {
  console.log('=== Firebase Connection Test ===');
  console.log('Firebase App:', db.app ? '✓ Initialized' : '✗ Not initialized');
  console.log('Database:', db ? '✓ Connected' : '✗ Not connected');
  console.log('Auth:', auth ? '✓ Ready' : '✗ Not ready');
  console.log('Current user:', auth.currentUser ? auth.currentUser.uid : 'Not logged in');
  console.log('================================');
};

/**
 * Test writing to Firestore
 */
export const testFirestoreWrite = async () => {
  try {
    console.log('=== Testing Firestore Write ===');
    
    const testData = {
      test: 'Hello Firestore',
      timestamp: new Date().toISOString()
    };
    
    console.log('Attempting to write test data:', testData);
    
    const docRef = await addDoc(collection(db, 'test_collection'), testData);
    
    console.log('✓ Write successful! Document ID:', docRef.id);
    console.log('================================');
    
    return { success: true, docId: docRef.id };
  } catch (error) {
    console.error('✗ Write failed!');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    console.log('================================');
    
    return { success: false, error };
  }
};

/**
 * Test reading from Firestore
 */
export const testFirestoreRead = async (collectionName = 'test_collection') => {
  try {
    console.log(`=== Testing Firestore Read (${collectionName}) ===`);
    
    const querySnapshot = await getDocs(collection(db, collectionName));
    
    console.log('✓ Read successful!');
    console.log('Documents found:', querySnapshot.size);
    
    querySnapshot.forEach((doc) => {
      console.log('Document ID:', doc.id);
      console.log('Document data:', doc.data());
    });
    
    console.log('================================');
    
    return { success: true, count: querySnapshot.size };
  } catch (error) {
    console.error('✗ Read failed!');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    console.log('================================');
    
    return { success: false, error };
  }
};

/**
 * Check Firestore security rules
 */
export const checkSecurityRules = async () => {
  console.log('=== Security Rules Check ===');
  console.log('Current user:', auth.currentUser ? auth.currentUser.uid : 'Not logged in');
  
  if (!auth.currentUser) {
    console.log('⚠ Not authenticated - most operations will fail');
    console.log('================================');
    return;
  }
  
  console.log('✓ Authenticated as:', auth.currentUser.uid);
  console.log('Email:', auth.currentUser.email);
  console.log('Display Name:', auth.currentUser.displayName);
  console.log('================================');
};

/**
 * Run all tests
 */
export const runAllTests = async () => {
  console.log('\n🔍 Running Firebase Diagnostics...\n');
  
  testFirebaseConnection();
  await checkSecurityRules();
  
  if (auth.currentUser) {
    await testFirestoreWrite();
    await testFirestoreRead('test_collection');
    await testFirestoreRead('user_account');
  } else {
    console.log('⚠ Skipping write/read tests - user not authenticated');
  }
  
  console.log('\n✅ Diagnostics complete!\n');
};

// Export for window access (useful for browser console)
if (typeof window !== 'undefined') {
  window.firebaseDebug = {
    testConnection: testFirebaseConnection,
    testWrite: testFirestoreWrite,
    testRead: testFirestoreRead,
    checkRules: checkSecurityRules,
    runAll: runAllTests
  };
  console.log('💡 Firebase debug tools available at window.firebaseDebug');
}