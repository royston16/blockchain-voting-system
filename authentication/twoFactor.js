//two factor authentication for the application using OTP (One-Time Password)
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import * as OTPAuth from 'otpauth';

//generate secret for a user
export const generateSecret = async (userId) => {
  try {
    //create a new TOTP (Time-based One-Time Password) object
    const totp = new OTPAuth.TOTP({
      issuer: 'BlockchainVote',
      label: userId,
      algorithm: 'SHA1',
      digits: 6,
      period: 30
    });

    //generate a random secret
    const secret = totp.secret.base32;
    
    //store secret in Firestore
    await setDoc(doc(db, 'voters', userId), {
      twoFactorSecret: secret,
      twoFactorEnabled: false
    }, { merge: true });
    
    //generate otpauth URL for QR code
    const otpauthUrl = totp.toString();
    
    //use a free online API to generate a QR code for the user to scan
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;
    
    return { secret, qrCodeUrl };
  } catch (error) {
    console.error('Error generating 2FA secret:', error);
    throw error;
  }
};

//verify token for the user
export const verifyToken = async (userId, token) => {
  try {
    const userDoc = await getDoc(doc(db, 'voters', userId));
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    const secret = userData.twoFactorSecret;
    
    if (!secret) {
      throw new Error('2FA not set up for this user');
    }
    
    //create a TOTP object with the user's secret
    const totp = new OTPAuth.TOTP({
      issuer: 'BlockchainVote',
      label: userId,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: secret
    });
    
    //verify the token with the secret
    const delta = totp.validate({ token });
    return delta !== null;
  } catch (error) {
    console.error('Error verifying 2FA token:', error);
    throw error;
  }
};

//enable 2FA for the user by verifying the token
export const enable2FA = async (userId, token) => {
  try {
    const verified = await verifyToken(userId, token);
    
    if (verified) {
      await setDoc(doc(db, 'voters', userId), {
        twoFactorEnabled: true
      }, { merge: true });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error enabling 2FA:', error);
    throw error;
  }
};
