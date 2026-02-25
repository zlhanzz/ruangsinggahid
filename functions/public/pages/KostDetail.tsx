
import React, { useState, useEffect } from 'react';
import { Kost, RoomType, PricingPeriod } from '../types';
import { FORMAT_CURRENCY } from '../constants';
import BookingModal from '../components/BookingModal';
import PaymentGateway from '../components/PaymentGateway';

interface KostDetailProps {
  kost: Kost;
  onBack: () => void;
  onStartChat?: (id: string) => void;
  user?: any;
  onLoginRedirect?: () => void;
  validateProfile?: () => boolean; 
}

const InfoSection: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean; className?: string }> = ({ title, children, defaultOpen = true, className = "" }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`bg-white lg:bg-transparent rounded-3xl lg:rounded-none overflow-hidden ${className}`}>
      <div 
        onClick={() => { if (window.innerWidth < 1024) setIsOpen(!isOpen); }}
        className="w-full flex items-center justify-between py-5 lg:py-0 lg:mb-6 cursor-pointer lg:cursor-default group px-6 lg:px-0 border-b lg:border-0 border-gray-50"
      >
        <h3 className="text-lg lg:text-xl font-black text-gray-900 uppercase tracking-tight group-hover:text-orange-500 lg:group-hover:text-gray-900 transition-colors">
          {title}
        </h3>
        <div className={`lg:hidden p-2 rounded-full transition-all duration-300 ${isOpen ? 'bg-orange-500 text-white rotate-180' : 'bg-gray-50 text-gray-400'}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      <div className={`transition-all duration-500 ease-in-out overflow-hidden lg:max-h-none lg:opacity-100 lg:block ${isOpen ? 'max-h-[2000px] opacity-100 pb-8 px-6 lg:px-0' : 'max-h-0 opacity-0'}`}>
        {children}
      </div>
    </div>
  );
};

const KostDetail: React.FC<KostDetailProps> = ({ kost, onBack, onStartChat, user, onLoginRedirect, validateProfile }) => {
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<PricingPeriod>('bulanan');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isPaymentGatewayOpen, setIsPaymentGatewayOpen] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [tempBookingData, setTempBookingData] = useState<any>(null);
  
  const defaultRoom: RoomType = {
      name: 'Standard Room',
      size: '3x3',
      price: kost.price,
      pricing: [{ period: 'bulanan', price: kost.price }],
      features: [],
      roomFacilities: ['Kasur', 'Lemari'],
      bathroomFacilities: [],
      isAvailable: true
  };
  
  const selectedRoom = (kost.roomTypes && kost.roomTypes.length > 0) 
    ? kost.roomTypes[selectedVariantIdx] 
    : defaultRoom;

  // Auto-select the first available pricing period when room type changes
  useEffect(() => {
      if (selectedRoom.pricing && selectedRoom.pricing.length > 0) {
          // Prefer monthly if available, otherwise first available
          const hasMonthly = selectedRoom.pricing.find(p => p.period === 'bulanan');
          if (hasMonthly) {
              setSelectedPeriod('bulanan');
          } else {
              setSelectedPeriod(selectedRoom.pricing[0].period);
          }
      } else {
          // Fallback for legacy data
          setSelectedPeriod('bulanan');
      }
  }, [selectedVariantIdx, selectedRoom]);

  const imageUrls = kost.imageUrls || [];
  const nextPhoto = () => setCurrentPhoto((prev) => (prev + 1) % (imageUrls.length || 1));
  const prevPhoto = () => setCurrentPhoto((prev) => (prev - 1 + (imageUrls.length || 1)) % (imageUrls.length || 1));

  const handleBookingClick = () => {
    if (!selectedRoom.isAvailable) {
        alert("Mohon maaf, tipe kamar ini sedang penuh.");
        return;
    }

    if (!user) {
        if (confirm("Anda harus login untuk melakukan booking. Login sekarang?")) {
            onLoginRedirect?.();
        }
        return;
    }

    if (validateProfile) {
      const isValid = validateProfile();
      if (!isValid) return; 
    }

    setIsBookingModalOpen(true);
  };

  const handleConfirmBooking = (data: any) => {
    setTempBookingData(data);
    setIsBookingModalOpen(false);
    setIsPaymentGatewayOpen(true);
  };

  const handlePaymentSuccess = () => {
    setIsPaymentGatewayOpen(false);
    setBookingSuccess(true);
    console.log('Payment Success for Booking:', { ...tempBookingData, kostId: kost.id });
  };

  const getPriceForPeriod = (period: string) => {
      const scheme = selectedRoom.pricing?.find(p => p.period === period);
      return scheme ? scheme.price : (period === 'bulanan' ? selectedRoom.price : 0);
  };

  const activePrice = getPriceForPeriod(selectedPeriod);

  // Check if location data is valid (non-zero coordinates)
  const hasValidLocation = kost.location && (kost.location.lat !== 0 || kost.location.lng !== 0);
  const hasDistance = !!kost.distanceToCampus;

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${kost.location?.lat || 0},${kost.location?.lng || 0}`;
  const embedMapsUrl = `https://maps.google.com/maps?q=${kost.location?.lat || 0},${kost.location?.lng || 0}&z=16&output=embed`;

  const periodLabels: Record<string, string> = {
      'harian': 'Per Hari',
      'mingguan': 'Per Minggu',
      'bulanan': 'Per Bulan',
      '3bulanan': 'Per 3 Bulan',
      '6bulanan': 'Per 6 Bulan',
      'tahunan': 'Per Tahun'
  };

  // Helper to calculate discount percentage
  const calculateDiscount = (scheme: { period: PricingPeriod; price: number }) => {
    // Determine base monthly price (prioritize explicit 'bulanan', else fallback)
    const monthlyScheme = selectedRoom.pricing?.find(p => p.period === 'bulanan');
    const baseMonthlyPrice = monthlyScheme ? monthlyScheme.price : selectedRoom.price;

    let durationInMonths = 0;
    if (scheme.period === '3bulanan') durationInMonths = 3;
    if (scheme.period === '6bulanan') durationInMonths = 6;
    if (scheme.period === 'tahunan') durationInMonths = 12;

    if (durationInMonths > 1) {
       const standardPrice = baseMonthlyPrice * durationInMonths;
       if (scheme.price < standardPrice) {
           const saving = standardPrice - scheme.price;
           const percent = Math.round((saving / standardPrice) * 100);
           return percent > 0 ? percent : 0;
       }
    }
    return 0;
  };

  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
          <div className="relative">
            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-green-50 relative z-10">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            </div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-green-50 rounded-full animate-ping opacity-20"></div>
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight mb-4">Pembayaran Berhasil!</h2>
            <p className="text-gray-500 font-medium">Kost Anda telah ter-booking dengan aman. Silakan hubungi pemilik untuk koordinasi masuk.</p>
          </div>
          <div className="flex flex-col gap-4">
            <button onClick={() => window.location.reload()} className="bg-orange-500 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-orange-100 active:scale-95 transition-all">Selesaikan & Kembali</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50/30 min-h-screen pb-24 lg:pb-20">
      {/* Mobile Sticky Header */}
      <div className="lg:hidden sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-4 flex items-center justify-between">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
        </button>
        <span className="font-bold text-gray-900 truncate max-w-[200px] uppercase tracking-tight text-xs">{kost.title}</span>
        <button onClick={() => onStartChat?.(kost.id)} className="text-orange-500 font-black text-sm uppercase tracking-widest">Tanya</button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-12">
        {/* Breadcrumb Desktop */}
        <div className="hidden lg:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-8">
          <button onClick={onBack} className="hover:text-orange-500 transition-colors">Semua Listing</button>
          <span>/</span>
          <span className="text-gray-900">{kost.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          <div className="lg:col-span-2 space-y-8 lg:space-y-12">
            {/* Gallery Section */}
            <div>
              <div className="relative group aspect-square lg:aspect-video rounded-3xl lg:rounded-[3rem] overflow-hidden shadow-2xl bg-gray-100 border border-gray-100 mb-4">
                <div className="absolute inset-0 flex transition-transform duration-700 ease-out" style={{ transform: `translateX(-${currentPhoto * 100}%)` }}>
                  {imageUrls.map((img, idx) => (
                    <img key={idx} src={img} className="w-full h-full object-cover shrink-0" alt={`Slide ${idx}`} />
                  ))}
                </div>
                <div className="absolute inset-0 flex items-center justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={prevPhoto} className="p-3 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white hover:text-orange-500 transition-all border border-white/20">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7"/></svg>
                  </button>
                  <button onClick={nextPhoto} className="p-3 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white hover:text-orange-500 transition-all border border-white/20">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7"/></svg>
                  </button>
                </div>
                <div className="absolute bottom-6 right-6 bg-black/40 backdrop-blur-md text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
                  {currentPhoto + 1} / {imageUrls.length} FOTO
                </div>
              </div>

              {/* Thumbnails Strip */}
              {imageUrls.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2 px-1 scrollbar-hide">
                  {imageUrls.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPhoto(idx)}
                      className={`relative w-20 h-20 lg:w-24 lg:h-24 shrink-0 rounded-2xl overflow-hidden transition-all duration-300 ${
                        currentPhoto === idx 
                          ? 'ring-2 ring-orange-500 ring-offset-2 opacity-100 scale-95' 
                          : 'opacity-50 hover:opacity-100 hover:scale-105'
                      }`}
                    >
                      <img src={img} className="w-full h-full object-cover" alt={`Thumbnail ${idx + 1}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Social Media Review Section */}
            {(kost.instagramUrl || kost.tiktokUrl) && (
                <div className="flex flex-col sm:flex-row gap-4">
                    {kost.instagramUrl && (
                        <a href={kost.instagramUrl} target="_blank" rel="noopener noreferrer" className="flex-1 bg-gradient-to-r from-pink-500 via-purple-500 to-orange-500 text-white p-4 rounded-2xl flex items-center justify-center gap-3 hover:opacity-90 transition-opacity shadow-lg shadow-pink-100">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M7.8 2H16.2C19.4 2 22 4.6 22 7.8V16.2C22 19.4 19.4 22 16.2 22H7.8C4.6 22 2 19.4 2 16.2V7.8C2 4.6 4.6 2 7.8 2M7.6 4C5.6 4 4 5.6 4 7.6V16.4C4 18.4 5.6 20 7.6 20H16.4C18.4 20 20 18.4 20 16.4V7.6C20 5.6 18.4 4 16.4 4H7.6M17.25 5.5C17.94 5.5 18.5 6.06 18.5 6.75C18.5 7.44 17.94 8 17.25 8C16.56 8 16 7.44 16 6.75C16 6.06 16.56 5.5 17.25 5.5M12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7M12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z"/></svg>
                            <span className="font-bold text-xs uppercase tracking-widest">Tonton Review di Instagram</span>
                        </a>
                    )}
                    {kost.tiktokUrl && (
                        <a href={kost.tiktokUrl} target="_blank" rel="noopener noreferrer" className="flex-1 bg-black text-white p-4 rounded-2xl flex items-center justify-center gap-3 hover:opacity-80 transition-opacity shadow-lg shadow-gray-200">
                             <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.13-1.47-.12 3.35-.12 6.7 0 10.05-.1 1.63-.58 3.25-1.55 4.58-1.35 1.83-3.67 2.87-5.91 2.8-2.31-.01-4.6-.96-6.11-2.72-1.78-2.03-2.22-5.06-1.12-7.53.94-2.18 3.09-3.79 5.46-4.06.13 1.34.25 2.68.38 4.02-1.15.11-2.32.55-3.08 1.46-.73.91-.91 2.14-.52 3.24.4 1.15 1.43 2.03 2.62 2.23 1.28.2 2.64-.19 3.52-1.12.82-.9.99-2.19.98-3.37-.02-3.34-.02-6.67-.02-10.01V0c.01.01.01.01 0 .02z"/></svg>
                             <span className="font-bold text-xs uppercase tracking-widest">Tonton Review di TikTok</span>
                        </a>
                    )}
                </div>
            )}

            {/* Video Tour Section */}
            {kost.videoUrls && kost.videoUrls.length > 0 && (
                <div className="bg-black rounded-[2rem] p-4 lg:p-6 border border-gray-900 shadow-sm overflow-hidden">
                    <h3 className="text-white text-lg font-black uppercase tracking-tight mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Video Tour
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {kost.videoUrls.map((url, idx) => (
                            <video 
                                key={idx} 
                                src={url} 
                                controls 
                                className="w-full aspect-video rounded-xl object-cover bg-gray-800"
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Main Header Information */}
            <div className="bg-white rounded-[2rem] p-8 lg:p-10 border border-gray-100 shadow-sm">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  kost.type === 'Putra' ? 'bg-blue-500 text-white' : 
                  kost.type === 'Putri' ? 'bg-pink-500 text-white' : 
                  'bg-purple-500 text-white'
                }`}>{kost.type}</span>
                {kost.isVerified && (
                  <span className="bg-orange-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black flex items-center gap-2 border border-orange-400 shadow-lg shadow-orange-100 uppercase tracking-widest">
                    Terverifikasi
                  </span>
                )}
              </div>
              <h1 className="text-3xl lg:text-6xl font-black text-gray-900 mb-4 uppercase tracking-tighter leading-none">{kost.title}</h1>
              <div className="flex items-center text-gray-500 font-medium text-sm lg:text-lg">
                <svg className="w-5 h-5 mr-2 text-orange-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span>{kost.address}, {kost.city}</span>
              </div>
            </div>

            {kost.description && (
              <InfoSection title="Deskripsi Lengkap">
                <p className="text-gray-600 leading-relaxed whitespace-pre-line text-sm lg:text-base">{kost.description}</p>
              </InfoSection>
            )}

            {kost.facilities && kost.facilities.length > 0 && (
              <InfoSection title="Fasilitas Umum">
                <div className="flex flex-wrap gap-3">
                  {kost.facilities.map((facility, index) => (
                    <span key={index} className="bg-gray-50 text-gray-600 px-5 py-3 rounded-2xl text-xs font-bold border border-gray-100 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                      {facility}
                    </span>
                  ))}
                </div>
              </InfoSection>
            )}

            {kost.rules && kost.rules.length > 0 && (
              <InfoSection title="Peraturan Kost">
                <ul className="space-y-4">
                  {kost.rules.map((rule, index) => (
                    <li key={index} className="flex items-start text-gray-600 text-sm">
                      <svg className="w-5 h-5 text-red-500 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      {rule}
                    </li>
                  ))}
                </ul>
              </InfoSection>
            )}

            {(hasValidLocation || hasDistance) && (
                <InfoSection title="Lokasi & Lingkungan">
                   <div className="space-y-6">
                     {hasValidLocation && (
                         <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
                            <iframe 
                              title="Kost Location"
                              width="100%" 
                              height="200" 
                              style={{ border: 0 }}
                              loading="lazy" 
                              allowFullScreen 
                              src={embedMapsUrl}
                            ></iframe>
                         </div>
                     )}
                     <div className="flex flex-col sm:flex-row gap-4">
                       {hasValidLocation && (
                           <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="flex-1 bg-white border border-gray-200 text-gray-900 py-4 rounded-2xl font-bold text-center hover:bg-gray-50 transition-colors shadow-sm text-sm uppercase tracking-widest flex items-center justify-center gap-2">
                             <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                             Buka Google Maps
                           </a>
                       )}
                       {hasDistance && (
                           <div className="flex-1 bg-orange-50 border border-orange-100 text-orange-700 py-4 rounded-2xl font-bold text-center flex flex-col items-center justify-center">
                             <span className="text-[9px] uppercase tracking-widest opacity-70 mb-1">Jarak ke Kampus</span>
                             <span className="text-sm">{kost.distanceToCampus}</span>
                           </div>
                       )}
                     </div>
                   </div>
                </InfoSection>
            )}
            
          </div>

          {/* Right Sidebar - Booking Card */}
          <div className="relative">
            <div className="sticky top-24 space-y-6">
              <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl shadow-gray-100/50">
                <div className="mb-6">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">Harga Sewa</p>
                  <div className="flex flex-col">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-gray-900 tracking-tighter">{FORMAT_CURRENCY(activePrice)}</span>
                      <span className="text-xs font-bold text-gray-400">/{selectedPeriod.replace('bulanan', 'bulan').replace('harian', 'hari').replace('mingguan', 'minggu').replace('tahunan', 'tahun')}</span>
                    </div>
                    {/* Dynamic Discount Badge in Header if current period is selected */}
                    {selectedRoom.pricing?.map(p => {
                       if(p.period === selectedPeriod) {
                          const discount = calculateDiscount(p);
                          if(discount > 0) {
                              return (
                                 <div key={p.period} className="mt-2">
                                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                        Hemat {discount}%
                                    </span>
                                 </div>
                              )
                          }
                       }
                       return null;
                    })}
                  </div>
                </div>

                {/* Variant Selector with integrated availability and specs */}
                {kost.roomTypes && kost.roomTypes.length > 0 && (
                  <div className="mb-6">
                     <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Pilih Tipe Kamar</label>
                     <div className="space-y-3">
                       {kost.roomTypes.map((type, idx) => {
                         const isAvailable = type.isAvailable !== false;
                         return (
                           <div 
                             key={idx}
                             onClick={() => setSelectedVariantIdx(idx)}
                             className={`p-4 rounded-2xl border-2 cursor-pointer transition-all relative ${selectedVariantIdx === idx ? 'border-orange-500 bg-orange-50/50' : 'border-gray-100 hover:border-gray-200'}`}
                           >
                              <div className="flex justify-between items-start mb-1">
                                 <span className="text-xs font-black uppercase tracking-tight text-gray-900">{type.name}</span>
                                 {/* Availability Badge moved here */}
                                 <div className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-green-600' : 'bg-red-600'}`}></div>
                                    {isAvailable ? 'Tersedia' : 'Penuh'}
                                 </div>
                              </div>
                              
                              {/* Price */}
                              <p className="text-xs font-medium text-gray-500 mb-2">
                                  Mulai {FORMAT_CURRENCY(type.pricing?.find(p => p.period === 'bulanan')?.price || type.pricing?.[0]?.price || type.price)}
                              </p>

                              {/* Specs/Features moved below price */}
                              <div className="flex flex-wrap gap-1.5">
                                <span className="text-[9px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200">
                                    {type.size}
                                </span>
                                {type.roomFacilities?.slice(0, 2).map((fac, fIdx) => (
                                    <span key={fIdx} className="text-[9px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 truncate max-w-[120px]">
                                        {fac}
                                    </span>
                                ))}
                              </div>
                           </div>
                         );
                       })}
                     </div>
                  </div>
                )}

                {/* Pricing Period Selector (Only if room has multiple pricing options) */}
                {selectedRoom.pricing && selectedRoom.pricing.length > 0 && (
                    <div className="mb-6">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Pilih Durasi Sewa</label>
                        <div className="flex flex-wrap gap-2">
                            {selectedRoom.pricing.map((scheme) => {
                                const discount = calculateDiscount(scheme);
                                return (
                                  <button
                                      key={scheme.period}
                                      onClick={() => setSelectedPeriod(scheme.period)}
                                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all relative ${
                                          selectedPeriod === scheme.period 
                                          ? 'bg-gray-900 text-white border-gray-900' 
                                          : 'bg-white text-gray-500 border-gray-200 hover:border-orange-500'
                                      }`}
                                  >
                                      {periodLabels[scheme.period] || scheme.period}
                                      {discount > 0 && (
                                         <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[8px] px-1.5 rounded-full z-10">
                                            -{discount}%
                                         </span>
                                      )}
                                  </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Facilities of Selected Room */}
                <div className="mb-8 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Fasilitas {selectedRoom.name}</p>
                    <ul className="space-y-2">
                        {selectedRoom.roomFacilities?.map((f, i) => (
                             <li key={i} className="text-xs font-bold text-gray-600 flex items-center gap-2">
                                <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                {f}
                             </li>
                        ))}
                         {selectedRoom.bathroomFacilities?.map((f, i) => (
                             <li key={`bath-${i}`} className="text-xs font-bold text-gray-600 flex items-center gap-2">
                                <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                {f}
                             </li>
                        ))}
                    </ul>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={handleBookingClick}
                    disabled={selectedRoom.isAvailable === false}
                    className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95 ${
                        selectedRoom.isAvailable === false
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                        : 'bg-orange-500 text-white shadow-orange-100 hover:bg-orange-600'
                    }`}
                  >
                    {selectedRoom.isAvailable === false ? 'Kamar Penuh' : `Ajukan Sewa (${periodLabels[selectedPeriod] || selectedPeriod})`}
                  </button>
                  <button 
                    onClick={() => onStartChat?.(kost.id)}
                    className="w-full bg-white text-gray-900 border-2 border-gray-100 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:border-gray-900 transition-all active:scale-95"
                  >
                    Chat Pemilik
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {isBookingModalOpen && (
        <BookingModal 
          kost={kost} 
          variant={selectedRoom} 
          initialPeriod={selectedPeriod}
          onClose={() => setIsBookingModalOpen(false)} 
          onConfirm={handleConfirmBooking}
        />
      )}

      {isPaymentGatewayOpen && tempBookingData && (
        <PaymentGateway 
          amount={tempBookingData.total}
          orderId={`BOOK-${kost.id.substring(0,4).toUpperCase()}-${Date.now().toString().substring(8)}`}
          onPaymentSuccess={handlePaymentSuccess}
          onCancel={() => setIsPaymentGatewayOpen(false)}
        />
      )}
    </div>
  );
};

export default KostDetail;
