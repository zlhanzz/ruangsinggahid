import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { ArrowLeft, Clock, MapPin, Receipt, Upload, Plus, MessageSquare, AlertCircle, FileText, X } from 'lucide-react';
import { Page } from '../types';

interface MyKostProps {
    user: any;
    onPageChange: (page: Page) => void;
}

const MyKost: React.FC<MyKostProps> = ({ user, onPageChange }) => {
    const [loading, setLoading] = useState(true);
    const [activeKosts, setActiveKosts] = useState<any[]>([]);

    // Modal states
    const [showExtensionModal, setShowExtensionModal] = useState(false);
    const [showExtraBillModal, setShowExtraBillModal] = useState(false);
    const [showComplaintModal, setShowComplaintModal] = useState(false);
    const [selectedKost, setSelectedKost] = useState<any>(null);

    // Extension form state
    const [extensionPeriod, setExtensionPeriod] = useState(1);
    const [extensionProof, setExtensionProof] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Extra bill form state
    const [billName, setBillName] = useState('');
    const [billAmount, setBillAmount] = useState('');
    const [billProof, setBillProof] = useState<File | null>(null);

    // Complaint form state
    const [complaintTitle, setComplaintTitle] = useState('');
    const [complaintDesc, setComplaintDesc] = useState('');
    const [complaintPhoto, setComplaintPhoto] = useState<File | null>(null);

    useEffect(() => {
        if (user) {
            fetchMyKosts();
        }
    }, [user]);

    const fetchMyKosts = async () => {
        setLoading(true);
        try {
            const q = query(
                collection(db, 'transactions'),
                where('userId', '==', user.uid),
                where('status', 'in', ['approved']) // Only show approved rent
            );

            const querySnapshot = await getDocs(q);
            const kostsData: any[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                // Since one user might have multiple extensions, we should group by kostId.
                // For simplicity, we just filter transactions that are explicitly "sewa_kost" core bookings.
                if (data.type === 'sewa_kost' || !data.type) {
                    kostsData.push({ id: doc.id, ...data });
                }
            });

            setActiveKosts(kostsData);
        } catch (error) {
            console.error('Error fetching my kosts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenExtension = (kost: any) => {
        setSelectedKost(kost);
        setShowExtensionModal(true);
    };

    const handleOpenBill = (kost: any) => {
        setSelectedKost(kost);
        setShowExtraBillModal(true);
    };

    const handleOpenComplaint = (kost: any) => {
        setSelectedKost(kost);
        setShowComplaintModal(true);
    };

    const submitExtension = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!extensionProof || !selectedKost) return;
        setIsSubmitting(true);
        try {
            // Upload proof
            const storageRef = ref(storage, `receipts/extensions/${user.uid}/${Date.now()}_${extensionProof.name}`);
            await uploadBytes(storageRef, extensionProof);
            const downloadURL = await getDownloadURL(storageRef);

            // Create extension transaction
            const basePrice = selectedKost.totalPrice / (selectedKost.duration || 1); // rough estimate of monthly base
            const extPrice = basePrice * extensionPeriod;

            const payload = {
                type: 'perpanjangan_sewa',
                kostId: selectedKost.kostId,
                kostName: selectedKost.kostName,
                tenantName: user.name || user.displayName || 'Penyewa',
                userId: user.uid,
                userEmail: user.email,
                duration: extensionPeriod,
                period: 'bulanan', // assume monthly extensions for now
                roomType: selectedKost.roomType || '-',
                totalPrice: extPrice,
                receiptUrl: downloadURL,
                status: 'pending',
                createdAt: serverTimestamp(),
                proofAt: serverTimestamp(),
                originalTransactionId: selectedKost.id
            };

            await addDoc(collection(db, 'transactions'), payload);
            alert('Pengajuan perpanjangan sewa berhasil dikirim dan menunggu verifikasi Admin.');
            setShowExtensionModal(false);
            setExtensionProof(null);
        } catch (err) {
            console.error(err);
            alert('Terjadi kesalahan saat mengunggah.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const submitExtraBill = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!billProof || !selectedKost || !billName || !billAmount) return;
        setIsSubmitting(true);
        try {
            const storageRef = ref(storage, `receipts/bills/${user.uid}/${Date.now()}_${billProof.name}`);
            await uploadBytes(storageRef, billProof);
            const downloadURL = await getDownloadURL(storageRef);

            const payload = {
                type: 'tagihan_ekstra',
                kostId: selectedKost.kostId,
                kostName: selectedKost.kostName,
                userId: user.uid,
                tenantName: user.name || user.displayName || 'Penyewa',
                billName: billName,
                totalPrice: parseInt(billAmount.replace(/\\D/g, '') || '0'),
                receiptUrl: downloadURL,
                status: 'pending',
                createdAt: serverTimestamp(),
                originalTransactionId: selectedKost.id
            };

            await addDoc(collection(db, 'transactions'), payload);
            alert('Pembayaran tagihan ekstra berhasil dikirim dan menunggu verifikasi.');
            setShowExtraBillModal(false);
            setBillProof(null);
            setBillName('');
            setBillAmount('');
        } catch (err) {
            console.error(err);
            alert('Terjadi kesalahan saat memproses tagihan.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const submitComplaint = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedKost || !complaintTitle || !complaintDesc) return;
        setIsSubmitting(true);

        let photoUrl = '';
        try {
            if (complaintPhoto) {
                const storageRef = ref(storage, `complaints/${user.uid}/${Date.now()}_${complaintPhoto.name}`);
                await uploadBytes(storageRef, complaintPhoto);
                photoUrl = await getDownloadURL(storageRef);
            }

            await addDoc(collection(db, 'complaints'), {
                kostId: selectedKost.kostId,
                kostName: selectedKost.kostName,
                userId: user.uid,
                userName: user.name || user.displayName || 'Penyewa',
                userPhone: user.phone || user.phoneNumber || '-',
                title: complaintTitle,
                description: complaintDesc,
                photoUrl: photoUrl,
                status: 'open',
                createdAt: serverTimestamp()
            });

            alert('Komplain berhasil dikirim. Pemilik kost dan admin akan segera dihubungi.');
            setShowComplaintModal(false);
            setComplaintPhoto(null);
            setComplaintTitle('');
            setComplaintDesc('');
        } catch (err) {
            console.error(err);
            alert('Terjadi kesalahan saat mengirim komplain.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-20 pb-12">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => onPageChange(Page.HOME)}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Kost Saya</h1>
                        <p className="text-gray-500 text-sm mt-1">Kelola kos yang sedang Anda sewa saat ini</p>
                    </div>
                </div>

                {activeKosts.length === 0 ? (
                    <div className="bg-white rounded-[2rem] p-12 text-center border border-gray-100 shadow-sm flex flex-col items-center justify-center">
                        <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mb-6">
                            <AlertCircle className="w-12 h-12 text-orange-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Belum Ada Kost Aktif</h3>
                        <p className="text-gray-500 max-w-md mx-auto mb-8">
                            Anda belum memiliki kost yang berstatus disewa atau sedang dalam proses penyewaan aktif. Mulai cari hunian impian Anda sekarang!
                        </p>
                        <button
                            onClick={() => onPageChange(Page.LISTINGS)}
                            className="bg-orange-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200"
                        >
                            Cari Kost Baru
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {activeKosts.map((kost) => (
                            <div key={kost.id} className="bg-white rounded-2xl sm:rounded-[2rem] p-5 sm:p-8 border border-gray-100 shadow-sm flex flex-col lg:flex-row gap-6 lg:gap-10">
                                {/* Visual / Info Kiri */}
                                <div className="flex-1">
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-orange-100 rounded-2xl flex items-center justify-center shrink-0">
                                            <MapPin className="w-8 h-8 text-orange-500" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                                                {kost.kostName || 'Kost Tanpa Nama'}
                                            </h2>
                                            <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-gray-500 font-medium">
                                                <span className="bg-gray-100 px-3 py-1 rounded-full text-gray-700">
                                                    {kost.roomType || 'Tipe Kamar Default'}
                                                </span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1 text-green-600 bg-green-50 px-3 py-1 rounded-full">
                                                    <CheckCircleIcon className="w-4 h-4" /> Sedang Disewa
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Riwayat Sewa Singkat */}
                                    <div className="bg-gray-50 rounded-xl p-4 sm:p-5 border border-gray-200 grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Durasi Sewa</p>
                                            <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                                                <Clock className="w-4 h-4 text-orange-500" /> {kost.duration || 1} {kost.period || 'Bulan'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Mulai Masuk</p>
                                            <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                                                <FileText className="w-4 h-4 text-blue-500" /> {kost.moveInDate || '-'}
                                            </p>
                                        </div>
                                        <div className="col-span-2 mt-2">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Total Biaya Awal</p>
                                            <p className="text-lg font-black text-gray-900">
                                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(kost.totalPrice || 0)}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Kanan */}
                                <div className="flex flex-col gap-3 lg:w-64 shrink-0 justify-center">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center mb-1">Menu Layanan Kost</p>

                                    <button
                                        onClick={() => handleOpenExtension(kost)}
                                        className="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors text-sm shadow-md"
                                    >
                                        <Plus className="w-4 h-4" /> Perpanjang Sewa
                                    </button>

                                    <button
                                        onClick={() => handleOpenBill(kost)}
                                        className="w-full bg-white border border-gray-300 hover:border-blue-500 hover:text-blue-600 text-gray-700 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors text-sm"
                                    >
                                        <Receipt className="w-4 h-4" /> Bayar Tagihan Tambahan
                                    </button>

                                    <button
                                        onClick={() => handleOpenComplaint(kost)}
                                        className="w-full bg-white border border-gray-300 hover:border-red-500 hover:text-red-600 text-gray-700 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors text-sm"
                                    >
                                        <MessageSquare className="w-4 h-4" /> Ajukan Komplain
                                    </button>

                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* --- MODALS OVERLAY --- */}

            {/* 1. Modal Perpanjangan Sewa */}
            {showExtensionModal && selectedKost && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-3xl w-full max-w-md my-auto relative shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-orange-500 p-6 text-white">
                            <button onClick={() => setShowExtensionModal(false)} className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/10 hover:bg-black/20 rounded-full p-2 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                    <Clock className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-xl font-bold">Perpanjang Sewa</h3>
                            </div>
                            <p className="text-orange-100 text-sm">Masukan detail perpanjangan bulan untuk kost {selectedKost.kostName}.</p>
                        </div>

                        <form onSubmit={submitExtension} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Periode Perpanjangan (Bulan)</label>
                                    <div className="mt-2 flex items-center border border-gray-200 rounded-xl overflow-hidden">
                                        <button type="button" onClick={() => setExtensionPeriod(Math.max(1, extensionPeriod - 1))} className="px-5 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold border-r border-gray-200">-</button>
                                        <input type="number" readOnly value={extensionPeriod} className="w-full text-center py-3 font-black text-lg focus:outline-none bg-white" />
                                        <button type="button" onClick={() => setExtensionPeriod(extensionPeriod + 1)} className="px-5 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold border-l border-gray-200">+</button>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Bukti Pembayaran / Transfer</label>
                                    <div className="mt-2 text-center text-sm text-gray-500 mb-2 bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                        <span className="text-left text-blue-800 text-xs">Mohon transfer senilai <b>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format((selectedKost.totalPrice / (selectedKost.duration || 1)) * extensionPeriod)}</b> ke rekening pemilik untuk diverifikasi admin.</span>
                                    </div>
                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 hover:border-orange-500 transition-colors">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                            <p className="text-sm font-bold text-gray-600">
                                                {extensionProof ? extensionProof.name : "Pilih File Bukti (JPG/PNG)"}
                                            </p>
                                        </div>
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => setExtensionProof(e.target.files?.[0] || null)} required />
                                    </label>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-100 flex gap-3">
                                <button type="button" onClick={() => setShowExtensionModal(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl border border-transparent">Batal</button>
                                <button type="submit" disabled={isSubmitting || !extensionProof} className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 transition-colors">
                                    {isSubmitting ? 'Mengirim...' : 'Kirim Pengajuan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 2. Modal Tagihan Tambahan */}
            {showExtraBillModal && selectedKost && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-3xl w-full max-w-md my-auto relative shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-blue-600 p-6 text-white">
                            <button onClick={() => setShowExtraBillModal(false)} className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/10 hover:bg-black/20 rounded-full p-2 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                    <Receipt className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-xl font-bold">Tagihan Ekstra Kost</h3>
                            </div>
                            <p className="blue-100 text-sm opacity-90">Bayar tagihan seperti Air, WiFi, Denda, dll untuk {selectedKost.kostName}.</p>
                        </div>

                        <form onSubmit={submitExtraBill} className="p-6 space-y-5">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Nama Tagihan</label>
                                <input type="text" required value={billName} onChange={(e) => setBillName(e.target.value)} placeholder="Contoh: Iuran WiFi Agustus" className="w-full mt-1.5 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Jumlah Rp</label>
                                <input type="text" required placeholder="Contoh: 150000" value={billAmount} onChange={(e) => setBillAmount(e.target.value.replace(/\\D/g, ''))} className="w-full mt-1.5 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-lg font-black focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Bukti Transfer</label>
                                <label className="mt-1.5 flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 hover:border-blue-500 transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <p className="text-sm font-bold text-gray-600">
                                            {billProof ? billProof.name : "Unggah Bukti Transaksi"}
                                        </p>
                                    </div>
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => setBillProof(e.target.files?.[0] || null)} required />
                                </label>
                            </div>

                            <div className="mt-6 pt-6 border-t border-gray-100 flex gap-3">
                                <button type="button" onClick={() => setShowExtraBillModal(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl border border-transparent">Batal</button>
                                <button type="submit" disabled={isSubmitting || !billProof} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 transition-colors">
                                    {isSubmitting ? 'Mengirim...' : 'Kirim Tagihan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 3. Modal Komplain */}
            {showComplaintModal && selectedKost && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-3xl w-full max-w-lg my-auto relative shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-red-500 p-6 text-white">
                            <button onClick={() => setShowComplaintModal(false)} className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/10 hover:bg-black/20 rounded-full p-2 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                    <MessageSquare className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-xl font-bold">Layanan Komplain Kost</h3>
                            </div>
                            <p className="red-100 text-sm opacity-90">Ada kerusakan fasilitas di {selectedKost.kostName}? Laporkan dengan detail di sini.</p>
                        </div>

                        <form onSubmit={submitComplaint} className="p-6 space-y-5">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Judul Kendala</label>
                                <input type="text" required value={complaintTitle} onChange={(e) => setComplaintTitle(e.target.value)} placeholder="Contoh: AC Kamar Bocor" className="w-full mt-1.5 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Detail Masalah</label>
                                <textarea rows={4} required value={complaintDesc} onChange={(e) => setComplaintDesc(e.target.value)} placeholder="Jelaskan secara rinci kerusakan atau masalah yang Anda alami..." className="w-full mt-1.5 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none resize-none"></textarea>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Lampiran Foto (Opsional)</label>
                                <label className="mt-1.5 flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 hover:border-red-500 transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <p className="text-sm font-bold text-gray-600">
                                            {complaintPhoto ? complaintPhoto.name : "Unggah Foto Bukti Kendala"}
                                        </p>
                                    </div>
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => setComplaintPhoto(e.target.files?.[0] || null)} />
                                </label>
                            </div>

                            <div className="mt-6 pt-6 border-t border-gray-100 flex gap-3">
                                <button type="button" onClick={() => setShowComplaintModal(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl border border-transparent">Batal</button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 transition-colors">
                                    {isSubmitting ? 'Mengirim...' : 'Kirim Komplain'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

// Quick explicit mock CheckCircleIcon component since it's not exported differently from lucide
function CheckCircleIcon(props: any) {
    return (
        <svg fill="currentColor" viewBox="0 0 20 20" {...props}>
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
    );
}

export default MyKost;
