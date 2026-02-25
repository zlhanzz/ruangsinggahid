
export enum UserRole {
  USER = 'user',
  OWNER = 'owner',
  ADMIN = 'admin'
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
}

export interface Booking {
  id: string;
  kostId: string;
  kostName: string;
  userId: string;
  userName: string;
  variantName: string;
  durationMonths: number;
  startDate: string;
  totalPrice: number;
  status: 'Pending' | 'Confirmed' | 'Paid' | 'Cancelled';
  createdAt: string;
}

export type PricingPeriod = 'harian' | 'mingguan' | 'bulanan' | '3bulanan' | '6bulanan' | 'tahunan';

export interface RoomPricing {
  period: PricingPeriod;
  price: number;
}

export interface RoomType {
  name: string;
  size: string;
  price: number; // Base price (usually monthly, kept for sorting)
  pricing?: RoomPricing[]; // New flexible pricing array
  features: string[]; // General specs/highlights (e.g. "Termasuk Listrik", "Lantai 1")
  roomFacilities: string[]; // Specific room items (e.g. "Kasur", "Lemari")
  bathroomFacilities: string[]; // Bathroom specifics
  isAvailable?: boolean; // Availability status
}

export interface Review {
  user: string;
  rating: number;
  comment: string;
  date: string;
}

export interface VideoUrlObject {
  original: string;
}

export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface Kost {
  id: string;
  ownerUid: string; // Replaced ownerId
  title: string; // Replaced name
  description: string;
  price: number; // Replaced pricePerMonth (Base price)
  facilities: string[]; // General/Building facilities
  address: string; // Replaced location string
  location: GeoLocation; // Replaced latitude/longitude
  imageUrls: (string | ImageUrlObject)[]; // Replaced imageUrl and gallery
  videoUrls?: (string | VideoUrlObject)[]; // Added for video support
  instagramUrl?: string; // New: Link to Instagram Review
  tiktokUrl?: string;    // New: Link to TikTok Review
  status: 'draft' | 'published'; // Replaced 'Aktif' | 'Draft'
  createdAt: string;
  updatedAt?: string;

  // App specific fields
  city: string;
  campus: string;
  type: 'Putra' | 'Putri' | 'Campur';
  isVerified: boolean;
  distanceToCampus: string;
  rating: number;
  rules: string[];
  roomTypes: RoomType[];
  reviews: Review[];
  virtualTourUrl?: string;
}

export interface ImageUrlObject {
  original: string;
  webp?: string;
  thumbnail?: string;
}

export interface DatabaseProduct {
  id: string;
  campus: string; // campusName
  city: string;
  area: string;
  description: string;
  price: number;
  totalData: number; // Estimated count of kosts in file
  fileUrls: {
    excel?: string;
    pdf?: string;
    googleDrive?: string;
    coverImage?: ImageUrlObject;
  };
  fileType: 'link' | 'upload'; // Google Drive Link or Direct Upload
  fileName?: string; // Original filename if upload
  status: 'available' | 'archived';
  createdAt: string;
  updatedAt?: string;
}

export type Property = Kost;

export enum Page {
  HOME = 'home',
  LISTINGS = 'listings',
  PRODUCTS = 'products',
  OWNER = 'owner',
  ABOUT = 'about',
  CONTACT = 'contact',
  LOGIN = 'login',
  DETAIL = 'detail',
  DASHBOARD_OWNER = 'dashboard_owner',
  DASHBOARD_ADMIN = 'dashboard_admin',
  CHAT = 'chat',
  MY_BOOKINGS = 'my_bookings',
  PROFILE = 'profile',
  SURVEY_SERVICE = 'survey_service'
}
