//Firebase SDK for the first layer of the application
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

//Firebase configuration (configure the values from the firebase console)
const firebaseConfig = {
    apiKey: "AIzaSyBMnmqAXbVyNT8BFik3SmcU84WLpMItayQ",
    authDomain: "blockchain-based-voting-75039.firebaseapp.com",
    projectId: "blockchain-based-voting-75039",
    storageBucket: "blockchain-based-voting-75039.firebasestorage.app",
    messagingSenderId: "394984958638",
    appId: "1:394984958638:web:02d6b6fa862eb3c7d75b3f",
    measurementId: "G-EFB6EMGWZ7"
  };

//initialize firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

//register a new voter with email/password
export const registerVoter = async (email, password, userData) => {
  try {
    //check if voter with this email already exists
    const votersRef = collection(db, 'voters');
    const q = query(votersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      throw new Error('A voter with this email is already registered');
    }
    
    //create user in Firebase Auth with required fields (email, password)
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    //send email verification
    await sendEmailVerification(user);
    
    //generate a unique voter key
    const voterKey = generateVoterKey();
    
    //create voter document in Firestore using required fields
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

//login with email/password to the application
export const loginVoter = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    //check if email is verified by checking the emailVerified field in the user document with the data from the database
    if (!user.emailVerified) {
      //send verification email again if needed if users email is not verified
      await sendEmailVerification(user);
      throw new Error('Please verify your email before logging in. A new verification email has been sent.');
    }
    
    //get voter data from Firestore
    const voterDoc = await getDoc(doc(db, 'voters', user.uid));
    
    if (!voterDoc.exists()) {
      throw new Error('Voter record not found');
    }
    
    //update emailVerified status in Firestore if needed
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

//sign out from the application
export const logoutVoter = async () => {
  try {
    await signOut(auth);
    return true;
  } catch (error) {
    throw error;
  }
};

//check if a user is logged in
export const checkAuthState = (callback) => {
  return onAuthStateChanged(auth, callback);
};

//update a voter's data in the database
export const updateVoterData = async (userId, data) => {
  try {
    await setDoc(doc(db, 'voters', userId), data, { merge: true });
    return true;
  } catch (error) {
    throw error;
  }
};

//record that a voter has voted in the database
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

//generate a unique voter key (voterKey for unique identification of the voter)
const generateVoterKey = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const keyLength = 12;
  let key = '';
  
  for (let i = 0; i < keyLength; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
    //add a hyphen every 4 characters except at the end
    if (i > 0 && i < keyLength - 1 && (i + 1) % 4 === 0) {
      key += '-';
    }
  }
  
  return key;
};

//check if email is already registered
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

//export the auth and db objects for direct access
export { auth, db, sendEmailVerification };
