
import React, { useState } from 'react';
import { Kost, RoomType, PricingPeriod } from '../types';
import { FORMAT_CURRENCY } from '../constants';

interface BookingModalProps {
  kost: Kost;
  variant: RoomType;
  initialPeriod?: PricingPeriod;
  onClose: () => void;
  onConfirm: (data: any) => void;
}

const BookingModal: React.FC<BookingModalProps> = ({ kost, variant, initialPeriod, onClose, onConfirm }) => {
  // If variant has pricing schemes, use them. Otherwise fallback to monthly logic.
  const hasFlexiblePricing = variant.pricing && variant.pricing.length > 0;
  
  const [selectedPeriod, setSelectedPeriod] = useState<PricingPeriod>(initialPeriod || (hasFlexiblePricing ? variant.pricing![0].period : 'bulanan'));
  const [startDate, setStartDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to map backend periods to display logic
  const periodMapping: Record<string, { label: string, months: number }> = {
      'harian': { label: 'Harian', months: 0 }, // Special handling for days? keeping simple for now
      'mingguan': { label: 'Mingguan', months: 0 },
      'bulanan': { label: 'Bulanan', months: 1 },
      '3bulanan': { label: '3 Bulan', months: 3 },
      '6bulanan': { label: '6 Bulan', months: 6 },
      'tahunan': { label: 'Tahunan', months: 12 },
  };

  const getPrice = (period: PricingPeriod) => {
      if (hasFlexiblePricing) {
          const scheme = variant.pricing?.find(p => p.period === period);
          return scheme ? scheme.price : 0;
      }
      // Fallback legacy calculation if pricing array is missing but we want to simulate standard periods
      const base = variant.price;
      if (period === 'bulanan') return base;
      if (period === '3bulanan') return base * 3 * 0.95; // 5% discount
      if (period === '6bulanan') return base * 6 * 0.90; // 10% discount
      if (period === 'tahunan') return base * 12 * 0.85; // 15% discount
      return 0;
  };

  const currentPrice = getPrice(selectedPeriod);

  const handleBooking = () => {
    if (!startDate) {
      alert('Silakan pilih tanggal masuk terlebih dahulu.');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      onConfirm({
        period: selectedPeriod,
        startDate,
        total: currentPrice,
        variantName: variant.name
      });
      setIsSubmitting(false);
    }, 1500);
  };

  // Determine which options to show
  const availableOptions = hasFlexiblePricing 
    ? variant.pricing!.map(p => p.period)
    : ['bulanan', '3bulanan', '6bulanan', 'tahunan']; // Default legacy options

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-gray-50 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight leading-none mb-1">Konfirmasi Booking</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{kost.title} • {variant.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
          {/* Durasi Sewa */}
          <div className="space-y-4">
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Pilih Paket Sewa</label>
            <div className="grid grid-cols-2 gap-3">
              {availableOptions.map((periodKey) => {
                  const pKey = periodKey as PricingPeriod;
                  const price = getPrice(pKey);
                  return (
                    <button
                    key={pKey}
                    onClick={() => setSelectedPeriod(pKey)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all relative ${
                        selectedPeriod === pKey 
                        ? 'border-orange-500 bg-orange-50 shadow-lg shadow-orange-100' 
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                    >
                    <p className={`text-sm font-black uppercase tracking-tight ${selectedPeriod === pKey ? 'text-orange-600' : 'text-gray-900'}`}>
                        {periodMapping[pKey]?.label || pKey}
                    </p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{FORMAT_CURRENCY(price)}</p>
                    </button>
                  );
              })}
            </div>
          </div>

          {/* Tanggal Masuk */}
          <div className="space-y-4">
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Pilih Tanggal Masuk</label>
            <div className="relative">
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all appearance-none"
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
            </div>
            <p className="text-[10px] text-orange-500 font-bold italic">*Pastikan tanggal masuk sesuai dengan kesiapan Anda.</p>
          </div>

          {/* Rincian Harga */}
          <div className="bg-gray-50 rounded-[2rem] p-6 space-y-3">
            <div className="flex justify-between items-center text-sm font-medium text-gray-500">
              <span>Paket Sewa</span>
              <span className="font-bold text-gray-900">{periodMapping[selectedPeriod]?.label || selectedPeriod}</span>
            </div>
            <div className="h-px bg-gray-200 my-2"></div>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Total Pembayaran</p>
                <p className="text-2xl font-black text-gray-900 tracking-tighter">{FORMAT_CURRENCY(currentPrice)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none">Status</p>
                <p className="text-[10px] text-orange-500 font-black uppercase tracking-widest">Menunggu Konfirmasi</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 bg-gray-50/50 border-t border-gray-50">
          <button 
            onClick={handleBooking}
            disabled={isSubmitting}
            className={`w-full bg-orange-500 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-orange-100 flex items-center justify-center gap-3 transition-all active:scale-95 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-orange-600'}`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Memproses...
              </>
            ) : (
              'Konfirmasi & Booking Sekarang'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingModal;
