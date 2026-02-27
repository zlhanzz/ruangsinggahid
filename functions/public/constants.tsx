
import { Kost } from './types';

export const MOCK_KOSTS: Kost[] = [
  {
    id: '1',
    ownerUid: 'owner_1',
    status: 'published',
    title: 'Kost Orange Residence',
    type: 'Putri',
    address: 'Dramaga, Bogor',
    city: 'Bogor',
    price: 1200000,
    imageUrls: [
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&q=80&w=800'
    ],
    videoUrls: ['https://www.w3schools.com/html/mov_bbb.mp4'], // Sample video
    instagramUrl: 'https://instagram.com',
    tiktokUrl: 'https://tiktok.com',
    isVerified: true,
    facilities: ['WiFi 100Mbps', 'CCTV 24 Jam', 'Dapur Bersama', 'Area Parkir Motor', 'Penjaga Kost'],
    campuses: [{ name: 'Universitas Gadjah Mada', distance: '10 Menit', transportMode: 'motorcycle' }],
    rating: 4.8,
    description: 'Kost eksklusif khusus putri dengan lingkungan yang tenang dan asri. Dekat dengan gerbang utama IPB Dramaga. Bangunan baru dengan sirkulasi udara yang sangat baik.',
    rules: ['Khusus Putri', 'Jam malam 22:00 WIB', 'Dilarang merokok', 'Tamu pria dilarang masuk kamar'],
    roomTypes: [
      {
        name: 'Standard (Kipas)',
        size: '3x3m',
        price: 1200000,
        features: ['Ekonomis'],
        roomFacilities: ['Kipas Angin', 'Kasur Busa', 'Meja Belajar', 'Lemari Pakaian', 'Jendela ke Koridor'],
        bathroomFacilities: ['Kamar Mandi Luar', 'Shower', 'Ember & Gayung']
      },
      {
        name: 'Deluxe (AC)',
        size: '3x4m',
        price: 1850000,
        features: ['Best Seller', 'Sirkulasi Bagus'],
        roomFacilities: ['AC 1/2 PK', 'Kasur Springbed', 'Meja Belajar Informa', 'Lemari 2 Pintu', 'Cermin Besar', 'Jendela ke Luar'],
        bathroomFacilities: ['Kamar Mandi Dalam', 'Shower', 'Closet Duduk']
      },
      {
        name: 'Executive VIP',
        size: '4x5m',
        price: 2500000,
        features: ['Premium', 'Lantai 1'],
        roomFacilities: ['AC 1 PK', 'Smart TV 32"', 'Kasur Queen Size', 'Kulkas Mini', 'Meja Kerja Ergonomis', 'Sofa Kecil'],
        bathroomFacilities: ['Kamar Mandi Dalam', 'Water Heater', 'Shower', 'Washtafel', 'Closet Duduk Toto']
      }
    ],
    reviews: [],
    location: {
      lat: -6.559,
      lng: 106.721
    },
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    ownerUid: 'owner_2',
    status: 'published',
    title: 'Ruang Singgah Exclusive UI',
    type: 'Putra',
    address: 'Margonda, Depok',
    city: 'Depok',
    price: 2500000,
    imageUrls: [
      'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1591825729269-caeb344f6df2?auto=format&fit=crop&q=80&w=800'
    ],
    isVerified: true,
    instagramUrl: 'https://instagram.com',
    facilities: ['Gym', 'Kolam Renang', 'WiFi', 'Laundry', 'Coworking Space', 'Cafe'],
    campuses: [{ name: 'Universitas Indonesia', distance: '10 Menit', transportMode: 'walk' }],
    rating: 4.9,
    description: 'Kost putra eksklusif di pusat Margonda dengan fasilitas setara apartemen. Sangat cocok untuk mahasiswa yang menginginkan produktivitas tinggi.',
    rules: ['Khusus Putra', 'Tamu dilarang menginap', 'Dilarang berisik di atas jam 21:00'],
    roomTypes: [
      {
        name: 'Studio Single',
        size: '3.5x4m',
        price: 2800000,
        features: ['Minimalist'],
        roomFacilities: ['AC', 'Smart TV', 'Kasur Springbed Single', 'Meja Belajar', 'WiFi Privat'],
        bathroomFacilities: ['Kamar Mandi Dalam', 'Water Heater', 'Closet Duduk']
      },
      {
        name: 'Grand Studio',
        size: '5x5m',
        price: 4500000,
        features: ['Spacious', 'Corner Room'],
        roomFacilities: ['AC 1.5 PK', 'Smart TV 43"', 'Kasur King Size', 'Kitchenette', 'Meja Kerja Luas', 'Balkon Pribadi'],
        bathroomFacilities: ['Kamar Mandi Dalam', 'Bathtub', 'Water Heater', 'Closet Duduk Smart']
      }
    ],
    reviews: [],
    location: {
      lat: -6.362,
      lng: 106.832
    },
    createdAt: new Date().toISOString()
  },
  {
    id: '3',
    ownerUid: 'owner_3',
    status: 'published',
    title: 'Kost Campur Manggala',
    type: 'Campur',
    address: 'Coblong, Bandung',
    city: 'Bandung',
    price: 1500000,
    imageUrls: [
      'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&q=80&w=800'
    ],
    isVerified: true,
    tiktokUrl: 'https://tiktok.com',
    facilities: ['Parkir Mobil Luas', 'WiFi', 'Rooftop Area', 'Security 24 Jam'],
    campuses: [{ name: 'Institut Teknologi Bandung', distance: '8 Menit', transportMode: 'motorcycle' }],
    rating: 4.5,
    description: 'Kost campur dengan suasana asri Bandung. Memiliki rooftop yang nyaman untuk belajar kelompok.',
    rules: ['Campur (Ketentuan Berlaku)', 'Bebas Jam Malam', 'Dilarang membawa hewan peliharaan'],
    roomTypes: [
      {
        name: 'Tipe A (Non-AC)',
        size: '3x3m',
        price: 1500000,
        features: ['Udara Sejuk Bandung'],
        roomFacilities: ['Kasur', 'Lemari', 'Meja'],
        bathroomFacilities: ['Kamar Mandi Dalam', 'Air Dingin']
      },
      {
        name: 'Tipe B (AC + Heater)',
        size: '3x3.5m',
        price: 2100000,
        features: ['Komplit'],
        roomFacilities: ['AC', 'Kasur Springbed', 'Meja Belajar', 'Lemari'],
        bathroomFacilities: ['Kamar Mandi Dalam', 'Water Heater']
      }
    ],
    reviews: [],
    location: {
      lat: -6.891,
      lng: 107.611
    },
    createdAt: new Date().toISOString()
  }
];

export const FORMAT_CURRENCY = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
};
