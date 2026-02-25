
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Page, Kost } from './types';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Listings from './pages/Listings';
import Products from './pages/Products';
import About from './pages/About';
import Contact from './pages/Contact';
import Owner from './pages/Owner';
import Login from './pages/Login';
import Profile from './pages/Profile';
import KostDetail from './pages/KostDetail';
import Dashboard from './pages/Dashboard';
import SurveyService from './pages/SurveyService';
import { getPublishedProperties } from './userService';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>(Page.HOME);
  const [selectedKostId, setSelectedKostId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [listings, setListings] = useState<Kost[]>([]);
  const [loadingListings, setLoadingListings] = useState(true); // New loading state
  const [pendingTransaction, setPendingTransaction] = useState<{
    type: 'kost' | 'product';
    id: string;
  } | null>(null);

  // Fetch Public Listings on Mount
  const fetchListings = async () => {
    setLoadingListings(true);
    try {
      const data = await getPublishedProperties();
      setListings(data);
    } catch (error) {
      console.error("Failed to load listings", error);
    } finally {
      setLoadingListings(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const forceRefreshTokenAndCheckClaims = async (currentUser: any) => {
    if (currentUser) {
      console.log("DEBUG: Refreshing ID token for user:", currentUser.uid);
      try {
        const idTokenResult = await currentUser.getIdTokenResult(true); // 'true' memaksa refresh
        console.log("DEBUG: Fresh ID Token Claims:", idTokenResult.claims);
        if (idTokenResult.claims.admin) {
          console.log("DEBUG: Custom claim 'admin: true' ditemukan di token!");
        } else {
          console.error("DEBUG: Custom claim 'admin: true' TIDAK ditemukan di token setelah refresh.");
        }
      } catch (e) {
        console.error("DEBUG: Error refreshing token:", e);
      }
    }
  };

  const fetchUserData = async (currentUser: any) => {
    if (currentUser) {
      try {
        await currentUser.reload();
        await forceRefreshTokenAndCheckClaims(currentUser);
      } catch (e) {
        console.log("Error reloading user", e);
      }

      if (currentUser.emailVerified) {
        let dbData: any = {};
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            dbData = docSnap.data() || {};
          }
        } catch (err) {
          console.error("Error fetching user profile from DB:", err);
        }

        const storedProfile = localStorage.getItem(`user_profile_${currentUser.email}`);
        const extraData = storedProfile ? JSON.parse(storedProfile) : {};

        let role = dbData.role || 'user';
        if (dbData.isAdmin === true) {
          role = 'admin';
        }

        const safeUser = {
          uid: currentUser.uid,
          email: currentUser.email,
          emailVerified: currentUser.emailVerified,
          photoURL: currentUser.photoURL,
          displayName: dbData.name || currentUser.displayName || extraData.name,
          phoneNumber: dbData.phone || currentUser.phoneNumber || extraData.phone,
          ...extraData,
          ...dbData,
          role: role
        };

        setUser(safeUser);

        if (role === 'admin' && activePage === Page.LOGIN) {
          setActivePage(Page.DASHBOARD_ADMIN);
        }

      } else {
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setLoadingAuth(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      await fetchUserData(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Handle kostId deep link
  useEffect(() => {
    if (!loadingAuth) {
      const params = new URLSearchParams(window.location.search);
      const kostId = params.get('kostId');
      if (kostId) {
        // Prevent re-triggering by wiping the query param without refreshing
        window.history.replaceState({}, document.title, window.location.pathname);
        if (user) {
          setSelectedKostId(kostId);
          setActivePage(Page.DETAIL);
        } else {
          setPendingTransaction({ type: 'kost', id: kostId });
          setActivePage(Page.LOGIN);
          alert("Login terlebih dahulu untuk melihat detail kost.");
        }
      }
    }
  }, [loadingAuth, user]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activePage, selectedKostId]);

  // CRUD for local state update optimization
  const handleAddKost = (newKost: Kost) => {
    setListings(prev => [newKost, ...prev]);
  };
  const handleEditKost = (updatedKost: Kost) => {
    setListings(prev => prev.map(item => item.id === updatedKost.id ? updatedKost : item));
  };
  const handleDeleteKost = (id: string) => {
    setListings(prev => prev.filter(item => item.id !== id));
  };

  const handleKostSelect = (id: string) => {
    if (!user) {
      alert("Login terlebih dahulu untuk akses selengkapnya.");
      setActivePage(Page.LOGIN);
      return;
    }
    setSelectedKostId(id);
    setActivePage(Page.DETAIL);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setActivePage(Page.HOME);
      setPendingTransaction(null);
    } catch (error) {
      console.error("Logout Error", error);
    }
  };

  const isProfileComplete = (userData: any): boolean => {
    if (!userData) return false;
    return (
      !!userData.displayName &&
      !!userData.phone &&
      !!userData.occupation &&
      !!userData.institution &&
      !!userData.address &&
      !!userData.gender &&
      !!userData.religion &&
      (!!userData.relationshipStatus || !!userData.maritalStatus)
    );
  };

  const handleProfileSaveSuccess = async () => {
    if (auth.currentUser) {
      await fetchUserData(auth.currentUser);
    }
    alert("Data Tersimpan");
    if (pendingTransaction) {
      if (pendingTransaction.type === 'kost') {
        setSelectedKostId(pendingTransaction.id);
        setActivePage(Page.DETAIL);
      } else if (pendingTransaction.type === 'product') {
        setActivePage(Page.PRODUCTS);
      }
      setPendingTransaction(null);
    } else {
      if (user?.role === 'admin') {
        setActivePage(Page.DASHBOARD_ADMIN);
      } else {
        setActivePage(Page.HOME);
      }
    }
  };

  const renderPage = () => {
    if (loadingAuth) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      );
    }

    if (activePage === Page.DETAIL && selectedKostId) {
      const kost = listings.find(k => k.id === selectedKostId);
      if (kost) {
        return (
          <KostDetail
            kost={kost}
            onBack={() => setActivePage(Page.LISTINGS)}
            user={user}
            onLoginRedirect={() => setActivePage(Page.LOGIN)}
            validateProfile={() => {
              if (!isProfileComplete(user)) {
                setPendingTransaction({ type: 'kost', id: kost.id });
                alert("Silahkan lengkapi profile sebelum transaksi.");
                setActivePage(Page.PROFILE);
                return false;
              }
              return true;
            }}
          />
        );
      }
    }

    switch (activePage) {
      case Page.HOME:
        return <Home onPageChange={setActivePage} onKostSelect={handleKostSelect} user={user} listings={listings} loading={loadingListings} />;
      case Page.LISTINGS:
        return <Listings onKostClick={handleKostSelect} listings={listings} loading={loadingListings} user={user} />;
      case Page.PRODUCTS:
        return (
          <Products
            user={user}
            onLoginRedirect={() => setActivePage(Page.LOGIN)}
            initialSelectedProductId={pendingTransaction?.type === 'product' ? pendingTransaction.id : undefined}
            validateProfile={(productId: string) => {
              if (!isProfileComplete(user)) {
                setPendingTransaction({ type: 'product', id: productId });
                alert("Silahkan lengkapi profile sebelum transaksi.");
                setActivePage(Page.PROFILE);
                return false;
              }
              return true;
            }}
          />
        );
      case Page.OWNER:
        return <Owner />;
      case Page.ABOUT:
        return <About />;
      case Page.CONTACT:
        return <Contact />;
      case Page.SURVEY_SERVICE:
        return <SurveyService />;
      case Page.LOGIN:
        if (user) {
          return user.role === 'admin'
            ? <Dashboard role={user.role} onPageChange={setActivePage} listings={listings} onAdd={handleAddKost} onEdit={handleEditKost} onDelete={handleDeleteKost} />
            : <Home onPageChange={setActivePage} onKostSelect={handleKostSelect} user={user} listings={listings} loading={loadingListings} />;
        }
        return <Login onLoginSuccess={() => fetchUserData(auth.currentUser)} />;
      case Page.PROFILE:
        return (
          <Profile
            user={user}
            onLogout={handleLogout}
            onSaveSuccess={handleProfileSaveSuccess}
            forceEdit={!!pendingTransaction}
          />
        );
      case Page.DASHBOARD_ADMIN:
        return <Dashboard role={user?.role || 'admin'} onPageChange={setActivePage} listings={listings} onAdd={handleAddKost} onEdit={handleEditKost} onDelete={handleDeleteKost} onRefreshListings={fetchListings} />;
      case Page.DASHBOARD_OWNER:
        return <Dashboard role={user?.role || 'owner'} onPageChange={setActivePage} listings={listings} onAdd={handleAddKost} onEdit={handleEditKost} onDelete={handleDeleteKost} onRefreshListings={fetchListings} />;
      default:
        return <Home onPageChange={setActivePage} onKostSelect={handleKostSelect} user={user} listings={listings} loading={loadingListings} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-orange-100 selection:text-orange-900">
      <Navbar
        activePage={activePage}
        onPageChange={(page) => {
          setActivePage(page);
          setSelectedKostId(null);
          setPendingTransaction(null);
        }}
        user={user}
        onLogout={handleLogout}
      />

      <main className="flex-grow">
        {renderPage()}
      </main>

      <Footer onPageChange={setActivePage} />
    </div>
  );
};

export default App;
