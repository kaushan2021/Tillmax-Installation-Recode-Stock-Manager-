import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import fs from 'fs';

async function test() {
  const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
  
  // Primary app
  const primaryApp = initializeApp(config);
  const primaryAuth = getAuth(primaryApp);
  
  // Sign in primary user (simulate admin)
  // We can't easily sign in without credentials, but we can just check if secondary app affects primary app state.
  
  // Secondary app
  const secondaryApp = initializeApp(config, 'SecondaryApp');
  const secondaryAuth = getAuth(secondaryApp);
  
  try {
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, 'test-secondary@example.com', 'password123');
    console.log('Created user:', userCredential.user.uid);
    console.log('Secondary auth current user:', secondaryAuth.currentUser?.uid);
    console.log('Primary auth current user:', primaryAuth.currentUser?.uid);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await deleteApp(secondaryApp);
  }
}

test();
