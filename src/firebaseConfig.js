import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyBivfS7XlsYR4gyrzpVqMgEVD3_vDvNcLg",
    authDomain: "notifycation-9c71a.firebaseapp.com",
    databaseURL: "https://notifycation-9c71a-default-rtdb.firebaseio.com",
    projectId: "notifycation-9c71a",
    storageBucket: "notifycation-9c71a.firebasestorage.app",
    messagingSenderId: "311969528059",
    appId: "1:311969528059:web:4001d6c5d813fe4300185e",
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