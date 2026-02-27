import React, { useState, useRef } from 'react';
import { CheckCircle, AlertTriangle, Video, MapPin, Calendar, Clock, ArrowRight, ShieldCheck, Wifi, Droplets, X } from 'lucide-react';

const SurveyService: React.FC = () => {
  const offerSectionRef = useRef<HTMLDivElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    kostName: '',
    ownerPhone: '',
    kostAddress: '',
    source: 'database', // 'database', 'social_media', 'other'
    surveyDate: '',
    surveyTime: '',
    notes: ''
  });

  const scrollToOffer = () => {
    offerSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Format message for WhatsApp
    const message = `Halo Admin RuangSinggah, saya ingin request Jasa Survey Lokasi Kost (Paket Rp 70.000).
    
DATA DIRI:
Nama: ${formData.name}
No WA: ${formData.phone}
Email: ${formData.email}

DETAIL KOST:
Nama Kost: ${formData.kostName}
No Pemilik: ${formData.ownerPhone}
Alamat: ${formData.kostAddress}
Sumber Info: ${formData.source}

JADWAL SURVEY (VIDEO CALL):
Tanggal: ${formData.surveyDate}
Jam: ${formData.surveyTime}

Catatan: ${formData.notes}

Mohon diproses segera. Terima kasih.`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/6285156634283?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* HERO SECTION */}
      <section className="relative pt-8 pb-8 sm:pb-16 lg:pt-32 lg:pb-32 overflow-hidden bg-white">
        <div className="absolute inset-0 bg-orange-50/50 -z-10"></div>
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 lg:w-96 lg:h-96 bg-orange-200 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 lg:w-80 lg:h-80 bg-blue-200 rounded-full blur-3xl opacity-30"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-6 sm:gap-10 lg:gap-12 items-center">
            {/* Kiri: Teks dan CTA */}
            <div className="text-center lg:text-left order-1 pt-2 lg:pt-0">
              <div className="inline-flex items-center gap-1.5 lg:gap-2 bg-orange-100 text-orange-700 px-3 py-1.5 lg:px-4 lg:py-2 rounded-full text-[10px] sm:text-xs lg:text-sm font-bold mb-4 sm:mb-6 lg:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <ShieldCheck className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                <span>Jangan Beli Kucing Dalam Karung!</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-black text-gray-900 tracking-tight mb-2 sm:mb-4 lg:mb-6 leading-tight animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
                Takut Kost <span className="text-orange-500">ZONK</span> & <br className="hidden sm:block" />
                Uang DP Melayang?
              </h1>

              <p className="text-base sm:text-lg lg:text-lg text-gray-600 mb-4 sm:mb-8 lg:mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 max-w-xl mx-auto lg:mx-0">
                Foto sering menipu. Biar tim kami yang cek langsung ke lokasi, test wifi, cek air, dan video call live dengan Anda. Hemat waktu, tenaga, dan bebas rasa was-was.
              </p>

              <div className="hidden lg:flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 lg:gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
                <button
                  onClick={scrollToOffer}
                  className="w-full sm:w-auto px-6 py-3.5 lg:px-8 lg:py-4 bg-orange-500 text-white rounded-xl lg:rounded-2xl font-bold text-base lg:text-lg shadow-xl shadow-orange-200 hover:bg-orange-600 hover:scale-[1.02] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  Lihat Penawaran <ArrowRight className="w-4 h-4 lg:w-5 lg:h-5" />
                </button>
              </div>
            </div>

            {/* Kanan / Tengah: Gambar Hero */}
            <div className="order-2 relative animate-in zoom-in-95 duration-1000 delay-300 w-[90%] sm:w-4/5 lg:w-full mx-auto mt-2 sm:mt-4 lg:mt-0">
              <div className="relative rounded-2xl lg:rounded-3xl overflow-hidden shadow-2xl border-2 lg:border-4 border-white aspect-[4/3] lg:aspect-square xl:aspect-[4/3]">
                <img
                  src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
                  alt="Tim Survey Mengecek Kost"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent flex items-end justify-center pb-4 lg:pb-6">
                  <p className="text-white font-medium text-[10px] sm:text-xs lg:text-sm bg-black/40 backdrop-blur-md px-3 py-1 lg:px-4 lg:py-1.5 rounded-full border border-white/20">
                    Kami pastikan sesuai ekspektasi Anda
                  </p>
                </div>
              </div>

              {/* Ornamen pelengkap gambar melayang */}
              <div className="absolute -bottom-4 -left-4 lg:-bottom-6 lg:-left-6 bg-white p-2.5 lg:p-4 rounded-xl lg:rounded-2xl shadow-xl border border-gray-100 animate-bounce" style={{ animationDuration: '3s' }}>
                <div className="flex items-center gap-2 lg:gap-3">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                    <Video className="w-4 h-4 lg:w-5 lg:h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] lg:text-xs font-bold text-gray-900 leading-tight">Live Video Call</p>
                    <p className="text-[8px] lg:text-[10px] text-gray-500">Kondisi Real-time</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bawah: Tombol CTA Ekstra Khusus Mobile */}
            <div className="order-3 lg:hidden w-full mt-3 sm:mt-4">
              <button
                onClick={scrollToOffer}
                className="w-full px-6 py-3 sm:py-4 bg-orange-500 text-white rounded-xl font-bold text-sm shadow-xl shadow-orange-200 hover:bg-orange-600 hover:scale-[1.02] transition-all active:scale-[0.98] flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300"
              >
                Lihat Penawaran <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* PAIN & GAIN SECTION */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-20 items-stretch md:items-center">

            {/* Kiri: Masalah (Pain) - Tema Orange */}
            <div className="bg-orange-50 rounded-2xl lg:rounded-3xl p-6 lg:p-8 border border-orange-100 order-1 md:order-1 h-full flex flex-col">
              <h3 className="font-black text-lg lg:text-xl text-orange-900 mb-4 lg:mb-6 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 lg:w-5 lg:h-5 text-orange-600" />
                Apa yang Sering Terjadi?
              </h3>
              <div className="space-y-3 lg:space-y-4 flex-1">
                <div className="bg-white p-3 lg:p-4 rounded-lg lg:rounded-xl shadow-sm border border-orange-100 flex items-start gap-2 lg:gap-3 hover:shadow-md transition-shadow">
                  <span className="text-xl lg:text-2xl mt-0.5 lg:mt-1">😭</span>
                  <p className="text-gray-700 text-xs lg:text-sm font-medium leading-relaxed">"Udah transfer DP 500rb, pas sampe lokasi ternyata kostnya gak ada. Nomor WA diblokir."</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-orange-100 flex items-start gap-3 hover:shadow-md transition-shadow">
                  <span className="text-2xl mt-1">😤</span>
                  <p className="text-gray-700 text-sm font-medium">"Di foto kamarnya luas dan bersih, aslinya sempit, lembab, dan bau apek. Zonk banget!"</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-orange-100 flex items-start gap-3 hover:shadow-md transition-shadow">
                  <span className="text-2xl mt-1">😡</span>
                  <p className="text-gray-700 text-sm font-medium">"Katanya wifi kenceng, pas dicoba buat zoom meeting putus-nyambung."</p>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-orange-200 text-center">
                <p className="font-bold text-orange-800">Jangan sampai ini terjadi pada Anda!</p>
              </div>
            </div>

            {/* Kanan: Solusi (Gain) - Tema Biru */}
            <div className="order-2 md:order-2">
              <h2 className="text-3xl font-black text-gray-900 mb-6">
                Kenapa Harus Lewat <span className="text-blue-600">RuangSinggah</span>?
              </h2>
              <div className="space-y-6">
                <div className="flex gap-4 p-4 rounded-2xl hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-100">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">Hindari Penipuan</h3>
                    <p className="text-gray-600 mt-1">Banyak modus penipuan kost fiktif minta DP duluan. Kami pastikan kostnya beneran ada dan pemiliknya valid.</p>
                  </div>
                </div>
                <div className="flex gap-4 p-4 rounded-2xl hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-100">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                    <Video className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">Real-Time Video Call</h3>
                    <p className="text-gray-600 mt-1">Lihat kondisi kamar, kamar mandi, dan lingkungan sekitar secara langsung lewat video call. No edit-edit club.</p>
                  </div>
                </div>
                <div className="flex gap-4 p-4 rounded-2xl hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-100">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">Hemat Ongkos & Waktu</h3>
                    <p className="text-gray-600 mt-1">Daripada habis ratusan ribu buat transport survey sendiri, biar kami yang capek turun lapangan buat Anda.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* OFFER SECTION */}
      <section ref={offerSectionRef} className="py-20 bg-gray-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500 rounded-full blur-[100px] opacity-20"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500 rounded-full blur-[100px] opacity-20"></div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-black mb-4">Paket Survey Anti-Zonk</h2>
          <p className="text-gray-400 text-lg mb-12">Investasi kecil untuk kenyamanan tempat tinggal Anda setahun ke depan.</p>

          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 md:p-12 border border-white/20 max-w-2xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-8 border-b border-white/10 pb-8">
              <div className="text-left">
                <p className="text-gray-300 text-sm uppercase tracking-widest font-bold mb-1">Harga Spesial</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-orange-500">Rp 70.000</span>
                  <span className="text-gray-400 line-through decoration-red-500 decoration-2">Rp 150.000</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">*Per satu lokasi kost</p>
              </div>
              <div className="bg-orange-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                Best Value
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-left mb-10">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                <span>Live Video Call (15-30 Menit)</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                <span>Cek Kondisi Fisik Kamar</span>
              </div>
              <div className="flex items-center gap-3">
                <Wifi className="w-5 h-5 text-green-400 shrink-0" />
                <span>Speedtest WiFi di Lokasi</span>
              </div>
              <div className="flex items-center gap-3">
                <Droplets className="w-5 h-5 text-green-400 shrink-0" />
                <span>Cek Tekanan Air & Kebersihan</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                <span>Wawancara Singkat Penjaga/Pemilik</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                <span>Cek Lingkungan Sekitar (Indomaret/Warung)</span>
              </div>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full py-4 bg-orange-500 text-white rounded-xl font-bold text-lg hover:bg-orange-600 hover:scale-[1.02] transition-all shadow-lg shadow-orange-500/30"
            >
              Ambil Promo Ini Sekarang
            </button>
            <p className="text-xs text-gray-400 mt-4">Garansi uang kembali jika tim kami tidak datang ke lokasi.</p>
          </div>
        </div>
      </section>

      {/* FORM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-300">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 p-2 bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900 rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-8 sm:p-10 max-h-[85vh] overflow-y-auto custom-scrollbar">
              <div className="text-center mb-8 pr-8">
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3">Formulir Request Survey</h2>
                <p className="text-gray-600 text-sm">Isi data di bawah ini, admin kami akan segera menghubungi Anda untuk konfirmasi pembayaran dan jadwal.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Data Diri */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider border-b pb-2">Data Pemesan</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Nama Lengkap</label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                        placeholder="Nama Anda"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Nomor WhatsApp</label>
                      <input
                        type="tel"
                        required
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                        placeholder="08xxxxxxxxxx"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        required
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                        placeholder="email@contoh.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Data Kost */}
                <div className="space-y-4 pt-4">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider border-b pb-2">Detail Kost Tujuan</h3>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Nama Kost / Link Kost</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                      placeholder="Nama Kost atau Link Google Maps"
                      value={formData.kostName}
                      onChange={(e) => setFormData({ ...formData, kostName: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Nomor HP Pemilik/Penjaga</label>
                      <input
                        type="tel"
                        required
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                        placeholder="Untuk janjian survey"
                        value={formData.ownerPhone}
                        onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Sumber Informasi</label>
                      <select
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm bg-white"
                        value={formData.source}
                        onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      >
                        <option value="database">Database RuangSinggah</option>
                        <option value="social_media">Sosial Media (IG/TikTok)</option>
                        <option value="google_maps">Google Maps</option>
                        <option value="friends">Teman/Kerabat</option>
                        <option value="other">Lainnya</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Alamat Lengkap Kost</label>
                    <textarea
                      required
                      rows={2}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                      placeholder="Alamat lengkap agar surveyor tidak nyasar"
                      value={formData.kostAddress}
                      onChange={(e) => setFormData({ ...formData, kostAddress: e.target.value })}
                    />
                  </div>
                </div>

                {/* Jadwal Survey */}
                <div className="space-y-4 pt-4">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider border-b pb-2">Jadwal Video Call</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Tanggal Survey</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <input
                          type="date"
                          required
                          className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                          value={formData.surveyDate}
                          onChange={(e) => setFormData({ ...formData, surveyDate: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Jam (WIB)</label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <input
                          type="time"
                          required
                          className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                          value={formData.surveyTime}
                          onChange={(e) => setFormData({ ...formData, surveyTime: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Catatan Khusus (Opsional)</label>
                    <textarea
                      rows={2}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                      placeholder="Contoh: Tolong cek apakah parkiran motor aman, atau cek kebersihan dapur umum."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-colors shadow-lg active:scale-[0.98] mt-8 text-lg"
                >
                  Survey Sekarang
                </button>
                <p className="text-center text-xs text-gray-500 mt-4">
                  Dengan mengklik tombol di atas, Anda akan diarahkan ke WhatsApp Admin untuk konfirmasi.
                </p>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SurveyService;
