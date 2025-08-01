'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User } from '@/types';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (userId: string, password: string) => Promise<void>;
  register: (userId: string, email: string, password: string, displayName: string, role: 'admin' | 'manager') => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
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
        // Get user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setCurrentUser({
            ...userData,
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
      console.log('Attempting login with userId:', userId);
      
      // First, try to find the user by userId in Firestore
      let usersQuery = query(collection(db, 'users'), where('userId', '==', userId));
      let userSnapshot = await getDocs(usersQuery);
      
      console.log('Search by userId result:', userSnapshot.empty ? 'No users found' : 'User found');
      
      // If not found by userId, try to find by employeeId
      if (userSnapshot.empty) {
        console.log('Trying to find by employeeId...');
        usersQuery = query(collection(db, 'users'), where('employeeId', '==', userId));
        userSnapshot = await getDocs(usersQuery);
        console.log('Search by employeeId result:', userSnapshot.empty ? 'No users found' : 'User found');
      }
      
      if (userSnapshot.empty) {
        throw new Error('User not found. Please check your Employee ID/User ID and try again.');
      }

      const userDoc = userSnapshot.docs[0];
      const userData = userDoc.data() as User;
      
      // Login with email and password
      await signInWithEmailAndPassword(auth, userData.email, password);

      // Update last login time
      await updateDoc(doc(db, 'users', userDoc.id), {
        lastLoginAt: new Date()
      });
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof Error) {
        if (error.message.includes('auth/wrong-password')) {
          throw new Error('Incorrect password. Please try again.');
        } else if (error.message.includes('auth/user-not-found')) {
          throw new Error('User not found. Please check your Employee ID/User ID and try again.');
        } else if (error.message.includes('auth/too-many-requests')) {
          throw new Error('Too many failed attempts. Please try again later.');
        } else if (error.message.includes('auth/user-disabled')) {
          throw new Error('Account has been disabled. Please contact administrator.');
        }
      }
      throw error;
    }
  };

  const register = async (userId: string, email: string, password: string, displayName: string, role: 'admin' | 'manager') => {
    try {
      // Check if userId already exists
      const existingUserQuery = query(collection(db, 'users'), where('userId', '==', userId));
      const existingUserSnapshot = await getDocs(existingUserQuery);
      
      if (!existingUserSnapshot.empty) {
        throw new Error('User ID already exists');
      }

      // Check if email already exists
      const existingEmailQuery = query(collection(db, 'users'), where('email', '==', email));
      const existingEmailSnapshot = await getDocs(existingEmailQuery);
      
      if (!existingEmailSnapshot.empty) {
        throw new Error('Email already exists');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update Firebase profile
      await updateProfile(userCredential.user, { displayName });

      // Create user document in Firestore
      const userData: User = {
        uid: userCredential.user.uid,
        userId,
        email,
        role,
        displayName,
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };

      await setDoc(doc(db, 'users', userCredential.user.uid), userData);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const updateUserProfile = async (data: Partial<User>) => {
    if (!currentUser) return;
    
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), data);
      setCurrentUser(prev => prev ? { ...prev, ...data } : null);
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    currentUser,
    loading,
    login,
    register,
    logout,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 