//Import the Firebase SDK
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  onAuthStateChanged
} from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, query, where, getDocs } from 'firebase/firestore';

//Firebase configuration
//Use the values from the firebase console
const firebaseConfig = {
    apiKey: "AIzaSyBMnmqAXbVyNT8BFik3SmcU84WLpMItayQ",
    authDomain: "blockchain-based-voting-75039.firebaseapp.com",
    projectId: "blockchain-based-voting-75039",
    storageBucket: "blockchain-based-voting-75039.firebasestorage.app",
    messagingSenderId: "394984958638",
    appId: "1:394984958638:web:02d6b6fa862eb3c7d75b3f",
    measurementId: "G-EFB6EMGWZ7"
  };

//Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Register a new voter with email/password
export const registerVoter = async (email, password, userData) => {
  try {
    // Check if voter with this email already exists
    const votersRef = collection(db, 'voters');
    const q = query(votersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      throw new Error('A voter with this email is already registered');
    }
    
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Send email verification
    await sendEmailVerification(user);
    
    // Generate a unique voter key
    const voterKey = generateVoterKey();
    
    // Create voter document in Firestore
    await setDoc(doc(db, 'voters', user.uid), {
      ...userData,
      email,
      emailVerified: false,
      voterKey,
      registrationDate: new Date().toISOString(),
      hasVoted: false
    });
    
    return { user, voterKey };
  } catch (error) {
    throw error;
  }
};

// Login with email/password
export const loginVoter = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Check if email is verified
    if (!user.emailVerified) {
      // Send verification email again if needed
      await sendEmailVerification(user);
      throw new Error('Please verify your email before logging in. A new verification email has been sent.');
    }
    
    // Get voter data from Firestore
    const voterDoc = await getDoc(doc(db, 'voters', user.uid));
    
    if (!voterDoc.exists()) {
      throw new Error('Voter record not found');
    }
    
    // Update emailVerified status in Firestore if needed
    if (voterDoc.data().emailVerified === false) {
      await setDoc(doc(db, 'voters', user.uid), {
        emailVerified: true
      }, { merge: true });
    }
    
    const voterData = voterDoc.data();
    
    return {
      user,
      voterData
    };
  } catch (error) {
    throw error;
  }
};

// Sign out
export const logoutVoter = async () => {
  try {
    await signOut(auth);
    return true;
  } catch (error) {
    throw error;
  }
};

// Check if a user is logged in
export const checkAuthState = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Update a voter's data
export const updateVoterData = async (userId, data) => {
  try {
    await setDoc(doc(db, 'voters', userId), data, { merge: true });
    return true;
  } catch (error) {
    throw error;
  }
};

// Record that a voter has voted
export const recordVote = async (userId, candidateId) => {
  try {
    await setDoc(doc(db, 'voters', userId), {
      hasVoted: true,
      votedFor: candidateId,
      voteTimestamp: new Date().toISOString()
    }, { merge: true });
    
    return true;
  } catch (error) {
    throw error;
  }
};

// Generate a unique voter key
const generateVoterKey = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const keyLength = 12;
  let key = '';
  
  for (let i = 0; i < keyLength; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
    // Add a hyphen every 4 characters except at the end
    if (i > 0 && i < keyLength - 1 && (i + 1) % 4 === 0) {
      key += '-';
    }
  }
  
  return key;
};

// Check if email is already registered
export const checkEmailAvailability = async (email) => {
  try {
    if (!email || !email.includes('@')) return null;
    
    const votersRef = collection(db, 'voters');
    const q = query(votersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.empty;
  } catch (error) {
    console.error("Error checking email:", error);
    return null;
  }
};

// Export the auth and db objects for direct access
export { auth, db, sendEmailVerification };
