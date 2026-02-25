
import React from 'react';
import { Page } from '../types';

interface FooterProps {
  onPageChange: (page: Page) => void;
}

const Footer: React.FC<FooterProps> = ({ onPageChange }) => {
  return (
    <footer className="bg-gray-50 pt-16 pb-8 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center mb-6">
              <span className="text-orange-500 font-extrabold text-2xl">RuangSinggah</span>
              <span className="text-gray-900 font-bold text-2xl">.id</span>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              Platform pemasaran kost mahasiswa berbasis kepercayaan dan verifikasi. Membantu mahasiswa menemukan hunian terbaik dengan transparansi penuh.
            </p>
          </div>
          
          <div>
            <h4 className="text-gray-900 font-bold mb-6">Layanan</h4>
            <ul className="space-y-4 text-sm text-gray-600">
              <li><button onClick={() => onPageChange(Page.LISTINGS)} className="hover:text-orange-500">Pencarian Kost Mitra</button></li>
              <li><button onClick={() => onPageChange(Page.PRODUCTS)} className="hover:text-orange-500">Database Kost Kampus (Excel)</button></li>
              <li><button className="hover:text-orange-500 opacity-50 cursor-not-allowed">Pendaftaran Pemilik Kost (Soon)</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-gray-900 font-bold mb-6">Perusahaan</h4>
            <ul className="space-y-4 text-sm text-gray-600">
              <li><button onClick={() => onPageChange(Page.ABOUT)} className="hover:text-orange-500">Tentang Kami</button></li>
              <li><button onClick={() => onPageChange(Page.CONTACT)} className="hover:text-orange-500">Kontak</button></li>
              <li><button className="hover:text-orange-500">Syarat & Ketentuan</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-gray-900 font-bold mb-6">Ikuti Kami</h4>
            <div className="flex space-x-4">
              <a href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-gray-200 hover:border-orange-500 text-gray-400 hover:text-orange-500 transition-all shadow-sm">
                <span className="sr-only">Instagram</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-gray-200 hover:border-orange-500 text-gray-400 hover:text-orange-500 transition-all shadow-sm">
                <span className="sr-only">TikTok</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.13-1.47-.12 3.35-.12 6.7 0 10.05-.1 1.63-.58 3.25-1.55 4.58-1.35 1.83-3.67 2.87-5.91 2.8-2.31-.01-4.6-.96-6.11-2.72-1.78-2.03-2.22-5.06-1.12-7.53.94-2.18 3.09-3.79 5.46-4.06.13 1.34.25 2.68.38 4.02-1.15.11-2.32.55-3.08 1.46-.73.91-.91 2.14-.52 3.24.4 1.15 1.43 2.03 2.62 2.23 1.28.2 2.64-.19 3.52-1.12.82-.9.99-2.19.98-3.37-.02-3.34-.02-6.67-.02-10.01V0c.01.01.01.01 0 .02z"/></svg>
              </a>
            </div>
          </div>
        </div>
        
        <div className="pt-8 border-t border-gray-200 text-center text-xs text-gray-500">
          <p>© {new Date().getFullYear()} RuangSinggah.id. Dibangun dengan integritas untuk mahasiswa Indonesia.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
