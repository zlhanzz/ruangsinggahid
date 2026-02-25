
import React, { useState, useMemo } from 'react';
import { FORMAT_CURRENCY } from '../constants';
import { Kost } from '../types';
import KostCard from '../components/KostCard';

interface ListingsProps {
  onKostClick?: (id: string) => void;
  listings?: Kost[];
  loading?: boolean;
  onDelete?: (id: string, type: 'kost' | 'database', name: string) => void;
  user?: any;
}

const Listings: React.FC<ListingsProps> = ({ onKostClick, listings = [], loading = false, onDelete, user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('Semua');
  const [selectedCity, setSelectedCity] = useState('Semua');
  const [selectedCampus, setSelectedCampus] = useState('Semua');
  const [maxPrice, setMaxPrice] = useState(5000000);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Dynamically extract available cities from listings
  const availableCities = useMemo(() => {
    const cities = new Set(listings.map(k => k.city).filter(c => c && c.trim() !== ''));
    return Array.from(cities).sort();
  }, [listings]);

  // Dynamically extract available campuses based on selected city
  const availableCampuses = useMemo(() => {
    let relevantListings = listings;
    
    // If a specific city is selected, only show campuses in that city
    if (selectedCity !== 'Semua') {
      relevantListings = listings.filter(k => k.city === selectedCity);
    }

    const campuses = new Set(relevantListings.map(k => k.campus).filter(c => c && c.trim() !== ''));
    return Array.from(campuses).sort();
  }, [listings, selectedCity]);

  const filteredKosts = useMemo(() => {
    let result = [...listings];

    if (searchTerm) {
      result = result.filter(k => 
        k.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        k.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== 'Semua') {
      result = result.filter(k => k.type === typeFilter);
    }

    if (selectedCity !== 'Semua') {
      result = result.filter(k => k.city === selectedCity);
    }

    if (selectedCampus !== 'Semua') {
      result = result.filter(k => k.campus === selectedCampus);
    }

    // Filter by Price
    result = result.filter(k => {
      const prices = k.roomTypes?.length > 0 ? k.roomTypes.map(r => r.price) : [k.price];
      const minVariantPrice = Math.min(...prices);
      return minVariantPrice <= maxPrice;
    });

    return result;
  }, [searchTerm, typeFilter, selectedCity, selectedCampus, maxPrice, listings]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (typeFilter !== 'Semua') count++;
    if (selectedCity !== 'Semua') count++;
    if (selectedCampus !== 'Semua') count++;
    if (maxPrice < 5000000) count++;
    return count;
  }, [searchTerm, typeFilter, selectedCity, selectedCampus, maxPrice]);

  const resetFilters = () => {
    setSearchTerm('');
    setTypeFilter('Semua');
    setSelectedCity('Semua');
    setSelectedCampus('Semua');
    setMaxPrice(5000000);
  };

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    setSelectedCampus('Semua');
  };

  const handleCampusChange = (campus: string) => {
    setSelectedCampus(campus);
    // Auto-select city if a campus is chosen and city is not already set (or set it anyway to ensure consistency)
    if (campus !== 'Semua') {
      const listingWithCampus = listings.find(k => k.campus === campus);
      if (listingWithCampus && listingWithCampus.city) {
         setSelectedCity(listingWithCampus.city);
      }
    }
  };

  // Render fields as a function called within the component
  const renderFilterControls = () => (
    <div className="space-y-5 lg:space-y-6">
      {/* Pencarian */}
      <div className="space-y-1.5">
        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Pencarian</label>
        <input 
          type="text" 
          placeholder="Nama kost atau daerah..." 
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-gray-900 placeholder:text-gray-400" 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
      </div>

      {/* Tipe Kost */}
      <div className="space-y-1.5">
        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Tipe Kost</label>
        <select 
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 appearance-none text-gray-900 cursor-pointer"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="Semua">Semua Tipe</option>
          <option value="Putra">Kost Putra</option>
          <option value="Putri">Kost Putri</option>
          <option value="Campur">Kost Campur</option>
        </select>
      </div>

      {/* Pilih Kota */}
      <div className="space-y-1.5">
        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Pilih Kota</label>
        <select 
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 appearance-none text-gray-900 cursor-pointer" 
          value={selectedCity} 
          onChange={(e) => handleCityChange(e.target.value)}
        >
          <option value="Semua">Semua Kota</option>
          {availableCities.map(city => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
      </div>

      {/* Pilih Kampus */}
      <div className="space-y-1.5">
        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Pilih Kampus</label>
        <select 
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 appearance-none text-gray-900 disabled:bg-gray-50 disabled:text-gray-400 cursor-pointer"
          value={selectedCampus}
          onChange={(e) => handleCampusChange(e.target.value)}
          disabled={availableCampuses.length === 0}
        >
          <option value="Semua">Semua Kampus</option>
          {availableCampuses.map(campus => (
            <option key={campus} value={campus}>{campus}</option>
          ))}
        </select>
      </div>

      {/* Harga Maksimal Slider */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Harga Maksimal</label>
          <span className="text-orange-600 font-black text-[10px] uppercase">{FORMAT_CURRENCY(maxPrice)}</span>
        </div>
        <input 
          type="range" 
          min="500000" 
          max="5000000" 
          step="100000" 
          className="w-full h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-orange-500" 
          value={maxPrice} 
          onChange={(e) => setMaxPrice(parseInt(e.target.value))} 
        />
        <div className="flex justify-between text-[8px] font-bold text-gray-400 uppercase tracking-widest">
          <span>500rb</span>
          <span>5jt</span>
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

  return (
    <div className="min-h-screen bg-white">
       {/* MOBILE STICKY FILTER BAR */}
      <div className="lg:hidden sticky top-[80px] z-40 bg-white/95 backdrop-blur-md px-4 py-3 border-b border-gray-100 shadow-sm transition-all">
        <button 
          onClick={() => setIsMobileFilterOpen(true)}
          className="w-full bg-white border border-gray-200 rounded-full py-3 px-5 shadow-sm active:scale-[0.98] transition-all flex items-center gap-4"
        >
           <div className="text-orange-500 shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
           </div>
           <div className="text-left flex-1">
               <p className="text-xs font-black uppercase tracking-tight text-gray-900 leading-none mb-1">CARI KOST SEKARANG</p>
               <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none truncate">
                  {activeFilterCount > 0 ? `${activeFilterCount} Filter Aktif` : 'FILTER KOTA & KAMPUS...'}
               </p>
           </div>
           {activeFilterCount > 0 && (
             <div className="bg-orange-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0">
               {activeFilterCount}
             </div>
           )}
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 lg:pt-12 pb-12">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
            
            {/* DESKTOP SIDEBAR FILTER */}
            <aside className="hidden lg:block w-1/4 sticky top-24 z-30">
                <div className="bg-gray-50/50 rounded-[2rem] border border-gray-100 p-6">
                    <div className="mb-6 pb-6 border-b border-gray-100">
                        <h3 className="text-lg font-black uppercase tracking-tight text-gray-900">Filter</h3>
                    </div>
                    {renderFilterControls()}
                </div>
            </aside>

            {/* MOBILE FILTER DRAWER */}
            {isMobileFilterOpen && (
                <div className="lg:hidden fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div 
                    className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300" 
                    onClick={() => setIsMobileFilterOpen(false)}
                    ></div>
                    <div className="relative bg-white w-full sm:max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl p-6 pb-8 animate-in slide-in-from-bottom duration-500 max-h-[85vh] overflow-y-auto">
                        <div className="w-12 h-1.5 bg-gray-100 rounded-full mx-auto mb-6 sm:hidden"></div>
                        
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tight text-gray-900">Filter Pencarian</h2>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Temukan kost impianmu</p>
                            </div>
                            <button onClick={() => setIsMobileFilterOpen(false)} className="p-2 hover:bg-gray-50 rounded-full text-gray-400 transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>

                        {renderFilterControls()}
                    </div>
                </div>
            )}

            {/* RESULTS GRID */}
            <main className="w-full lg:w-3/4">
                <div className="flex justify-between items-end mb-6">
                   <div>
                      <h2 className="text-xl lg:text-3xl font-black text-gray-900 uppercase tracking-tight">Hasil Pencarian</h2>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                          {selectedCity !== 'Semua' ? selectedCity : 'Semua Kota'} 
                          {selectedCampus !== 'Semua' ? ` • ${selectedCampus}` : ''}
                      </p>
                   </div>
                   <span className="bg-gray-900 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg">
                      {filteredKosts.length} Unit
                   </span>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                            <div key={n} className="bg-white rounded-2xl border border-gray-100 overflow-hidden h-full flex flex-col animate-pulse">
                                <div className="bg-gray-200 aspect-[4/3] w-full"></div>
                                <div className="p-5 space-y-3">
                                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                    <div className="h-8 bg-gray-200 rounded w-full mt-4"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredKosts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredKosts.map(kost => (
                            <KostCard key={kost.id} kost={kost} onClick={onKostClick} onDelete={onDelete} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-gray-300">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <p className="text-gray-900 font-black text-sm uppercase tracking-tight">Tidak ada kost ditemukan</p>
                        <p className="text-gray-400 text-xs mt-1">Coba kurangi filter atau cari area lain</p>
                        <button onClick={resetFilters} className="mt-4 text-orange-500 text-xs font-bold uppercase tracking-widest hover:underline">Reset Filter</button>
                    </div>
                )}
            </main>
        </div>
      </div>
    </div>
  );
};

export default Listings;
