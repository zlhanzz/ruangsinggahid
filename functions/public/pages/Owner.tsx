
import React from 'react';

const Owner: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-orange-500 py-24 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">Optimalkan Hunian Anda Bersama RuangSinggah.id</h1>
            <p className="text-orange-50 text-xl mb-10 leading-relaxed">
              Jangkau ribuan mahasiswa potensial dan bangun kepercayaan melalui sistem verifikasi yang transparan. Solusi pemasaran modern untuk pemilik kost dan villa.
            </p>
            <div className="flex flex-wrap gap-4">
              <button className="bg-white text-orange-600 px-8 py-4 rounded-xl font-bold hover:bg-orange-50 transition-all shadow-xl active:scale-95">
                Daftar Jadi Mitra
              </button>
              <button className="bg-orange-600 text-white border border-orange-400 px-8 py-4 rounded-xl font-bold hover:bg-orange-700 transition-all active:scale-95">
                Pelajari Kerjasama
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-3xl font-extrabold text-gray-900 md:text-4xl mb-4">Kenapa Bermitra Dengan Kami?</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Kami tidak hanya memasarkan, tapi membantu membangun reputasi properti Anda di mata mahasiswa.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                title: "Eksposur Mahasiswa",
                desc: "Listing Anda akan tampil di halaman utama pencarian mahasiswa dari berbagai kampus besar.",
                icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              },
              {
                title: "Badget Verifikasi",
                desc: "Properti yang telah kami verifikasi mendapatkan kepercayaan 2x lebih tinggi dari calon penghuni.",
                icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              },
              {
                title: "Insight Properti",
                desc: "Dapatkan data statistik performa listing Anda untuk membantu penentuan harga dan strategi promosi.",
                icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              }
            ].map((item, idx) => (
              <div key={idx} className="bg-white p-10 rounded-3xl border border-gray-100 hover:shadow-2xl transition-all duration-300 group">
                <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 mb-8 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{item.title}</h3>
                <p className="text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Process */}
      <section className="py-24 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-5xl font-extrabold mb-8">Langkah Mudah Bergabung</h2>
              <div className="space-y-10">
                {[
                  { title: "Registrasi Data", desc: "Isi formulir properti Anda dan unggah foto terbaik." },
                  { title: "Verifikasi Lapangan", desc: "Tim kami akan menjadwalkan kunjungan untuk memastikan kualitas hunian." },
                  { title: "Tayang & Pasarkan", desc: "Listing Anda akan langsung aktif dan mulai menjangkau ribuan mahasiswa." }
                ].map((step, idx) => (
                  <div key={idx} className="flex gap-6">
                    <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center font-bold text-xl shrink-0">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold mb-2">{step.title}</h4>
                      <p className="text-gray-400">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 backdrop-blur-sm">
              <h3 className="text-2xl font-bold mb-6 text-center">Formulir Kemitraan</h3>
              <p className="text-gray-400 mb-8 text-center text-sm">Silakan hubungi tim partnership kami melalui WhatsApp untuk proses pendaftaran cepat.</p>
              <button className="w-full bg-[#25D366] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#20bd5a] transition-all">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.316 1.592 5.448 0 9.886-4.438 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.738-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" /></svg>
                WhatsApp Partnership
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Owner;
