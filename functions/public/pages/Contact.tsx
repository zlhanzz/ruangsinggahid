
import React from 'react';

const Contact: React.FC = () => {
  return (
    <div className="min-h-screen bg-white py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6">Hubungi Kami</h1>
            <p className="text-gray-500 text-lg">Ada pertanyaan atau mau konsultasi kost? Kami siap membantu kamu!</p>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl border border-gray-50 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-10 bg-gray-900 text-white flex flex-col justify-between">
                <div>
                  <h3 className="text-2xl font-bold mb-8">Informasi Kontak</h3>
                  <div className="space-y-6">
                    <div className="flex items-start">
                      <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center text-orange-500 mr-4 shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs font-bold uppercase mb-1">WhatsApp CS</p>
                        <p className="font-medium">+62 812-3456-7890</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center text-orange-500 mr-4 shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs font-bold uppercase mb-1">Email</p>
                        <p className="font-medium">halo@ruangsinggah.id</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center text-orange-500 mr-4 shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs font-bold uppercase mb-1">Headquarters</p>
                        <p className="font-medium text-sm">Bogor, Jawa Barat (Sekitar Kampus IPB)</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-12 flex space-x-4 opacity-50">
                  <div className="w-8 h-8 rounded-full border border-white/20"></div>
                  <div className="w-8 h-8 rounded-full border border-white/20"></div>
                  <div className="w-8 h-8 rounded-full border border-white/20"></div>
                </div>
              </div>
              
              <div className="p-10 bg-white">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Kirim Pesan Cepat</h3>
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Nama Lengkap</label>
                    <input type="text" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Nomor WhatsApp</label>
                    <input type="text" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Keperluan</label>
                    <select className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 transition-all">
                      <option>Tanya Info Kost</option>
                      <option>Beli Database Kost</option>
                      <option>Daftar Jadi Mitra</option>
                      <option>Lainnya</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Pesan</label>
                    <textarea rows={4} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 transition-all resize-none"></textarea>
                  </div>
                  <button className="w-full bg-orange-500 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-orange-600 active:scale-95 transition-all">
                    Kirim Pesan
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
