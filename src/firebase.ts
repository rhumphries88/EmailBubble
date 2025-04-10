import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  Timestamp,
  startAfter,
  where
} from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDzLyTPK-kvmPNKKFufD0CTZHTI6NWq3QE",
  authDomain: "aktwgs-65f34.firebaseapp.com",
  projectId: "aktwgs-65f34",
  storageBucket: "aktwgs-65f34.firebasestorage.app",
  messagingSenderId: "762157998257",
  appId: "1:762157998257:web:508f6bc6a63e2161ce4290"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const MESSAGES_PER_PAGE = 12;

// Email message interface
export interface EmailMessage {
  id?: string;
  name: string;
  company: string;
  email: string;
  body: string;
  likes: number;
  color: string;
  timestamp: Timestamp | Date;
}

// Save email message to Firestore
export const saveEmailMessage = async (message: Omit<EmailMessage, 'timestamp'>) => {
  try {
    // Check if we already have 100 emails
    const emailsRef = collection(db, 'emails');
    const countQuery = query(emailsRef);
    const snapshot = await getDocs(countQuery);
    
    if (snapshot.size >= 100) {
      // Find the email with the lowest likes and oldest timestamp
      const oldestQuery = query(
        emailsRef,
        orderBy('likes', 'asc'),
        orderBy('timestamp', 'asc'),
        limit(1)
      );
      
      const oldestSnapshot = await getDocs(oldestQuery);
      
      if (!oldestSnapshot.empty) {
        // Delete the oldest email with lowest likes
        await deleteDoc(doc(db, 'emails', oldestSnapshot.docs[0].id));
      }
    }
    
    // Add the new email
    const docRef = await addDoc(emailsRef, {
      ...message,
      timestamp: serverTimestamp()
    });
    
    return { id: docRef.id, ...message, timestamp: new Date() };
  } catch (error) {
    console.error('Error saving email message:', error);
    throw error;
  }
};

// Get paginated email messages
export const getEmailMessages = async (lastDoc?: EmailMessage) => {
  try {
    const emailsRef = collection(db, 'emails');
    let q = query(
      emailsRef,
      orderBy('timestamp', 'desc'),
      limit(MESSAGES_PER_PAGE)
    );

    if (lastDoc) {
      q = query(
        emailsRef,
        orderBy('timestamp', 'desc'),
        startAfter(lastDoc.timestamp),
        limit(MESSAGES_PER_PAGE)
      );
    }

    const snapshot = await getDocs(q);
    
    return {
      messages: snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EmailMessage[],
      hasMore: snapshot.docs.length === MESSAGES_PER_PAGE
    };
  } catch (error) {
    console.error('Error getting email messages:', error);
    throw error;
  }
};

// Update likes for an email message
export const updateEmailLikes = async (id: string, likes: number) => {
  try {
    const emailRef = doc(db, 'emails', id);
    await addDoc(collection(emailRef, 'likes'), {
      timestamp: serverTimestamp()
    });
    return likes;
  } catch (error) {
    console.error('Error updating email likes:', error);
    throw error;
  }
};

// Delete an email message
export const deleteEmailMessage = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'emails', id));
    return true;
  } catch (error) {
    console.error('Error deleting email message:', error);
    throw error;
  }
};