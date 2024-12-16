import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyDxCP_J1Fs2ykvJxJMmhznUlmNFQO1T-5w",
  authDomain: "notification-44d1b.firebaseapp.com",
  databaseURL: "https://notification-44d1b-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "notification-44d1b",
  storageBucket: "notification-44d1b.firebasestorage.app",
  messagingSenderId: "1040954361921",
  appId: "1:1040954361921:web:c4ecad2e482aebbc2f9ec0",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// Test connection
const testConnection = () => {
    const connectedRef = ref(database, '.info/connected');
    onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
            console.log('Connected to Firebase');
        } else {
            console.log('Not connected to Firebase');
        }
    });
};

testConnection();

export { database, auth }; 