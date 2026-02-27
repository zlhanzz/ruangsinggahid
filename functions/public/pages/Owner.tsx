import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { CheckCircle2, ShieldCheck, Video, MapPin, FileText, ArrowRight } from 'lucide-react';

const Owner: React.FC = () => {
  const [formData, setFormData] = useState({
    ownerName: '',
    phone: '',
    kostName: '',
    kostType: 'Campur',
    emptyRooms: '',
    address: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasAgreedMoU, setHasAgreedMoU] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await addDoc(collection(db, 'mitra_requests'), {
        ...formData,
        emptyRooms: parseInt(formData.emptyRooms) || 0,
        status: 'pending',
        timestamp: serverTimestamp()
      });

      setIsSuccess(true);
      setFormData({
        ownerName: '',
        phone: '',
        kostName: '',
        kostType: 'Campur',
        emptyRooms: '',
        address: ''
      });

      // Reset success message after 5 seconds dan tutup modal
      setTimeout(() => {
        setIsSuccess(false);
        setIsModalOpen(false);
        setHasAgreedMoU(false);
      }, 5000);

    } catch (error) {
      console.error("Error submitting form: ", error);
      alert("Terjadi kesalahan saat mengirim formulir. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Anchor target Section Formulir
  const formSectionRef = React.useRef<HTMLDivElement>(null);

  const scrollToFormSection = () => {
    formSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-orange-500 pt-6 pb-6 sm:pb-16 lg:pt-16 lg:pb-24 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 lg:w-96 lg:h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-48 h-48 lg:w-72 lg:h-72 bg-orange-400 rounded-full blur-3xl opacity-50"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-6 sm:gap-10 lg:gap-12 items-center">
            {/* Kiri: Teks CTA */}
            <div className="text-center md:text-left mx-auto md:mx-0 order-1 pt-2 lg:pt-0">
              <div className="inline-flex items-center gap-1.5 lg:gap-2 bg-orange-400/30 backdrop-blur-sm text-white border border-orange-300/30 px-3 py-1.5 lg:px-4 lg:py-2 rounded-full text-[10px] sm:text-xs lg:text-sm font-bold mb-4 sm:mb-6 lg:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <ShieldCheck className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                <span>Terpercaya oleh Ratusan Pemilik Properti</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-2 sm:mb-4 lg:mb-6 leading-tight">
                Optimalkan Hunian Anda Bersama RuangSinggah.id
              </h1>
              <p className="text-orange-50 text-sm sm:text-lg lg:text-xl mb-4 sm:mb-8 lg:mb-10 leading-relaxed max-w-xl mx-auto md:mx-0">
                Jangkau ribuan mahasiswa potensial dan bangun kepercayaan melalui sistem verifikasi yang transparan. Solusi pemasaran modern untuk pemilik kost dan villa.
              </p>
              <div className="hidden lg:flex flex-col sm:flex-row flex-wrap justify-center md:justify-start gap-4">
                {/* TOMBOL HERO INI BERFUNGSI SEBAGAI JANGKAR (ANCHOR) KE SECTION BAWAH */}
                <button
                  onClick={scrollToFormSection}
                  className="w-full sm:w-auto bg-white text-orange-600 px-6 py-3.5 lg:px-8 lg:py-4 rounded-xl font-bold hover:bg-orange-50 transition-all shadow-xl active:scale-95 text-sm lg:text-base flex items-center justify-center gap-2"
                >
                  Daftar Jadi Mitra Pemenang <ArrowRight className="w-4 h-4 lg:w-5 lg:h-5" />
                </button>
              </div>
            </div>

            {/* Tengah/Kanan: Gambar Properti/Kost */}
            <div className="order-2 relative animate-in zoom-in-95 duration-1000 delay-300 w-full max-w-md mx-auto lg:max-w-none mt-2 sm:mt-4 lg:mt-0">
              <div className="relative rounded-2xl lg:rounded-3xl overflow-hidden shadow-2xl border-2 lg:border-4 border-white/20 aspect-[4/3] lg:aspect-square xl:aspect-[4/3] transform lg:-rotate-2 hover:rotate-0 transition-transform duration-500">
                <img
                  src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
                  alt="Kamar Kost Premium"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent flex items-end justify-center pb-4 lg:pb-6">
                  <p className="text-white font-medium text-[10px] sm:text-xs lg:text-sm bg-black/40 backdrop-blur-md px-3 py-1 lg:px-4 lg:py-1.5 rounded-full border border-white/20">
                    Biar kamar kosong cepat terisi!
                  </p>
                </div>
              </div>

              {/* Ornamen melayang */}
              <div className="absolute -bottom-4 -left-4 lg:-bottom-6 lg:-left-6 bg-white p-2.5 lg:p-4 rounded-xl lg:rounded-2xl shadow-xl border border-gray-100 animate-bounce" style={{ animationDuration: '3s' }}>
                <div className="flex items-center gap-2 lg:gap-3">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                    <CheckCircle2 className="w-4 h-4 lg:w-5 lg:h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] lg:text-xs font-bold text-gray-900 leading-tight">100% Gratis</p>
                    <p className="text-[8px] lg:text-[10px] text-gray-500">Pendaftaran Awal</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bawah: Tombol CTA Ekstra Khusus Mobile */}
            <div className="order-3 lg:hidden w-full mt-3 sm:mt-4">
              <button
                onClick={scrollToFormSection}
                className="w-full bg-white text-orange-600 px-6 py-3 sm:py-4 rounded-xl font-bold hover:bg-orange-50 transition-all shadow-xl active:scale-95 text-sm flex items-center justify-center gap-2"
              >
                Daftar Jadi Mitra Pemenang <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-20">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Kenapa Bermitra Dengan Kami?</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-sm sm:text-base">Kami tidak hanya memasarkan, tapi membantu membangun reputasi properti Anda di mata mahasiswa.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-12">
            {[
              {
                title: "Eksposur Mahasiswa",
                desc: "Listing Anda akan tampil di halaman utama pencarian mahasiswa dari berbagai kampus besar.",
                icon: <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8" />
              },
              {
                title: "Badget Verifikasi",
                desc: "Properti yang telah kami verifikasi mendapatkan kepercayaan 2x lebih tinggi dari calon penghuni.",
                icon: <Video className="w-6 h-6 sm:w-8 sm:h-8" />
              },
              {
                title: "Insight Properti",
                desc: "Dapatkan data statistik performa listing Anda untuk membantu penentuan harga dan strategi promosi.",
                icon: <MapPin className="w-6 h-6 sm:w-8 sm:h-8" />
              }
            ].map((item, idx) => (
              <div key={idx} className="bg-white p-6 sm:p-8 lg:p-10 rounded-2xl lg:rounded-3xl border border-gray-100 hover:shadow-2xl transition-all duration-300 group text-center md:text-left">
                <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto md:mx-0 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 mb-6 lg:mb-8 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                  {item.icon}
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 md:mb-4">{item.title}</h3>
                <p className="text-gray-500 leading-relaxed text-sm lg:text-base">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Target Section (di-scroll dari atas) */}
      <section className="py-16 md:py-24 bg-gray-900 text-white relative" ref={formSectionRef}>
        <div className="absolute top-0 right-0 w-64 h-64 lg:w-96 lg:h-96 bg-orange-500 rounded-full blur-[80px] lg:blur-[120px] opacity-20 -z-10"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 lg:w-96 lg:h-96 bg-blue-500 rounded-full blur-[80px] lg:blur-[120px] opacity-20 -z-10"></div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-6 lg:mb-10">Bergabung Sekarang!</h2>
          <p className="text-gray-400 mb-10 lg:mb-14 text-sm sm:text-base lg:text-lg leading-relaxed">
            Platform kami didesain eksklusif untuk mempertemukan pemilik kost berkualitas dengan mahasiswa pencari hunian terpercaya. Isi formulir perlengkapan data diri, dan tim kurasi kami akan segera menghubungi Anda untuk tahap verifikasi teknis.
          </p>

          <div className="space-y-6 lg:space-y-8 mb-12 text-left max-w-2xl mx-auto">
            {[
              { title: "Registrasi Properti Cepat", desc: "Tak ada biaya registrasi di awal. Biar kami yang memasarkan." },
              { title: "Verifikasi Lapangan", desc: "Kami akan menjadwalkan kunjungan guna memastikan standar." },
              { title: "Tayang & Panen Mahasiswa", desc: "Listing Anda tayang di portal utama target kampus sekitar." }
            ].map((step, idx) => (
              <div key={idx} className="flex gap-4 sm:gap-6 items-start bg-white/5 p-5 md:p-6 rounded-2xl border border-white/10 hover:border-orange-500/30 transition-colors">
                <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center font-bold text-xl shrink-0 shadow-lg shadow-orange-500/30">
                  {idx + 1}
                </div>
                <div>
                  <h4 className="text-lg sm:text-xl font-bold mb-2">{step.title}</h4>
                  <p className="text-sm sm:text-base text-gray-400 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* TOMBOL KEDUA TRIGGER MODAL */}
          <div className="bg-white/5 p-6 md:p-10 rounded-2xl lg:rounded-3xl border border-white/10 backdrop-blur-sm relative overflow-hidden text-center max-w-2xl mx-auto">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 rounded-full blur-2xl -mt-10 -mr-10"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl -mb-10 -ml-10"></div>
            <h3 className="text-xl sm:text-2xl font-bold mb-4">Siap Menerima Penghuni Baru?</h3>
            <p className="text-gray-400 mb-8 text-sm lg:text-base leading-relaxed max-w-md mx-auto">
              Kesempatan emas untuk memaksimalkan potensi properti Anda bersama jaringan mahasiswa kami yang luas.
            </p>
            <button
              onClick={() => {
                setHasAgreedMoU(false);
                setIsModalOpen(true);
              }}
              className="w-full sm:w-auto bg-orange-600 text-white px-8 py-4 lg:px-10 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-700 transition-all shadow-xl shadow-orange-500/20 active:scale-95 group mx-auto text-sm sm:text-base"
            >
              Mulai Pendaftaran
              <ArrowRight className="w-4 h-4 lg:w-5 lg:h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Modal Formulir Pendaftaran (Ditampilkan jika isModalOpen bernilai true) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0 }}>
          {/* Overlay Lock Scroll (klik di luar untuk tutup saat idle) */}
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => !isSubmitting && setIsModalOpen(false)}></div>

          <div className="bg-white w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl relative z-10 animate-in zoom-in-95 fade-in duration-300 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-gray-900 leading-tight">Formulir Kemitraan</h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Lengkapi data kost/kontrakan Anda</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-8 overflow-y-auto">
              {isSuccess ? (
                <div className="bg-green-50 border border-green-200 rounded-xl sm:rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500 my-4 sm:my-8">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 sm:mb-5">
                    <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10" />
                  </div>
                  <h4 className="text-xl sm:text-2xl font-black text-green-900 mb-2 sm:mb-3">Pendaftaran Berhasil!</h4>
                  <p className="text-green-700 text-sm sm:text-lg">Terima kasih atas minat Anda. Tim partnership kami akan segera menghubungi Anda via WA tersebut.</p>
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      setHasAgreedMoU(false);
                    }}
                    className="mt-6 sm:mt-8 bg-green-600 text-white px-6 py-2.5 sm:px-8 sm:py-3 rounded-lg sm:rounded-xl font-bold hover:bg-green-700 transition-colors w-full sm:w-auto text-sm sm:text-base"
                  >
                    Tutup Formulir
                  </button>
                </div>
              ) : !hasAgreedMoU ? (
                /* LAYER MOU / SYARAT DAN KETENTUAN */
                <div className="animate-in fade-in slide-in-from-right-8 duration-300">
                  <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-4">
                      <FileText className="w-6 h-6" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900">Ketentuan Kemitraan</h4>
                    <p className="text-gray-500 text-sm mt-2">Mohon baca lingkup kerjasama berikut sebelum melanjutkan.</p>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-6 max-h-60 overflow-y-auto text-sm space-y-4 text-gray-700">
                    <p><strong>1. Komitmen Ketersediaan:</strong> Pihak pemilik kost bersedia mengelola pembaruan ketersediaan kamar yang dilaporkan ke platform RuangSinggah.id atau merespon secara aktif pertanyaan ketersediaan melalui perwakilan kami.</p>
                    <p><strong>2. Pemasaran Bebas Biaya:</strong> RuangSinggah.id tidak memungut biaya pendaftaran (Listing fee) di awal. Transaksi berpedoman pada sistem markup / komisi yang disepakati bersama kelak.</p>
                    <p><strong>3. Verifikasi Lokasi:</strong> Pemilik mengizinkan tim lapangan kami (kurator) untuk melakukan penjadwalan kunjugan/survei singkat (pemotretan aset dan pengecekan fasilitas) pada waktu yang akan ditentukan.</p>
                    <p><strong>4. Layanan Pelanggan:</strong> Kerjasama ini mengutamakan niat baik. Pemilik bersedia memberikan perlakukan yang layak dan keamanan kepada penyewa yang dialihkan/dibawa oleh platform kami.</p>
                  </div>

                  <div className="flex items-start gap-3 mb-8 bg-orange-50 p-4 rounded-xl border border-orange-100 cursor-pointer" onClick={() => {
                    const cb = document.getElementById('agree-cb') as HTMLInputElement;
                    if (cb) cb.click();
                  }}>
                    <input
                      type="checkbox"
                      id="agree-cb"
                      onChange={(e) => {
                        // just internal toggle
                      }}
                      className="mt-1 w-5 h-5 text-orange-600 rounded focus:ring-orange-500 border-gray-300 cursor-pointer"
                    />
                    <label htmlFor="agree-cb" className="text-sm font-medium text-gray-800 cursor-pointer select-none">
                      Saya telah membaca dan menyetujui ketentuan kemitraan dasar RuangSinggah.id serta bersedia dihubungi.
                    </label>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="w-full sm:w-auto px-6 py-3 sm:py-3.5 text-gray-600 text-sm sm:text-base font-bold hover:bg-gray-100 rounded-lg sm:rounded-xl transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      className="w-full sm:flex-1 bg-orange-600 text-white py-3 sm:py-3.5 rounded-lg sm:rounded-xl text-sm sm:text-base font-bold flex items-center justify-center gap-2 hover:bg-orange-700 transition-all shadow-lg hover:shadow-orange-500/25 active:scale-95"
                      onClick={(e) => {
                        e.preventDefault();
                        const cb = document.getElementById('agree-cb') as HTMLInputElement;
                        if (!cb || !cb.checked) {
                          alert("Mohon centang kotak persetujuan (Syarat & Ketentuan) terlebih dahulu bilamana Anda bersedia.");
                          return;
                        }
                        setHasAgreedMoU(true);
                      }}
                    >
                      Setuju & Lanjut Mengisi Data
                    </button>
                  </div>
                </div>
              ) : (
                /* LAYER FORM INPUT KETIKA MOU SUDAH DISETUJUI */
                <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5 sm:mb-2">Nama Pemilik</label>
                      <input
                        type="text"
                        name="ownerName"
                        required
                        value={formData.ownerName}
                        onChange={handleChange}
                        className="w-full px-3 py-3 sm:px-4 sm:py-3.5 rounded-lg sm:rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all text-sm sm:text-base text-gray-900 bg-gray-50 focus:bg-white"
                        placeholder="Contoh: Budi Santoso"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5 sm:mb-2">Nomor WhatsApp</label>
                      <input
                        type="tel"
                        name="phone"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-3 py-3 sm:px-4 sm:py-3.5 rounded-lg sm:rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all text-sm sm:text-base text-gray-900 bg-gray-50 focus:bg-white"
                        placeholder="Contoh: 081234567890"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5 sm:mb-2">Nama Properti/Kost</label>
                    <input
                      type="text"
                      name="kostName"
                      required
                      value={formData.kostName}
                      onChange={handleChange}
                      className="w-full px-3 py-3 sm:px-4 sm:py-3.5 rounded-lg sm:rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all text-sm sm:text-base text-gray-900 bg-gray-50 focus:bg-white"
                      placeholder="Contoh: Kost Muslimah Berkah"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5 sm:mb-2">Jenis Kost</label>
                      <select
                        name="kostType"
                        value={formData.kostType}
                        onChange={handleChange}
                        className="w-full px-3 py-3 sm:px-4 sm:py-3.5 rounded-lg sm:rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all text-sm sm:text-base text-gray-900 bg-gray-50 focus:bg-white appearance-none cursor-pointer"
                      >
                        <option value="Putra">Putra</option>
                        <option value="Putri">Putri</option>
                        <option value="Campur">Campur</option>
                        <option value="Suami Istri">Suami Istri</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5 sm:mb-2">Kamar Kosong Saat Ini</label>
                      <input
                        type="number"
                        name="emptyRooms"
                        min="0"
                        required
                        value={formData.emptyRooms}
                        onChange={handleChange}
                        className="w-full px-3 py-3 sm:px-4 sm:py-3.5 rounded-lg sm:rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all text-sm sm:text-base text-gray-900 bg-gray-50 focus:bg-white"
                        placeholder="Misal: 5"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5 sm:mb-2">Alamat Lengkap Kost</label>
                    <textarea
                      name="address"
                      required
                      rows={3}
                      value={formData.address}
                      onChange={handleChange}
                      className="w-full px-3 py-3 sm:px-4 sm:py-3.5 rounded-lg sm:rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all text-sm sm:text-base text-gray-900 resize-none bg-gray-50 focus:bg-white"
                      placeholder="Masukkan alamat lengkap properti..."
                    ></textarea>
                  </div>

                  {/* Modal Footer (Sticky Bottom) */}
                  <div className="pt-4 sm:pt-6 mt-2 border-t border-gray-100 flex flex-col-reverse sm:flex-row justify-end gap-3 sticky bottom-0 bg-white">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setHasAgreedMoU(false)}
                      className="w-full sm:w-auto px-6 py-3 sm:py-3.5 text-gray-600 text-sm sm:text-base font-bold hover:bg-gray-100 rounded-lg sm:rounded-xl transition-colors disabled:opacity-50"
                    >
                      Kembali ke Syarat
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-64 bg-orange-600 text-white py-3 sm:py-3.5 rounded-lg sm:rounded-xl text-sm sm:text-base font-bold flex items-center justify-center gap-2 hover:bg-orange-700 transition-all shadow-lg hover:shadow-orange-500/25 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Memproses...</span>
                        </div>
                      ) : (
                        "Kirim Pendaftaran"
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Owner;
