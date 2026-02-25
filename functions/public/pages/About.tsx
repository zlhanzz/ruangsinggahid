
import React from 'react';

const About: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Intro */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-orange-600 font-bold uppercase tracking-widest text-sm mb-4 block">Visi & Misi Kami</span>
              <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-8 leading-tight">Membangun Kepercayaan di Setiap <span className="text-orange-500">Hunian</span>.</h1>
              <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                RuangSinggah.id lahir dari keresahan mahasiswa yang seringkali kecewa saat survei kost karena foto yang tidak sesuai dengan kenyataan.
              </p>
              <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                Kami hadir sebagai jembatan yang jujur antara pemilik kost dan mahasiswa, mengutamakan verifikasi data lapangan untuk meminimalisir penipuan dan rasa kecewa.
              </p>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h4 className="text-orange-500 font-bold text-2xl mb-1">100%</h4>
                  <p className="text-gray-500 text-sm">Verified Listings</p>
                </div>
                <div>
                  <h4 className="text-orange-500 font-bold text-2xl mb-1">0</h4>
                  <p className="text-gray-500 text-sm">Booking Fees</p>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-orange-100 rounded-[3rem] -rotate-3"></div>
              <img 
                src="https://picsum.photos/seed/about/800/800" 
                alt="Our Team" 
                className="relative rounded-[2.5rem] shadow-2xl border border-white"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Verification Approach */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Bagaimana Kami Memverifikasi?</h2>
            <p className="text-gray-500">Integritas data adalah prioritas utama RuangSinggah.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: '01',
                title: 'Kunjungan Langsung',
                desc: 'Tim kami mendatangi setiap titik kost yang terdaftar di platform kami.'
              },
              {
                step: '02',
                title: 'Audit Fasilitas',
                desc: 'Kami mengecek satu-per-satu fasilitas yang dijanjikan pemilik kost.'
              },
              {
                step: '03',
                title: 'Wawancara Penghuni',
                desc: 'Kami bertanya kepada penghuni aktif tentang kenyamanan dan pelayanan kost.'
              },
              {
                step: '04',
                title: 'Update Berkala',
                desc: 'Data diperbarui setiap 3 bulan untuk memastikan informasi tetap relevan.'
              }
            ].map((item, idx) => (
              <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
                <span className="text-5xl font-black text-orange-100 mb-6 block leading-none">{item.step}</span>
                <h3 className="text-lg font-bold text-gray-900 mb-4">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Small */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-6 italic">"Mencari tempat tinggal tidak harus melelahkan."</h2>
          <p className="text-gray-500 mb-10">— Tim RuangSinggah.id</p>
          <div className="w-20 h-1 bg-orange-500 mx-auto"></div>
        </div>
      </section>
    </div>
  );
};

export default About;
