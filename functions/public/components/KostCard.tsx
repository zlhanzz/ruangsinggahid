
import React from 'react';
import { Kost } from '../types';
import { FORMAT_CURRENCY } from '../constants';

interface KostCardProps {
  kost: Kost;
  onClick?: (id: string) => void;
  onDelete?: (id: string, type: 'kost' | 'database', name: string) => void;
}

const KostCard: React.FC<KostCardProps> = ({ kost, onClick, onDelete }) => {
  const variantCount = kost.roomTypes?.length || 1;

  // Helper to calculate the best "Effective Monthly Price" for a room
  const getRoomEffectivePrice = (room: any) => {
    const pricing = room.pricing || [];
    
    // 1. Try explicit Monthly
    const monthly = pricing.find((p: any) => p.period === 'bulanan');
    if (monthly) return { price: monthly.price, unit: '/bln', priority: 1 };

    // 2. Try Yearly (divided by 12)
    const yearly = pricing.find((p: any) => p.period === 'tahunan');
    if (yearly) return { price: yearly.price / 12, unit: '/bln', priority: 2 };

    // 3. Try 6 Months (divided by 6)
    const sixMonth = pricing.find((p: any) => p.period === '6bulanan');
    if (sixMonth) return { price: sixMonth.price / 6, unit: '/bln', priority: 3 };

    // 4. Try 3 Months (divided by 3)
    const threeMonth = pricing.find((p: any) => p.period === '3bulanan');
    if (threeMonth) return { price: threeMonth.price / 3, unit: '/bln', priority: 4 };

    // 5. Fallback: Weekly
    const weekly = pricing.find((p: any) => p.period === 'mingguan');
    if (weekly) return { price: weekly.price, unit: '/minggu', priority: 5 };

    // 6. Fallback: Daily
    const daily = pricing.find((p: any) => p.period === 'harian');
    if (daily) return { price: daily.price, unit: '/hari', priority: 6 };

    // 7. Absolute Fallback (Legacy data structure or base price)
    return { price: room.price, unit: '/bln', priority: 7 };
  };

  // Calculate prices across all room types
  let displayPrices: number[] = [];
  let displayUnit = '/bln';

  if (kost.roomTypes && kost.roomTypes.length > 0) {
    // Gather all effective prices
    const effectivePrices = kost.roomTypes.map(getRoomEffectivePrice);
    
    // Check if we have any "monthly-based" prices (priority <= 4)
    const hasMonthlyBased = effectivePrices.some(p => p.priority <= 4);

    if (hasMonthlyBased) {
      // Filter only monthly-based prices to ensure consistency
      displayPrices = effectivePrices
        .filter(p => p.priority <= 4)
        .map(p => p.price);
      displayUnit = '/bln';
    } else {
      // If no monthly options exist at all, take the available ones (likely daily/weekly)
      // We take the unit of the first one for simplicity, or mixed if multiple
      displayPrices = effectivePrices.map(p => p.price);
      displayUnit = effectivePrices[0]?.unit || '/bln';
    }
  } else {
    // Fallback if no roomTypes defined
    displayPrices = [kost.price];
  }

  const minPrice = Math.min(...displayPrices);
  const maxPrice = Math.max(...displayPrices);

  const renderPriceDisplay = () => {
    if (displayPrices.length === 0) return null;

    if (minPrice === maxPrice) {
      return (
        <p className="text-lg font-black text-gray-900 tracking-tighter">
          {FORMAT_CURRENCY(minPrice)}
          <span className="text-[10px] text-gray-400 font-bold uppercase ml-1">{displayUnit}</span>
        </p>
      );
    }
    return (
      <p className="text-base lg:text-lg font-black text-gray-900 tracking-tighter">
        {FORMAT_CURRENCY(minPrice).replace('Rp', '')} - {FORMAT_CURRENCY(maxPrice)}
        <span className="text-[10px] text-gray-400 font-bold uppercase ml-1">{displayUnit}</span>
      </p>
    );
  };

  return (
    <div 
      onClick={() => onClick?.(kost.id)}
      className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col h-full cursor-pointer"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img 
          src={kost.imageUrls[0]} 
          alt={kost.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        
        {/* Top Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <div className="flex gap-2">
            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
              kost.type === 'Putra' ? 'bg-blue-600' : kost.type === 'Putri' ? 'bg-pink-600' : 'bg-purple-600'
            } text-white shadow-lg`}>
              Kost {kost.type}
            </span>
            {variantCount > 1 && (
              <span className="bg-gray-900/80 backdrop-blur-md text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/20">
                {variantCount} Tipe
              </span>
            )}
          </div>
          {kost.isVerified && (
            <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-[9px] font-black flex items-center gap-1 shadow-sm border border-orange-400 uppercase tracking-widest w-fit">
              Verified
            </span>
          )}
        </div>

        {/* Social Media Review Indicators */}
        {(kost.instagramUrl || kost.tiktokUrl) && (
          <div className="absolute bottom-3 right-3 flex gap-2">
            {kost.instagramUrl && (
              <div className="w-6 h-6 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-pink-600 shadow-sm p-1" title="Review Instagram Tersedia">
                 <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </div>
            )}
            {kost.tiktokUrl && (
              <div className="w-6 h-6 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-black shadow-sm p-1" title="Review TikTok Tersedia">
                 <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.13-1.47-.12 3.35-.12 6.7 0 10.05-.1 1.63-.58 3.25-1.55 4.58-1.35 1.83-3.67 2.87-5.91 2.8-2.31-.01-4.6-.96-6.11-2.72-1.78-2.03-2.22-5.06-1.12-7.53.94-2.18 3.09-3.79 5.46-4.06.13 1.34.25 2.68.38 4.02-1.15.11-2.32.55-3.08 1.46-.73.91-.91 2.14-.52 3.24.4 1.15 1.43 2.03 2.62 2.23 1.28.2 2.64-.19 3.52-1.12.82-.9.99-2.19.98-3.37-.02-3.34-.02-6.67-.02-10.01V0c.01.01.01.01 0 .02z"/></svg>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="p-5 flex-grow flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-black text-lg text-gray-900 line-clamp-1 group-hover:text-orange-500 transition-colors uppercase tracking-tight">
            {kost.title}
          </h3>
          <div className="flex items-center text-orange-500 shrink-0">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-sm font-black">{kost.rating}</span>
          </div>
        </div>
        
        <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest mb-4 flex items-center">
          <svg className="w-3 h-3 mr-1.5 text-orange-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
          <span className="line-clamp-1">{kost.address}</span>
        </p>

        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className="text-[8px] font-black uppercase tracking-widest bg-gray-50 text-gray-400 px-2 py-1 rounded border border-gray-100 italic">
            {kost.distanceToCampus}
          </span>
          <span className="text-[8px] font-black uppercase tracking-widest bg-orange-50 text-orange-500 px-2 py-1 rounded border border-orange-100 italic">
            {variantCount} Varian Fasilitas
          </span>
        </div>

        <div className="mt-auto pt-4 border-t border-gray-50 flex items-end justify-between">
          <div>
            <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Range Harga</p>
            {renderPriceDisplay()}
          </div>
          <div className="flex gap-2">
            {onDelete && (
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        // Panggil onDelete dengan nama kost juga
                        onDelete(kost.id, 'kost', kost.title); // Tambahkan kost.title
                    }}
                    className="bg-red-50 text-red-500 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all active:scale-95 border border-red-100"
                >
                    Hapus
                </button>
            )}
            <button className="bg-gray-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-500 transition-all active:scale-95 group-hover:bg-orange-500">
                Detail
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KostCard;
