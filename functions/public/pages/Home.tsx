
import React from 'react';
import { Page, Kost } from '../types';
import KostCard from '../components/KostCard';

interface HomeProps {
  onPageChange: (page: Page) => void;
  onKostSelect?: (id: string) => void;
  user?: any; 
  listings?: Kost[];
  loading?: boolean;
}

const Home: React.FC<HomeProps> = ({ onPageChange, onKostSelect, user, listings = [], loading = false }) => {
  const featuredKosts = listings.filter(k => k.isVerified).slice(0, 3);

  const handleRestrictedAction = (page: Page) => {
    if (!user) {
      alert("Login terlebih dahulu untuk akses selengkapnya.");
      onPageChange(Page.LOGIN);
      return;
    }
    onPageChange(page);
  };

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-white pt-24 pb-32 overflow-hidden border-b border-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <span className="inline-block bg-orange-50 text-orange-500 text-[10px] font-black px-4 py-2 rounded-full mb-8 tracking-widest uppercase border border-orange-100 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-700">
              Kost Mahasiswa Terverifikasi
            </span>
            <h1 className="text-6xl lg:text-9xl font-black text-gray-900 leading-[0.85] mb-10 uppercase tracking-tighter animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
              Cari Kost <br className="hidden md:block" /> <span className="text-orange-500">Tanpa</span> Ribet.
            </h1>
            <p className="text-xl text-gray-500 mb-12 max-w-2xl mx-auto font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
              Platform pencarian kost mahasiswa berbasis kepercayaan. Semua unit sudah dicek langsung oleh tim lapangan kami untuk menjamin kenyamanan Anda.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
              <button 
                onClick={() => handleRestrictedAction(Page.LISTINGS)}
                className="w-full sm:w-auto bg-orange-500 text-white px-10 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-orange-600 transition-all shadow-2xl shadow-orange-100 active:scale-95"
              >
                Cari Kost Sekarang
              </button>
              <button 
                onClick={() => handleRestrictedAction(Page.PRODUCTS)}
                className="w-full sm:w-auto bg-black text-white px-10 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-gray-900 transition-all shadow-xl hover:shadow-2xl active:scale-95 flex items-center justify-center gap-3 group border-2 border-gray-900 hover:border-black"
              >
                <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Database
              </button>
            </div>
          </div>
        </div>
        
        {/* Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-orange-50/50 rounded-full mix-blend-multiply filter blur-[120px] opacity-40 pointer-events-none -z-10"></div>
        <div className="absolute -bottom-24 left-0 w-64 h-64 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 pointer-events-none"></div>
      </section>

      {/* Featured Listings */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16">
            <div>
              <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4 tracking-tighter uppercase">Kost Pilihan Hari Ini</h2>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Unit terbaik yang baru saja diverifikasi ulang oleh tim lapangan.</p>
            </div>
            <button 
              onClick={() => handleRestrictedAction(Page.LISTINGS)}
              className="mt-8 md:mt-0 bg-gray-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-500 transition-all shadow-xl active:scale-95"
            >
              Lihat Semua Kost
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
            {loading ? (
              // Loading Skeleton
              [1, 2, 3].map((n) => (
                <div key={n} className="bg-white rounded-2xl border border-gray-100 overflow-hidden h-full flex flex-col animate-pulse">
                   <div className="bg-gray-200 aspect-[4/3] w-full"></div>
                   <div className="p-5 space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-8 bg-gray-200 rounded w-full mt-4"></div>
                   </div>
                </div>
              ))
            ) : (
              featuredKosts.map((kost) => (
                <KostCard key={kost.id} kost={kost} onClick={onKostSelect} />
              ))
            )}
            
            {!loading && featuredKosts.length === 0 && (
                <div className="col-span-full text-center py-10 bg-gray-50 rounded-2xl">
                    <p className="text-gray-400 font-bold">Belum ada kost terverifikasi.</p>
                </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
