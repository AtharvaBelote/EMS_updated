import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (userId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setCurrentUser({
            ...userData,
            displayName: userData.displayName || userData.email || 'User',
            createdAt: userData.createdAt,
            lastLoginAt: userData.lastLoginAt,
          });
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (userId: string, password: string) => {
    try {
      setLoading(true);
      
      let usersQuery = query(collection(db, 'users'), where('userId', '==', userId));
      let userSnapshot = await getDocs(usersQuery);
      
      if (userSnapshot.empty) {
        usersQuery = query(collection(db, 'users'), where('employeeId', '==', userId));
        userSnapshot = await getDocs(usersQuery);
      }
      
      if (userSnapshot.empty) {
        throw new Error('User not found. Please check your Employee ID and try again.');
      }

      const userDoc = userSnapshot.docs[0];
      const userData = userDoc.data() as User;
      
      if (userData.role !== 'employee') {
        throw new Error('This app is for employees only. Please use the web portal.');
      }

      const userCredential = await signInWithEmailAndPassword(auth, userData.email, password);

      await updateDoc(doc(db, 'users', userDoc.id), {
        lastLoginAt: new Date()
      });

      await AsyncStorage.setItem('user', JSON.stringify(userData));

      setCurrentUser({
        ...userData,
        uid: userCredential.user.uid,
        displayName: userData.displayName || userData.email || 'User',
        lastLoginAt: new Date(),
      });
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof Error) {
        if (error.message.includes('auth/wrong-password')) {
          throw new Error('Incorrect password. Please try again.');
        } else if (error.message.includes('auth/user-not-found')) {
          throw new Error('User not found. Please check your Employee ID and try again.');
        } else if (error.message.includes('auth/too-many-requests')) {
          throw new Error('Too many failed attempts. Please try again later.');
        }
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      await AsyncStorage.removeItem('user');
      setCurrentUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    currentUser,
    loading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
