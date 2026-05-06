import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, push, update, remove, onValue, query, orderByChild, limitToLast } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyB5lyPD7lh3sY55xO7rl7INuWRwaCBEhik",
  authDomain: "studyverse-ab6aa.firebaseapp.com",
  databaseURL: "https://studyverse-ab6aa-default-rtdb.firebaseio.com",
  projectId: "studyverse-ab6aa",
  storageBucket: "studyverse-ab6aa.firebasestorage.app",
  messagingSenderId: "33610356945",
  appId: "1:33610356945:web:331b569b526d17c3b00df0",
  measurementId: "G-693FR6LQF4"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database, ref, set, get, push, update, remove, onValue, query, orderByChild, limitToLast };
export default app;
