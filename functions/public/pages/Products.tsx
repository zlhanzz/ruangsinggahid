
import React, { useState, useMemo, useEffect } from 'react';
import { FORMAT_CURRENCY } from '../constants';
import PaymentGateway from '../components/PaymentGateway';
import { getPublicDatabaseProducts } from '../userService';
import { DatabaseProduct } from '../types';

interface ProductsProps {
  user?: any;
  onLoginRedirect?: () => void;
  validateProfile?: (productId: string) => boolean; // Add validator prop
  initialSelectedProductId?: string; // Prop to handle redirect back
}

const Products: React.FC<ProductsProps> = ({ user, onLoginRedirect, validateProfile, initialSelectedProductId }) => {
  const [dbList, setDbList] = useState<DatabaseProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('Semua Kota');
  const [selectedCampus, setSelectedCampus] = useState('Semua Kampus');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false); 
  
  const [detailItem, setDetailItem] = useState<DatabaseProduct | null>(null);
  const [showPayment, setShowPayment] = useState<DatabaseProduct | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        const data = await getPublicDatabaseProducts();
        setDbList(data);
        setLoading(false);
    };
    fetchData();
  }, []);

  // Auto-open modal if returning from profile update
  useEffect(() => {
    if (initialSelectedProductId && dbList.length > 0) {
      const item = dbList.find(i => i.id === initialSelectedProductId);
      if (item) {
        setDetailItem(item);
      }
    }
  }, [initialSelectedProductId, dbList]);

  // Derived Cities
  const cities = useMemo(() => {
      const uniqueCities = Array.from(new Set(dbList.map(i => i.city)));
      return ['Semua Kota', ...uniqueCities.sort()];
  }, [dbList]);

  // Derived Campuses
  const availableCampuses = useMemo(() => {
    const campuses = dbList
      .filter(i => selectedCity === 'Semua Kota' || i.city === selectedCity)
      .map(i => i.campus);
    return ['Semua Kampus', ...Array.from(new Set(campuses)).sort()];
  }, [selectedCity, dbList]);

  const filteredDatabases = useMemo(() => {
    return dbList.filter(item => {
      const matchSearch = searchTerm === '' || 
        item.campus.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.area.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCity = selectedCity === 'Semua Kota' || item.city === selectedCity;
      const matchCampus = selectedCampus === 'Semua Kampus' || item.campus === selectedCampus;
      return matchSearch && matchCity && matchCampus;
    });
  }, [searchTerm, selectedCity, selectedCampus, dbList]);

  const activeFilterCount = useMemo(() => {
      let count = 0;
      if (searchTerm) count++;
      if (selectedCity !== 'Semua Kota') count++;
      if (selectedCampus !== 'Semua Kampus') count++;
      return count;
  }, [searchTerm, selectedCity, selectedCampus]);

  const handleBuyNow = (item: DatabaseProduct) => {
    // 1. Check Login
    if (!user) {
        setDetailItem(null);
        if (confirm("Anda harus login untuk membeli database ini. Login sekarang?")) {
            onLoginRedirect?.();
        }
        return;
    }

    // 2. Check Profile Completeness (via Parent Validator)
    if (validateProfile) {
      const isValid = validateProfile(item.id);
      if (!isValid) return; // Parent will handle redirect to profile
    }

    setDetailItem(null);
    setShowPayment(item);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCity('Semua Kota');
    setSelectedCampus('Semua Kampus');
  };

  // Shared Render Function for Filters (Used in Desktop Sidebar & Mobile Drawer)
  const renderFilterControls = () => (
    <div className="space-y-6">
        {/* Search Input */}
        <div className="space-y-2">
           <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Cari Area</label>
           <input 
             type="text"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             placeholder="Nama kampus atau area..."
             className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-gray-900 placeholder:text-gray-400"
           />
        </div>

        {/* City Selection */}
        <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Pilih Kota</label>
            <div className="flex flex-wrap gap-2">
            {cities.map(city => (
                <button
                key={city}
                onClick={() => { setSelectedCity(city); setSelectedCampus('Semua Kampus'); }}
                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    selectedCity === city 
                    ? 'bg-orange-500 text-white shadow-lg' 
                    : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-200'
                }`}
                >
                {city}
                </button>
            ))}
            </div>
        </div>

        {/* Campus Selection */}
        <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Pilih Kampus</label>
            <div className="relative">
                <select 
                value={selectedCampus}
                onChange={(e) => setSelectedCampus(e.target.value)}
                disabled={selectedCity === 'Semua Kota' && cities.length > 2} // Disable if no city selected (optional logic)
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-4 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none disabled:opacity-50 transition-all cursor-pointer"
                >
                {availableCampuses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
            </div>
        </div>

        <div className="pt-4 flex gap-3">
            <button 
                onClick={resetFilters} 
                className="flex-1 py-3 text-[9px] font-black text-gray-500 uppercase tracking-widest hover:text-orange-500 border border-gray-200 bg-white rounded-xl transition-colors shadow-sm"
            >
                Reset
            </button>
            <button 
                onClick={() => setIsMobileFilterOpen(false)}
                className="flex-[2] lg:hidden bg-gray-900 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl active:scale-95"
            >
                Terapkan
            </button>
        </div>
    </div>
  );

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-8 animate-in zoom-in-95 duration-500">
          <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-xl">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight mb-4">Pembelian Berhasil!</h2>
            <p className="text-gray-500 font-medium leading-relaxed">Terima kasih. Tautan akses Database Kost akan dikirimkan ke email/WhatsApp Anda dalam maksimal 5 menit.</p>
          </div>
          <button onClick={() => setPaymentSuccess(false)} className="bg-orange-500 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-orange-100 active:scale-95 transition-all w-full">Kembali ke Katalog</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-12">
      {/* Minimalist Hero Section */}
      <section className="pt-32 pb-16 lg:pb-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span className="text-orange-500 font-black text-[10px] uppercase tracking-[0.2em] mb-4 block animate-in fade-in slide-in-from-bottom-2">E-Directory Terupdate v2024</span>
            <h1 className="text-5xl lg:text-7xl font-black text-gray-900 uppercase tracking-tighter leading-[0.9] mb-6 animate-in fade-in slide-in-from-bottom-4 delay-100">
              Database <span className="text-orange-500">Kost</span> <br /> Area Kampus.
            </h1>
            <p className="text-gray-400 font-medium text-lg mb-0 italic animate-in fade-in slide-in-from-bottom-6 delay-200">Data valid, dikumpulkan langsung oleh tim lapangan kami.</p>
        </div>
      </section>

      {/* MOBILE STICKY FILTER BAR (Only Visible on Mobile) - GREY BACKGROUND */}
      <div className="lg:hidden sticky top-[80px] z-40 bg-gray-100/95 backdrop-blur-md px-4 py-4 border-b border-gray-200 transition-all shadow-sm">
        <div className="max-w-3xl mx-auto">
            <button 
            onClick={() => setIsMobileFilterOpen(true)}
            className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-all hover:border-orange-200 hover:shadow-md"
            >
            <div className="flex items-center gap-3">
                <div className="text-orange-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <div className="text-left">
                    <p className="text-xs font-black uppercase tracking-tight text-gray-900 leading-none mb-0.5">Cari Database Kost</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none">
                        {activeFilterCount > 0 
                        ? `${selectedCity} • ${selectedCampus}` 
                        : 'Filter Kota & Kampus...'}
                    </p>
                </div>
            </div>
            {activeFilterCount > 0 && (
                <div className="bg-orange-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-lg shadow-orange-100">
                    {activeFilterCount}
                </div>
            )}
            </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 lg:pt-12">
        {/* Page Header (Filters & Results Count) */}
        <header className="mb-6 lg:mb-12 flex flex-col lg:flex-row lg:justify-between lg:items-end gap-4">
            <div>
                <h2 className="text-2xl lg:text-4xl font-black text-gray-900 uppercase tracking-tight">Katalog Area</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                    Download data kost format Excel (.xlsx)
                </p>
            </div>
            <div className="flex items-center gap-4">
                 <div className="hidden lg:flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                   <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                     {selectedCity} {selectedCampus !== 'Semua Kampus' ? `• ${selectedCampus}` : ''}
                   </p>
                </div>
                <div className="bg-gray-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
                {filteredDatabases.length} Area Ditemukan
                </div>
            </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
            
            {/* DESKTOP SIDEBAR FILTER (Hidden on Mobile) - GREY BACKGROUND */}
            <aside className="hidden lg:block w-1/4 sticky top-24 z-30">
                <div className="bg-gray-100 rounded-[2rem] shadow-sm border border-gray-200 p-6">
                    <div className="mb-6 pb-6 border-b border-gray-200">
                        <h3 className="text-lg font-black uppercase tracking-tight text-gray-900">Filter</h3>
                    </div>
                    {renderFilterControls()}
                </div>
            </aside>

            {/* MOBILE FILTER DRAWER (Hidden on Desktop) */}
            {isMobileFilterOpen && (
                <div className="lg:hidden fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div 
                    className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300" 
                    onClick={() => setIsMobileFilterOpen(false)}
                    ></div>
                    <div className="relative bg-white w-full sm:max-w-lg rounded-t-[3rem] sm:rounded-[2.5rem] shadow-2xl p-8 pb-10 animate-in slide-in-from-bottom duration-500 max-h-[90vh] overflow-y-auto">
                        <div className="w-12 h-1.5 bg-gray-100 rounded-full mx-auto mb-8 sm:hidden"></div>
                        
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tight text-gray-900">Filter Pencarian</h2>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Sesuaikan kebutuhan data anda</p>
                            </div>
                            <button onClick={() => setIsMobileFilterOpen(false)} className="p-2 hover:bg-gray-50 rounded-full text-gray-400 transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>

                        {renderFilterControls()}
                    </div>
                </div>
            )}

            {/* RESULTS GRID (Full width on mobile, 3/4 on desktop) */}
            <main className="w-full lg:w-3/4">
                 {loading ? (
                    <div className="text-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div></div>
                 ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                    {filteredDatabases.map((item) => (
                    <div key={item.id} className="group bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-orange-100 transition-all duration-500 cursor-pointer" onClick={() => setDetailItem(item)}>
                        <div className="aspect-[4/3] overflow-hidden relative">
                        <img 
                          src={item.fileUrls?.coverImage?.webp || item.fileUrls?.coverImage?.original || 'https://via.placeholder.com/400?text=No+Cover'} 
                          alt={item.campus} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                        <div className="absolute bottom-6 left-6 right-6">
                            <span className="bg-orange-500 text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded mb-2 inline-block shadow-lg">{item.city}</span>
                            <h3 className="text-white text-xl lg:text-xl font-black uppercase tracking-tight leading-tight">{item.campus}</h3>
                            <p className="text-white/60 text-[9px] font-bold uppercase tracking-widest">Area {item.area}</p>
                        </div>
                        </div>
                        <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.totalData}+ Kost</p>
                            </div>
                            <p className="text-sm font-black text-gray-900">{FORMAT_CURRENCY(item.price)}</p>
                        </div>
                        <button className="w-full py-3 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-500 transition-all shadow-xl active:scale-95 group-hover:bg-orange-500">Lihat Detail</button>
                        </div>
                    </div>
                    ))}
                </div>
                )}

                {!loading && filteredDatabases.length === 0 && (
                    <div className="text-center py-32 bg-white rounded-[3rem] border border-dashed border-gray-200">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">Belum Tersedia</h4>
                        <p className="text-gray-400 text-sm font-medium uppercase tracking-tight max-w-xs mx-auto">Data area ini sedang dalam proses verifikasi tim lapangan.</p>
                        <button 
                            onClick={resetFilters}
                            className="mt-8 text-orange-500 font-black text-xs uppercase tracking-widest underline decoration-2 underline-offset-4"
                        >
                            Reset Pencarian
                        </button>
                    </div>
                )}
            </main>
        </div>
      </div>

      {/* DETAIL MODAL - MOBILE OPTIMIZED */}
      {detailItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-md transition-opacity" onClick={() => setDetailItem(null)}></div>
          
          <div className="relative bg-white w-full sm:max-w-2xl h-full sm:h-auto sm:max-h-[90vh] sm:rounded-[3rem] overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-500 shadow-2xl flex flex-col">
            
            {/* Scrollable Content Area */}
            <div className="flex-grow overflow-y-auto">
              <div className="h-56 sm:h-64 bg-gray-100 relative">
                <img 
                  src={detailItem.fileUrls?.coverImage?.webp || detailItem.fileUrls?.coverImage?.original || 'https://via.placeholder.com/600'} 
                  className="w-full h-full object-cover" 
                  alt={detailItem.campus} 
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-white"></div>
                
                {/* Close Button Mobile */}
                <button 
                  onClick={() => setDetailItem(null)} 
                  className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 bg-black/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white transition-all backdrop-blur-lg border border-white/20 z-20"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>

                <div className="absolute bottom-6 left-8 right-8 text-white sm:text-gray-900">
                   <span className="bg-orange-500 text-white text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-widest shadow-lg mb-2 inline-block">EDISI {new Date().getFullYear()}</span>
                </div>
              </div>
              
              <div className="px-8 pb-10 pt-4">
                <div className="mb-8">
                  <h2 className="text-2xl sm:text-3xl font-black text-gray-900 uppercase tracking-tight leading-[0.9]">{detailItem.campus}</h2>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-2">{detailItem.city} • Area {detailItem.area}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-8">
                  <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                    <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-1">Total Entri</p>
                    <p className="text-lg font-black text-gray-900">{detailItem.totalData}+ Unit</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Metode Data</p>
                    <p className="text-lg font-black text-gray-900 leading-none">Survey Tim</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-[2rem] p-6 border border-gray-100">
                    <h4 className="text-[10px] font-black uppercase text-gray-900 tracking-widest mb-4 flex items-center gap-2">
                       <div className="w-4 h-px bg-orange-500"></div>
                       Deskripsi:
                    </h4>
                    <p className="text-sm font-medium text-gray-600 leading-relaxed mb-4">
                        {detailItem.description}
                    </p>
                    <div className="grid grid-cols-1 gap-y-3">
                      {[
                        'Kontak Pemilik (WhatsApp)',
                        'Titik Koordinat Google Maps',
                        'Info Harga Kost Terakhir',
                        'Tipe Kost (Putra/Putri/Campur)',
                        'Fasilitas Utama (AC/WiFi)',
                        'Ketersediaan Kamar Terakhir'
                      ].map((info, i) => (
                        <div key={i} className="flex items-center gap-3 text-xs font-bold text-gray-600">
                          <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                          <span className="leading-tight">{info}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-6 border-2 border-dashed border-gray-100 rounded-[2rem]">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                      Catatan: Database dalam format <span className="text-gray-900">{detailItem.fileType === 'upload' ? 'Excel/PDF' : 'Google Drive'}</span> yang dikirim otomatis setelah pembayaran terverifikasi.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* STICKY FOOTER ACTION - ALWAYS VISIBLE */}
            <div className="bg-white border-t border-gray-100 px-8 py-6 sm:py-8 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] sticky bottom-0 z-30">
              <div className="flex items-center justify-between gap-6">
                 <div className="shrink-0">
                   <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Akses Selamanya</p>
                   <p className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tighter">{FORMAT_CURRENCY(detailItem.price)}</p>
                 </div>
                 <button 
                  onClick={() => handleBuyNow(detailItem)}
                  className="flex-grow bg-orange-500 text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-100 hover:bg-orange-600 transition-all active:scale-95 text-center"
                 >
                   Beli Sekarang
                 </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Payment Gateway Modal */}
      {showPayment && (
        <PaymentGateway 
          amount={showPayment.price}
          orderId={`DB-${showPayment.id.substring(0,6).toUpperCase()}`}
          onPaymentSuccess={() => {
            setShowPayment(null);
            setPaymentSuccess(true);
          }}
          onCancel={() => setShowPayment(null)}
        />
      )}
    </div>
  );
};

export default Products;
