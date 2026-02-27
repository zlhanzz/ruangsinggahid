
import React, { useState } from 'react';
import { signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, updateProfile, sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider, signInWithPopup } from '../firebase';

interface LoginProps {
  onLoginSuccess?: () => void;
}

interface FireAuthError {
  code?: string;
  message?: string;
}

type AuthMode = 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD';

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // New state for password visibility

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: ''
  });

  const getErrorMessage = (code: string) => {
    switch (code) {
      case 'auth/email-already-in-use': return 'Email sudah terdaftar. Silakan login.';
      case 'auth/invalid-email': return 'Format email tidak valid.';
      case 'auth/user-not-found': return 'Email tidak terdaftar.';
      case 'auth/wrong-password': return 'Kata sandi salah.';
      case 'auth/invalid-credential': return 'Email atau kata sandi salah.';
      case 'auth/weak-password': return 'Kata sandi terlalu lemah (min. 6 karakter).';
      case 'auth/popup-closed-by-user': return 'Login dibatalkan oleh pengguna.';
      case 'auth/too-many-requests': return 'Terlalu banyak percobaan. Coba lagi nanti.';
      default: return `Terjadi kesalahan: ${code}`;
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      name: '',
      phone: ''
    });
    setErrorMsg('');
    setSuccessMsg('');
    setShowPassword(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);

      // RELOAD USER TO GET FRESH STATUS
      if (userCredential.user) {
        await userCredential.user.reload();
      }

      // CHECK EMAIL VERIFICATION
      if (userCredential.user && !userCredential.user.emailVerified) {
        await signOut(auth); // Force logout
        setErrorMsg('Email Anda belum diverifikasi. Silakan cek inbox/spam email Anda untuk verifikasi akun.');
        setLoading(false);
        return;
      }

      alert('Berhasil Masuk! Selamat datang kembali.');
      if (onLoginSuccess) onLoginSuccess();
    } catch (error) {
      const firebaseError = error as FireAuthError;
      setErrorMsg(getErrorMessage(firebaseError.code || 'unknown'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    // Validasi sederhana
    if (!formData.name || !formData.phone) {
      setErrorMsg('Mohon lengkapi Nama dan Nomor WhatsApp.');
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);

      if (userCredential.user) {
        // 1. Update Firebase Auth Profile (DisplayName)
        await updateProfile(userCredential.user, {
          displayName: formData.name
        });

        // 2. Save User Profile to Firestore (Persistent Storage)
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          role: 'user',
          createdAt: new Date().toISOString()
        }, { merge: true });

        // 3. Backup to LocalStorage (Just in case)
        const profileData = {
          name: formData.name,
          phone: formData.phone,
          joinedAt: new Date().toISOString()
        };
        localStorage.setItem(`user_profile_${formData.email}`, JSON.stringify(profileData));

        // 4. Send Verification
        await sendEmailVerification(userCredential.user);

        // 5. Force Logout
        await signOut(auth);

        setVerificationSent(true);
      }
    } catch (error) {
      const firebaseError = error as FireAuthError;
      setErrorMsg(getErrorMessage(firebaseError.code || 'unknown'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (!formData.email) {
      setErrorMsg('Mohon isi email Anda.');
      setLoading(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, formData.email);
      setSuccessMsg(`Link reset password telah dikirim ke ${formData.email}`);
    } catch (error) {
      const firebaseError = error as FireAuthError;
      setErrorMsg(getErrorMessage(firebaseError.code || 'unknown'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        // Create/Update user doc in Firestore for Google Login too
        await setDoc(doc(db, 'users', result.user.uid), {
          name: result.user.displayName,
          email: result.user.email,
          lastLogin: new Date().toISOString()
        }, { merge: true });
      }

      alert('Berhasil masuk dengan Google!');
      if (onLoginSuccess) onLoginSuccess();
    } catch (error) {
      const firebaseError = error as FireAuthError;
      setErrorMsg(getErrorMessage(firebaseError.code || 'unknown'));
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER SUCCESS VERIFICATION SCREEN ---
  if (verificationSent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden p-8 text-center animate-in zoom-in-95">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" /></svg>
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Verifikasi Email Terkirim</h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Link verifikasi telah dikirim ke <strong>{formData.email}</strong>.<br />
            Silakan cek kotak masuk atau folder spam Anda, lalu verifikasi akun sebelum login.
          </p>
          <button
            onClick={() => {
              setVerificationSent(false);
              setMode('LOGIN');
              resetForm();
            }}
            className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-orange-600 transition-all"
          >
            Kembali ke Login
          </button>
        </div>
      </div>
    );
  }

  // --- MAIN FORM RENDER ---
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-8 sm:p-12">

          {/* Header Title */}
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-gray-900">
              {mode === 'LOGIN' && 'Selamat Datang!'}
              {mode === 'REGISTER' && 'Buat Akun Baru'}
              {mode === 'FORGOT_PASSWORD' && 'Reset Kata Sandi'}
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              {mode === 'LOGIN' && 'Masuk untuk mengelola kost favoritmu'}
              {mode === 'REGISTER' && 'Daftar & Verifikasi untuk akses penuh'}
              {mode === 'FORGOT_PASSWORD' && 'Masukkan email yang terdaftar'}
            </p>
          </div>

          {/* Messages */}
          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-xs font-bold text-red-500 text-left">{errorMsg}</p>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-xs font-bold text-green-500 text-left">{successMsg}</p>
            </div>
          )}

          <form className="space-y-4" onSubmit={
            mode === 'LOGIN' ? handleLogin :
              mode === 'REGISTER' ? handleRegister :
                handleForgotPassword
          }>

            {/* REGISTER FIELDS - SIMPLIFIED */}
            {mode === 'REGISTER' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 transition-all"
                    placeholder="Budi Santoso"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Nomor WhatsApp</label>
                  <input
                    type="tel"
                    required
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 transition-all"
                    placeholder="0812xxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Email Field (All Modes) */}
            <div className={mode === 'REGISTER' ? 'pt-0' : 'pt-2'}>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Email</label>
              <input
                type="email"
                required
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 transition-all"
                placeholder="nama@gmail.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            {/* Password Field (Login & Register Only) */}
            {mode !== 'FORGOT_PASSWORD' && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase">Kata Sandi</label>
                  {mode === 'LOGIN' && (
                    <button
                      type="button"
                      onClick={() => { setMode('FORGOT_PASSWORD'); setErrorMsg(''); setSuccessMsg(''); }}
                      className="text-xs font-bold text-orange-500 hover:text-orange-600"
                    >
                      Lupa Sandi?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 transition-all"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-orange-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 mt-6 ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-orange-600'
                }`}
            >
              {loading && (
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {mode === 'LOGIN' && 'Masuk Sekarang'}
              {mode === 'REGISTER' && 'Daftar & Verifikasi Email'}
              {mode === 'FORGOT_PASSWORD' && 'Kirim Link Reset'}
            </button>

            {/* Back Button for Forgot Password */}
            {mode === 'FORGOT_PASSWORD' && (
              <button
                type="button"
                onClick={() => { setMode('LOGIN'); setErrorMsg(''); setSuccessMsg(''); }}
                className="w-full text-gray-500 font-bold text-sm py-2 hover:text-gray-900"
              >
                Batal
              </button>
            )}
          </form>

          {/* Footer / Switch Mode */}
          {mode !== 'FORGOT_PASSWORD' && (
            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="px-2 bg-white text-gray-400 font-bold">Atau lanjut dengan</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <button
                  onClick={handleGoogleLogin}
                  type="button"
                  className="flex items-center justify-center py-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors gap-2 text-sm font-semibold text-gray-700 col-span-2 sm:col-span-1"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Google
                </button>
                <button
                  type="button"
                  disabled
                  className="flex items-center justify-center py-3 border border-gray-100 rounded-xl bg-gray-50 text-gray-400 gap-2 text-sm font-semibold cursor-not-allowed col-span-2 sm:col-span-1"
                >
                  <svg className="w-5 h-5 opacity-50" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12c0-5.523-4.477-10-10-10z" />
                  </svg>
                  Facebook
                </button>
              </div>

              <div className="mt-8 text-center">
                <p className="text-sm font-medium text-gray-500">
                  {mode === 'LOGIN' ? "Belum punya akun? " : "Sudah punya akun? "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN');
                      resetForm();
                    }}
                    className="text-orange-500 font-bold hover:text-orange-600 transition-colors hover:underline"
                  >
                    {mode === 'LOGIN' ? "Daftar Sekarang" : "Masuk Disini"}
                  </button>
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Login;
