// Authentication Service for Persistent Email Login, Google Firebase Auth & Cloud Scoping
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, type User } from '../firebase';

export interface UserSession {
  uid?: string;
  email: string;
  name: string;
  role: string;
  photoURL?: string;
  authenticatedAt: string;
  deviceId: string;
  token: string;
  authProvider: 'google' | 'email';
}

const SESSION_KEY = 'distribuidora_imperio_user_session';

export const authService = {
  // Get current active session from persistent storage
  getSession(): UserSession | null {
    try {
      const data = localStorage.getItem(SESSION_KEY);
      if (!data) return null;
      return JSON.parse(data) as UserSession;
    } catch (e) {
      console.error('Error reading auth session:', e);
      return null;
    }
  },

  // Save authenticated session
  saveSession(email: string, name?: string, uid?: string, photoURL?: string, provider: 'google' | 'email' = 'email'): UserSession {
    const formattedEmail = email.trim().toLowerCase();
    const displayName = name || formattedEmail.split('@')[0].toUpperCase();
    
    // Generate or retrieve device ID
    let deviceId = localStorage.getItem('app_device_id');
    if (!deviceId) {
      deviceId = 'DEV-' + Math.random().toString(36).substring(2, 9).toUpperCase();
      localStorage.setItem('app_device_id', deviceId);
    }

    const session: UserSession = {
      uid: uid || 'usr-' + btoa(formattedEmail).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16),
      email: formattedEmail,
      name: displayName,
      role: 'Administrador Principal',
      photoURL,
      authenticatedAt: new Date().toISOString(),
      deviceId,
      token: 'jwt_sec_' + btoa(formattedEmail) + '_' + Date.now(),
      authProvider: provider,
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  },

  // Google Sign-In with Firebase Popup
  async signInWithGoogle(): Promise<UserSession> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const session = this.saveSession(
        user.email || 'usuario@google.com',
        user.displayName || undefined,
        user.uid,
        user.photoURL || undefined,
        'google'
      );
      return session;
    } catch (err: any) {
      console.error('Firebase Google Sign-In error:', err);
      throw err;
    }
  },

  // Listen to Firebase Auth state
  onAuthChange(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  // Clear session (Logout)
  async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Sign out warning:', e);
    }
    localStorage.removeItem(SESSION_KEY);
  },

  // Generate a 6-digit security code for email verification
  generateMagicCode(email: string): string {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`[AUTH MAGIC CODE FOR ${email}]: ${code}`);
    return code;
  }
};
