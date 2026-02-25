
import React, { useState, useEffect } from 'react';
import { FORMAT_CURRENCY } from '../constants';

interface PaymentGatewayProps {
  amount: number;
  orderId: string;
  onPaymentSuccess: () => void;
  onCancel: () => void;
}

type MainMethod = 'qris' | 'va' | 'transfer';

const PaymentGateway: React.FC<PaymentGatewayProps> = ({ amount, orderId, onPaymentSuccess, onCancel }) => {
  const [mainMethod, setMainMethod] = useState<MainMethod | null>(null);
  const [subMethod, setSubMethod] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(3600);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handlePay = () => {
    if (!mainMethod || (mainMethod !== 'qris' && !subMethod)) return;
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onPaymentSuccess();
    }, 2000);
  };

  const vaBanks = [
    { id: 'va_bri', name: 'BRI Virtual Account', icon: '🏦' },
    { id: 'va_bca', name: 'BCA Virtual Account', icon: '🏦' },
    { id: 'va_mandiri', name: 'Mandiri Virtual Account', icon: '🏦' },
    { id: 'va_bsi', name: 'BSI Virtual Account', icon: '🌙' },
  ];

  const manualAccounts = [
    { id: 'trf_bca', name: 'BCA', no: '1234-567-890', owner: 'PT Ruang Singgah Indonesia', icon: '💳' },
    { id: 'trf_bri', name: 'BRI', no: '0987-654-321', owner: 'PT Ruang Singgah Indonesia', icon: '💳' },
    { id: 'trf_dana', name: 'DANA', no: '0812-3456-7890', owner: 'RuangSinggah Official', icon: '📱' },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-0 sm:p-4 overflow-hidden">
      <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-lg" onClick={onCancel}></div>
      
      <div className="relative bg-white w-full h-full sm:h-auto sm:max-w-2xl sm:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-10 duration-500">
        
        {/* Header Mobile Summary */}
        <div className="bg-gray-900 p-6 sm:p-8 text-white">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-orange-500 font-black text-xl">RS</span>
                <span className="font-bold text-[10px] uppercase tracking-widest text-gray-400">Checkout Gateway</span>
              </div>
              <p className="text-xs text-gray-500">Order ID: <span className="text-gray-300 font-bold">#{orderId}</span></p>
            </div>
            <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition-colors sm:hidden">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Total Tagihan</p>
              <p className="text-3xl font-black text-orange-500 tracking-tighter">{FORMAT_CURRENCY(amount)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Bayar Dalam</p>
              <p className="text-lg font-mono font-black text-white">{formatTime(timeLeft)}</p>
            </div>
          </div>
        </div>

        {/* Payment Methods Area */}
        <div className="flex-grow p-6 sm:p-10 overflow-y-auto space-y-6 bg-white">
          <h2 className="text-lg font-black uppercase tracking-tight text-gray-900">Pilih Metode Pembayaran</h2>
          
          {/* 1. QRIS */}
          <div className={`rounded-3xl border-2 transition-all ${mainMethod === 'qris' ? 'border-orange-500 bg-orange-50/30' : 'border-gray-50'}`}>
            <button 
              onClick={() => { setMainMethod('qris'); setSubMethod(null); }}
              className="w-full flex items-center gap-4 p-5"
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${mainMethod === 'qris' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'}`}>📱</div>
              <div className="text-left flex-grow">
                <p className="text-xs font-black uppercase tracking-tight text-gray-900">QRIS (Otomatis)</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Gopay, OVO, Dana, ShopeePay</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${mainMethod === 'qris' ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-200'}`}>
                {mainMethod === 'qris' && <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>}
              </div>
            </button>
            {mainMethod === 'qris' && (
              <div className="px-5 pb-5 animate-in slide-in-from-top-2">
                <div className="bg-white p-6 rounded-2xl border border-orange-100 flex flex-col items-center shadow-inner">
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=RS_BOOKING" className="w-40 h-40 opacity-90" alt="QRIS" />
                  <p className="text-[10px] font-black uppercase text-gray-400 mt-4 tracking-widest">Scan dengan aplikasi e-wallet anda</p>
                </div>
              </div>
            )}
          </div>

          {/* 2. Virtual Account */}
          <div className={`rounded-3xl border-2 transition-all ${mainMethod === 'va' ? 'border-orange-500 bg-orange-50/30' : 'border-gray-50'}`}>
            <button 
              onClick={() => { setMainMethod('va'); setSubMethod(null); }}
              className="w-full flex items-center gap-4 p-5"
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${mainMethod === 'va' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'}`}>🏦</div>
              <div className="text-left flex-grow">
                <p className="text-xs font-black uppercase tracking-tight text-gray-900">Virtual Account</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">BRI, BCA, Mandiri, BSI</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${mainMethod === 'va' ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-200'}`}>
                {mainMethod === 'va' && <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>}
              </div>
            </button>
            {mainMethod === 'va' && (
              <div className="px-5 pb-5 grid grid-cols-1 gap-2 animate-in slide-in-from-top-2">
                {vaBanks.map(bank => (
                  <button 
                    key={bank.id}
                    onClick={() => setSubMethod(bank.id)}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${subMethod === bank.id ? 'bg-white border-orange-500 shadow-sm' : 'bg-white/50 border-gray-100 hover:bg-white'}`}
                  >
                    <span className="text-xs font-bold text-gray-700">{bank.name}</span>
                    <span className="text-xl">{bank.icon}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. Transfer Bank Manual */}
          <div className={`rounded-3xl border-2 transition-all ${mainMethod === 'transfer' ? 'border-orange-500 bg-orange-50/30' : 'border-gray-50'}`}>
            <button 
              onClick={() => { setMainMethod('transfer'); setSubMethod(null); }}
              className="w-full flex items-center gap-4 p-5"
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${mainMethod === 'transfer' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'}`}>📄</div>
              <div className="text-left flex-grow">
                <p className="text-xs font-black uppercase tracking-tight text-gray-900">Transfer Bank Manual</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Verifikasi manual 1x24 jam</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${mainMethod === 'transfer' ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-200'}`}>
                {mainMethod === 'transfer' && <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>}
              </div>
            </button>
            {mainMethod === 'transfer' && (
              <div className="px-5 pb-5 space-y-3 animate-in slide-in-from-top-2">
                {manualAccounts.map(acc => (
                  <button 
                    key={acc.id}
                    onClick={() => setSubMethod(acc.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${subMethod === acc.id ? 'bg-white border-orange-500 shadow-md' : 'bg-white/50 border-gray-100'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{acc.name} Official</span>
                       <span className="text-lg">{acc.icon}</span>
                    </div>
                    <p className="text-sm font-black text-gray-900 tracking-tight">{acc.no}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">{acc.owner}</p>
                    {subMethod === acc.id && (
                      <div className="mt-3 pt-3 border-t border-gray-50">
                        <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest bg-orange-50 px-2 py-1 rounded">Wajib Upload Bukti Transfer</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 sm:p-10 border-t border-gray-50 bg-gray-50/50">
          <button 
            onClick={handlePay}
            disabled={!mainMethod || (mainMethod !== 'qris' && !subMethod) || isProcessing}
            className={`w-full py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95 ${
              (!mainMethod || (mainMethod !== 'qris' && !subMethod)) 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                : isProcessing 
                  ? 'bg-orange-400 text-white' 
                  : 'bg-orange-500 text-white shadow-orange-100 hover:bg-orange-600'
            }`}
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Memverifikasi Dana...
              </>
            ) : (
              'Saya Sudah Bayar'
            )}
          </button>
          <p className="text-center text-[9px] text-gray-400 font-bold uppercase mt-4 tracking-widest">
            Transaksimu di RuangSinggah dijamin aman & terenkripsi
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentGateway;
