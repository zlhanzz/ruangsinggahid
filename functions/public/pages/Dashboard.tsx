
import React, { useState, useEffect, useRef } from 'react';
import { Kost, RoomType, RoomPricing, PricingPeriod, DatabaseProduct } from '../types';
import { FORMAT_CURRENCY } from '../constants';
import {
    getAdminProperties, updatePropertyStatus, deleteProperty, addPropertyWithMedia, updatePropertyWithMedia, BasicPropertyInfo,
    getAllDatabases, addDatabaseProduct, updateDatabaseProduct, deleteDatabase
} from '../adminService';
import Listings from './Listings';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar, Legend
} from 'recharts';

interface DashboardProps {
    role: string;
    onPageChange: (p: any) => void;
    listings?: Kost[];
    onAdd?: (k: Kost) => void;
    onEdit?: (k: Kost) => void;
    onDelete?: (id: string) => void;
    onRefreshListings?: () => void; // Re-fetch public listings setelah admin save
}

// Leaflet Type Definition stub
declare global {
    interface Window {
        L: any;
    }
}

// Helper Component for Leaflet Map
const LocationPicker: React.FC<{ lat: number; lng: number; onLocationChange: (lat: number, lng: number, address: string) => void }> = ({ lat, lng, onLocationChange }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const markerInstance = useRef<any>(null);

    useEffect(() => {
        if (!mapContainerRef.current) return;
        if (mapInstance.current) return; // Initialize once

        if (typeof window.L === 'undefined') {
            console.error("Leaflet API not loaded");
            return;
        }

        const L = window.L;
        const initialLocation = [lat, lng];

        // Initialize Map
        const map = L.map(mapContainerRef.current).setView(initialLocation, 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Initialize Marker
        const marker = L.marker(initialLocation, { draggable: true }).addTo(map);

        const updatePositionAndAddress = async (lat: number, lng: number) => {
            // Reverse Geocoding using Nominatim
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
                    headers: {
                        'User-Agent': 'RuangSinggah/1.0'
                    }
                });
                const data = await response.json();
                const address = data.display_name || "Alamat tidak ditemukan";
                onLocationChange(lat, lng, address);
            } catch (error) {
                console.error("Geocoding failed:", error);
                onLocationChange(lat, lng, "Gagal memuat alamat");
            }
        };

        // Listeners
        marker.on('dragend', function (event: any) {
            const marker = event.target;
            const position = marker.getLatLng();
            updatePositionAndAddress(position.lat, position.lng);
        });

        map.on('click', function (e: any) {
            marker.setLatLng(e.latlng);
            updatePositionAndAddress(e.latlng.lat, e.latlng.lng);
        });

        mapInstance.current = map;
        markerInstance.current = marker;

        // Force map invalidation to ensure tiles load correctly after rendering
        setTimeout(() => {
            map.invalidateSize();
        }, 100);

    }, []);

    // Update marker position if props change from outside
    useEffect(() => {
        if (markerInstance.current && mapInstance.current && window.L) {
            const currentLatLng = markerInstance.current.getLatLng();
            // Check difference to avoid loops
            if (Math.abs(currentLatLng.lat - lat) > 0.0001 || Math.abs(currentLatLng.lng - lng) > 0.0001) {
                const newLatLng = [lat, lng];
                markerInstance.current.setLatLng(newLatLng);
                mapInstance.current.setView(newLatLng);
            }
        }
    }, [lat, lng]);

    return <div id="map" ref={mapContainerRef} style={{ height: '400px', width: '100%', border: '1px solid #ccc', borderRadius: '0.75rem', zIndex: 0 }} />;
};

type DashboardMenu = 'analytics' | 'properties' | 'databases' | 'transactions_rent' | 'transactions_db' | 'mitra' | 'verification';

const Dashboards: React.FC<DashboardProps> = ({ role, onPageChange, listings = [], onAdd, onEdit, onDelete, onRefreshListings }) => {
    const isAdmin = role === 'admin';
    const [activeMenu, setActiveMenu] = useState<DashboardMenu>('analytics');

    // --- STATE FILTER ANALITIK ---
    const [dateFilter, setDateFilter] = useState<string>('all');
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

    // --- STATE BARU UNTUK KONFIRMASI DELETE ---
    const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string; type: 'kost' | 'database' } | null>(null);
    // --- AKHIR STATE BARU ---

    // PROPERTIES STATE
    const [adminListings, setAdminListings] = useState<BasicPropertyInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string>('info');
    const [mapAddress, setMapAddress] = useState<string>("");

    // DATABASES STATE
    const [dbProducts, setDbProducts] = useState<DatabaseProduct[]>([]);
    const [isDbModalOpen, setIsDbModalOpen] = useState(false);
    const [editingDbId, setEditingDbId] = useState<string | null>(null);
    const initialDbForm: any = { campus: '', city: '', area: '', description: '', price: 0, totalData: 0, fileType: 'link', fileUrl: '' };
    const [dbForm, setDbForm] = useState<Partial<DatabaseProduct>>(initialDbForm);
    const [dbCoverFile, setDbCoverFile] = useState<File | null>(null);
    const [dbDocFile, setDbDocFile] = useState<File | null>(null);

    // VERIFIKASI KOST STATE (Catalog)
    const [verifikasiPrice, setVerifikasiPrice] = useState<number>(70000);
    const [verifikasiDiscount, setVerifikasiDiscount] = useState<number>(0);
    const [verifikasiDescription, setVerifikasiDescription] = useState<string>("Layanan Cek Lokasi Langsung secara live videocall dengan dokumentasi lengkap dan jujur. Sangat cocok bagi Anda yang berada di luar kota dan ingin memastikan kondisi kost yang sebenarnya sebelum melakukan booking.");
    const [isSavingVerifikasi, setIsSavingVerifikasi] = useState<boolean>(false);

    // RENT TRANSACTION MODALS
    const [viewingProof, setViewingProof] = useState<{ id: string, name: string, proofUrl: string } | null>(null);
    const [viewingInvoice, setViewingInvoice] = useState<any | null>(null);
    const [viewingProfile, setViewingProfile] = useState<any | null>(null);

    // DB ORDER MODALS
    const [viewingDbProof, setViewingDbProof] = useState<{ id: string, name: string, proofUrl: string } | null>(null);
    const [viewingDbInvoice, setViewingDbInvoice] = useState<any | null>(null);
    const [viewingDbProfile, setViewingDbProfile] = useState<any | null>(null);

    // VERIFIKASI KOST MODALS
    const [viewingVerifProof, setViewingVerifProof] = useState<{ id: string, name: string, proofUrl: string } | null>(null);
    const [viewingVerifInvoice, setViewingVerifInvoice] = useState<any | null>(null);
    const [viewingVerifProfile, setViewingVerifProfile] = useState<any | null>(null);

    // Temporary state for adding tags inside room types
    const [tempTagInput, setTempTagInput] = useState<{ [key: string]: string }>({});

    // Form State (Property)
    const initialFormState: Partial<Kost> = {
        title: '', description: '', type: 'Campur', status: 'published', price: 0,
        city: 'Bogor', campus: 'IPB', address: '', distanceToCampus: '',
        location: { lat: -6.559, lng: 106.725 }, imageUrls: [], videoUrls: [], instagramUrl: '', tiktokUrl: '', facilities: [], rules: [], roomTypes: []
    };
    const [formData, setFormData] = useState<Partial<Kost>>(initialFormState);

    // File Upload State (Property)
    const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
    const [newVideoFiles, setNewVideoFiles] = useState<File[]>([]);

    const sections = [
        { id: 'info', label: 'Informasi Dasar' },
        { id: 'location', label: 'Lokasi' },
        { id: 'media', label: 'Media (Foto & Video)' },
        { id: 'facilities', label: 'Fasilitas' },
        { id: 'rooms', label: 'Tipe Kamar & Harga' },
        { id: 'rules', label: 'Peraturan' }
    ];

    const loadProperties = async () => {
        if (!isAdmin) return;
        setLoading(true);
        try {
            const data = await getAdminProperties();
            setAdminListings(data);
        } catch (error) {
            console.error("Gagal memuat properti:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadDatabases = async () => {
        if (!isAdmin) return;
        setLoading(true);
        try {
            const data = await getAllDatabases();
            setDbProducts(data);
        } catch (e) {
            console.error("Error loading databases", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeMenu === 'properties') loadProperties();
        if (activeMenu === 'databases') loadDatabases();
    }, [isAdmin, activeMenu]);

    // --- PROPERTY HANDLERS ---

    const displayListings = isAdmin ? adminListings : listings.filter(k => k.ownerUid === 'owner_1');

    const handleStatusToggle = async (id: string, currentStatus: string) => {
        try {
            const newStatus = currentStatus === 'draft' ? 'published' : 'draft';
            await updatePropertyStatus(id, newStatus);
            setAdminListings(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
        } catch (e) { alert("Gagal mengubah status publikasi."); }
    };

    const handleDelete = async (id: string, type: 'kost' | 'database', name: string) => {
        setItemToDelete({ id, name, type });
        setShowConfirmDeleteModal(true);
    };

    const confirmDeleteItem = async () => {
        if (!itemToDelete) return;

        const { id, type, name } = itemToDelete;
        const label = type === 'kost' ? 'properti' : 'database';

        // Close modal immediately and show loading state if needed, or keep modal open with loading state
        setShowConfirmDeleteModal(false);
        setIsSubmitting(true);

        try {
            if (type === 'kost') {
                await deleteProperty(id);
                loadProperties();
            } else {
                await deleteDatabase(id);
                loadDatabases();
            }
            alert(`${label.charAt(0).toUpperCase() + label.slice(1)} "${name}" berhasil dihapus!`);
            if (onDelete) onDelete(id);
        } catch (e: any) {
            alert(`Gagal menghapus ${label} "${name}": ` + (e.message || "Terjadi kesalahan"));
            console.error(`Error deleting ${type}:`, e);
        } finally {
            setIsSubmitting(false);
            setItemToDelete(null);
        }
    };

    const cancelDeleteItem = () => {
        setShowConfirmDeleteModal(false);
        setItemToDelete(null);
    };

    const handleDeleteFromModal = async () => {
        if (!editingId) return;
        // Reuse the unified delete handler logic or keep specific if needed. 
        // Since this is specific to Property Modal, we can call deleteProperty directly or use handleDelete('kost')
        // But handleDelete expects id.

        if (!window.confirm("Apakah Anda yakin ingin menghapus properti ini secara permanen? Data yang dihapus tidak dapat dikembalikan.")) return;
        setIsSubmitting(true);
        try {
            await deleteProperty(editingId);
            alert('Properti berhasil dihapus!');
            setIsModalOpen(false);
            loadProperties();
            if (onDelete) onDelete(editingId);
        } catch (e: any) {
            alert('Gagal menghapus properti: ' + (e.message || "Terjadi kesalahan"));
        } finally {
            setIsSubmitting(false);
        }
    };

    const openAddModal = () => {
        setEditingId(null);
        setFormData(initialFormState);
        setNewImageFiles([]);
        setNewVideoFiles([]);
        setMapAddress("");
        setActiveTab('info');
        setIsModalOpen(true);
    };

    const openEditModal = (kost: any) => {
        setEditingId(kost.id);
        setFormData(kost);
        setNewImageFiles([]);
        setNewVideoFiles([]);
        setMapAddress(kost.address || ""); // Pre-fill address
        setActiveTab('info');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Auto calculate minimum price based on Monthly price or lowest available
        let finalPrice = formData.price || 0;
        if (formData.roomTypes && formData.roomTypes.length > 0) {
            // Try to find monthly price first, otherwise fallback to base price logic
            const monthlyPrices = formData.roomTypes
                .map(r => r.pricing?.find(p => p.period === 'bulanan')?.price || r.price)
                .filter(p => p > 0);

            if (monthlyPrices.length > 0) {
                finalPrice = Math.min(...monthlyPrices);
            } else {
                // Fallback to any lowest price
                const allPrices = formData.roomTypes.flatMap(r => r.pricing?.map(p => p.price) || [r.price]);
                finalPrice = Math.min(...allPrices);
            }
        }

        // Use the auto-detected address if available, otherwise manual
        const finalAddress = mapAddress || formData.address;

        const commonData = { ...formData, price: finalPrice, address: finalAddress };

        try {
            if (editingId) {
                await updatePropertyWithMedia(editingId, commonData, newImageFiles, newVideoFiles);
            } else {
                await addPropertyWithMedia({ ...commonData, isVerified: true }, newImageFiles, newVideoFiles);
            }
            await loadProperties();
            if (onRefreshListings) onRefreshListings(); // Refresh public listings di App.tsx
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving property:", error);
            alert("Gagal menyimpan properti. Coba lagi.");
        } finally { setIsSubmitting(false); }
    };

    // --- DATABASE HANDLERS ---

    const openAddDbModal = () => {
        setEditingDbId(null);
        setDbForm(initialDbForm);
        setDbCoverFile(null);
        setDbDocFile(null);
        setIsDbModalOpen(true);
    };

    const openEditDbModal = (dbItem: DatabaseProduct) => {
        setEditingDbId(dbItem.id);
        setDbForm(dbItem);
        setDbCoverFile(null);
        setDbDocFile(null);
        setIsDbModalOpen(true);
    };

    const handleDbSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingDbId) {
                await updateDatabaseProduct(editingDbId, dbForm, dbCoverFile, dbDocFile);
            } else {
                if (dbForm.fileType === 'upload' && !dbDocFile) {
                    alert("Mohon upload file dokumen.");
                    setIsSubmitting(false);
                    return;
                }
                await addDatabaseProduct(dbForm, dbCoverFile, dbDocFile);
            }
            await loadDatabases();
            if (onRefreshListings) onRefreshListings(); // Refresh public listings
            setIsDbModalOpen(false);
            alert("Data database berhasil disimpan!");
        } catch (e) {
            console.error(e);
            alert("Gagal menyimpan data database.");
        } finally {
            setIsSubmitting(false);
        }
    };


    // Generic Helpers
    const addArrayItem = (field: keyof Kost, defaultValue: string = '') => {
        setFormData({ ...formData, [field]: [...(formData[field] as string[] || []), defaultValue] });
    };
    const removeArrayItem = (field: keyof Kost, index: number) => {
        const arr = [...(formData[field] as string[] || [])];
        arr.splice(index, 1); setFormData({ ...formData, [field]: arr });
    };

    // File Helpers
    const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setNewImageFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };
    const removeNewImage = (index: number) => {
        setNewImageFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleVideoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setNewVideoFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };
    const removeNewVideo = (index: number) => {
        setNewVideoFiles(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingMedia = (type: 'imageUrls' | 'videoUrls', urlToRemove: string) => {
        const currentList = formData[type] || [];
        const newList = currentList.filter(url => url !== urlToRemove);
        setFormData({ ...formData, [type]: newList });
    };

    // Room Helpers
    const addRoomType = () => {
        const newRoom: RoomType = { name: 'New Room', size: '', price: 0, pricing: [{ period: 'bulanan', price: 0 }], features: [], roomFacilities: [], bathroomFacilities: [], isAvailable: true };
        setFormData({ ...formData, roomTypes: [...(formData.roomTypes || []), newRoom] });
    };
    const updateRoomType = (index: number, field: keyof RoomType, value: any) => {
        const rooms = [...(formData.roomTypes || [])];
        rooms[index] = { ...rooms[index], [field]: value };
        setFormData({ ...formData, roomTypes: rooms });
    };

    const updateRoomPricing = (roomIndex: number, pricingIndex: number, field: keyof RoomPricing, value: any) => {
        const rooms = [...(formData.roomTypes || [])];
        const pricing = [...(rooms[roomIndex].pricing || [])];
        pricing[pricingIndex] = { ...pricing[pricingIndex], [field]: value };
        rooms[roomIndex].pricing = pricing;

        // Sync legacy price field if monthly
        if (pricing[pricingIndex].period === 'bulanan' && field === 'price') {
            rooms[roomIndex].price = Number(value);
        }

        setFormData({ ...formData, roomTypes: rooms });
    };

    const addRoomPricing = (roomIndex: number) => {
        const rooms = [...(formData.roomTypes || [])];
        const pricing = [...(rooms[roomIndex].pricing || [])];
        pricing.push({ period: '3bulanan', price: 0 });
        rooms[roomIndex].pricing = pricing;
        setFormData({ ...formData, roomTypes: rooms });
    };

    const removeRoomPricing = (roomIndex: number, pricingIndex: number) => {
        const rooms = [...(formData.roomTypes || [])];
        const pricing = [...(rooms[roomIndex].pricing || [])];
        pricing.splice(pricingIndex, 1);
        rooms[roomIndex].pricing = pricing;
        setFormData({ ...formData, roomTypes: rooms });
    };

    const removeRoomType = (index: number) => {
        const rooms = [...(formData.roomTypes || [])];
        rooms.splice(index, 1);
        setFormData({ ...formData, roomTypes: rooms });
    };

    const addRoomTag = (roomIndex: number, field: 'features' | 'roomFacilities' | 'bathroomFacilities', tag: string) => {
        if (!tag.trim()) return;
        const rooms = [...(formData.roomTypes || [])];
        const currentTags = rooms[roomIndex][field] || [];
        rooms[roomIndex][field] = [...currentTags, tag];
        setFormData({ ...formData, roomTypes: rooms });
        setTempTagInput({ ...tempTagInput, [`${roomIndex}-${field}`]: '' });
    };

    const removeRoomTag = (roomIndex: number, field: 'features' | 'roomFacilities' | 'bathroomFacilities', tagIndex: number) => {
        const rooms = [...(formData.roomTypes || [])];
        const currentTags = rooms[roomIndex][field] || [];
        currentTags.splice(tagIndex, 1);
        rooms[roomIndex][field] = currentTags;
        setFormData({ ...formData, roomTypes: rooms });
    };

    // --- Render Content Helper ---
    const renderSectionContent = (sectionId: string) => {
        switch (sectionId) {
            case 'info':
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Kost</label>
                                <input required type="text" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-orange-500" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Contoh: Kost Orange Dramaga" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipe Kost</label>
                                <select className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-orange-500" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })}>
                                    <option value="Putra">Putra</option>
                                    <option value="Putri">Putri</option>
                                    <option value="Campur">Campur</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Deskripsi Lengkap</label>
                            <textarea rows={6} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-orange-500" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Jelaskan keunggulan kost..." />
                        </div>
                    </div>
                );
            case 'location':
                return (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-900">Lokasi Kost (dengan Peta)</h3>
                            <div className="rounded-xl overflow-hidden border border-gray-200">
                                <LocationPicker
                                    lat={formData.location?.lat || -6.559}
                                    lng={formData.location?.lng || 106.725}
                                    onLocationChange={(lat, lng, address) => {
                                        setFormData({ ...formData, location: { lat, lng } });
                                        setMapAddress(address);
                                    }}
                                />
                            </div>
                            <p className="text-xs text-gray-500 italic">Klik di peta untuk menentukan lokasi, atau seret penanda.</p>
                        </div>

                        {/* Inputs requested by user */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="addressInput" className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Alamat Terpilih:</label>
                                <input
                                    type="text"
                                    id="addressInput"
                                    readOnly
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium outline-none text-gray-600"
                                    value={mapAddress}
                                    placeholder="Alamat akan muncul di sini"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label htmlFor="lokasiLat" className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Latitude:</label>
                                    <input
                                        type="number"
                                        id="lokasiLat"
                                        step="any"
                                        readOnly
                                        required
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none cursor-not-allowed text-gray-500"
                                        value={formData.location?.lat}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="lokasiLng" className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Longitude:</label>
                                    <input
                                        type="number"
                                        id="lokasiLng"
                                        step="any"
                                        readOnly
                                        required
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none cursor-not-allowed text-gray-500"
                                        value={formData.location?.lng}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-gray-100 pt-6"></div>

                        {/* Additional fields needed for the app */}
                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kota</label>
                                <input type="text" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-orange-500" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kampus Terdekat</label>
                                <input type="text" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-orange-500" value={formData.campus} onChange={e => setFormData({ ...formData, campus: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Detail Alamat (Nomor Rumah/RT/RW)</label>
                            <textarea rows={2} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-orange-500" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Detail manual..." />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Jarak ke Kampus (Teks)</label>
                            <input type="text" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-orange-500" value={formData.distanceToCampus} onChange={e => setFormData({ ...formData, distanceToCampus: e.target.value })} placeholder="Contoh: 5 Menit Jalan Kaki" />
                        </div>
                    </div>
                );
            case 'media':
                return (
                    <div className="space-y-8">
                        {/* Images Section */}
                        <div className="space-y-4">
                            <h4 className="font-bold text-gray-900">Galeri Foto</h4>

                            {formData.imageUrls && formData.imageUrls.length > 0 && (
                                <div className="grid grid-cols-4 gap-4 mb-4">
                                    {formData.imageUrls.map((url, i) => (
                                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                                            <img src={url} className="w-full h-full object-cover" alt="" />
                                            <button type="button" onClick={() => removeExistingMedia('imageUrls', url)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {newImageFiles.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs text-green-600 font-bold">Foto Baru:</p>
                                    <div className="grid grid-cols-4 gap-4">
                                        {newImageFiles.map((file, i) => (
                                            <div key={i} className="relative aspect-square rounded-xl overflow-hidden group border-2 border-green-200">
                                                <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="" />
                                                <button type="button" onClick={() => removeNewImage(i)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-2xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <svg className="w-8 h-8 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <p className="text-sm text-gray-500 font-bold">Klik untuk upload foto</p>
                                </div>
                                <input type="file" className="hidden" multiple accept="image/*" onChange={handleImageFileSelect} />
                            </label>
                        </div>

                        {/* Videos Section */}
                        <div className="space-y-4 pt-4 border-t border-gray-200">
                            <h4 className="font-bold text-gray-900">Video Tour</h4>

                            {formData.videoUrls && formData.videoUrls.length > 0 && (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                                    {formData.videoUrls.map((url, i) => (
                                        <div key={i} className="relative aspect-video rounded-xl overflow-hidden group bg-black">
                                            <video src={url} className="w-full h-full object-cover opacity-60" />
                                            <button type="button" onClick={() => removeExistingMedia('videoUrls', url)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 z-10"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {newVideoFiles.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs text-green-600 font-bold">Video Baru:</p>
                                    <div className="grid grid-cols-3 gap-4">
                                        {newVideoFiles.map((file, i) => (
                                            <div key={i} className="relative aspect-video rounded-xl overflow-hidden group border-2 border-green-200 bg-gray-100 flex items-center justify-center">
                                                <span className="text-xs font-bold text-gray-500">{file.name}</span>
                                                <button type="button" onClick={() => removeNewVideo(i)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-2xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <svg className="w-8 h-8 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                    <p className="text-sm text-gray-500 font-bold">Klik untuk upload video</p>
                                </div>
                                <input type="file" className="hidden" multiple accept="video/*" onChange={handleVideoFileSelect} />
                            </label>
                        </div>

                        {/* Social Media Links Section */}
                        <div className="space-y-4 pt-4 border-t border-gray-200">
                            <h4 className="font-bold text-gray-900">Tautan Review Social Media</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Instagram Review Link</label>
                                    <input type="text" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" value={formData.instagramUrl} onChange={e => setFormData({ ...formData, instagramUrl: e.target.value })} placeholder="https://instagram.com/reel/..." />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">TikTok Review Link</label>
                                    <input type="text" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" value={formData.tiktokUrl} onChange={e => setFormData({ ...formData, tiktokUrl: e.target.value })} placeholder="https://tiktok.com/@..." />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'facilities':
                return (
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <input type="text" id="facilityInput" placeholder="Tambah Fasilitas (Contoh: WiFi, Parkir)" className="flex-grow bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none" onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addArrayItem('facilities', (e.target as HTMLInputElement).value), (e.target as HTMLInputElement).value = '')} />
                            <button type="button" onClick={() => { const input = document.getElementById('facilityInput') as HTMLInputElement; addArrayItem('facilities', input.value); input.value = ''; }} className="bg-gray-900 text-white px-6 rounded-xl font-bold">Tambah</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {formData.facilities?.map((f, i) => (
                                <div key={i} className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                                    {f}
                                    <button type="button" onClick={() => removeArrayItem('facilities', i)} className="text-red-500 hover:bg-red-50 rounded-full p-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'rooms':
                return (
                    <div className="space-y-8">
                        {formData.roomTypes?.map((room, idx) => (
                            <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-200 space-y-4 relative">
                                <button type="button" onClick={() => removeRoomType(idx)} className="absolute top-4 right-4 text-red-500 hover:bg-red-50 p-2 rounded-xl text-xs font-bold">Hapus Tipe Kamar</button>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-12">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Tipe</label>
                                        <input type="text" className="w-full border-b-2 border-gray-100 py-2 font-bold focus:border-orange-500 outline-none" value={room.name} onChange={e => updateRoomType(idx, 'name', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ukuran</label>
                                        <input type="text" className="w-full border-b-2 border-gray-100 py-2 font-bold focus:border-orange-500 outline-none" value={room.size} onChange={e => updateRoomType(idx, 'size', e.target.value)} />
                                    </div>
                                </div>

                                {/* PRICING SCHEMES */}
                                <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                                    <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-3 block">Skema Harga</label>
                                    <div className="space-y-3">
                                        {room.pricing?.map((scheme, pIdx) => (
                                            <div key={pIdx} className="flex gap-4 items-center">
                                                <select
                                                    value={scheme.period}
                                                    onChange={(e) => updateRoomPricing(idx, pIdx, 'period', e.target.value)}
                                                    className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold"
                                                >
                                                    <option value="bulanan">Bulanan</option>
                                                    <option value="3bulanan">3 Bulan</option>
                                                    <option value="6bulanan">6 Bulan</option>
                                                    <option value="tahunan">Tahunan</option>
                                                    <option value="mingguan">Mingguan</option>
                                                    <option value="harian">Harian</option>
                                                </select>
                                                <input
                                                    type="number"
                                                    value={scheme.price}
                                                    onChange={(e) => updateRoomPricing(idx, pIdx, 'price', Number(e.target.value))}
                                                    className="flex-grow bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold"
                                                    placeholder="Harga"
                                                />
                                                <button type="button" onClick={() => removeRoomPricing(idx, pIdx)} className="text-red-400 hover:text-red-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                            </div>
                                        ))}
                                        <button type="button" onClick={() => addRoomPricing(idx)} className="text-xs font-bold text-orange-600 hover:underline">+ Tambah Skema Harga</button>
                                    </div>
                                </div>

                                {/* FEATURES TAGS */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Fasilitas Kamar</label>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {room.roomFacilities?.map((tag, tIdx) => (
                                                <span key={tIdx} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">{tag} <button type="button" onClick={() => removeRoomTag(idx, 'roomFacilities', tIdx)}>&times;</button></span>
                                            ))}
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="+ Tambah (Enter)"
                                            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2"
                                            value={tempTagInput[`${idx}-roomFacilities`] || ''}
                                            onChange={(e) => setTempTagInput({ ...tempTagInput, [`${idx}-roomFacilities`]: e.target.value })}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    addRoomTag(idx, 'roomFacilities', (e.target as HTMLInputElement).value);
                                                }
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Fasilitas Kamar Mandi</label>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {room.bathroomFacilities?.map((tag, tIdx) => (
                                                <span key={tIdx} className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">{tag} <button type="button" onClick={() => removeRoomTag(idx, 'bathroomFacilities', tIdx)}>&times;</button></span>
                                            ))}
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="+ Tambah (Enter)"
                                            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2"
                                            value={tempTagInput[`${idx}-bathroomFacilities`] || ''}
                                            onChange={(e) => setTempTagInput({ ...tempTagInput, [`${idx}-bathroomFacilities`]: e.target.value })}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    addRoomTag(idx, 'bathroomFacilities', (e.target as HTMLInputElement).value);
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={room.isAvailable !== false} onChange={e => updateRoomType(idx, 'isAvailable', e.target.checked)} className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500" />
                                        <span className="text-sm font-bold text-gray-700">Kamar Tersedia</span>
                                    </label>
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={addRoomType} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 font-bold hover:border-orange-500 hover:text-orange-500 transition-colors">
                            + Tambah Tipe Kamar
                        </button>
                    </div>
                );
            default: return null;
        }
    };

    // --- DUMMY DATA UNTUK UI BARU ---
    const dummyTransactions = [
        {
            id: 'TRX-2026-001',
            // Profil Penyewa
            name: 'Budi Santoso',
            email: 'budi.santoso@gmail.com',
            phone: '6281234567890',
            occupation: 'Mahasiswa S1',
            institution: 'Institut Pertanian Bogor',
            gender: 'Pria',
            religion: 'Islam',
            relationshipStatus: 'Single',
            profileAddress: 'Jl. Raya Dramaga No. 45, Bogor Barat, Jawa Barat 16680',
            photoURL: 'https://i.pravatar.cc/150?img=11',
            // Detail Transaksi
            item: 'KOST MADANI',
            address: 'Dramaga, Bogor',
            roomType: 'Standard (Kipas)',
            periodLabel: 'Bulanan',
            paymentType: 'transfer',
            paymentMethod: 'Transfer Bank BCA',
            paymentBank: 'BCA',
            transferProofUrl: 'https://images.unsplash.com/photo-1554774853-d50f9c681ae2?w=600&q=80',
            date: '2026-02-24',
            startDate: '2026-03-01',
            endDate: '2026-04-01',
            status: 'Menunggu',
            amount: 850000,
            platformFee: 15000,
            invoiceId: 'INV-2026-001',
        },
        {
            id: 'TRX-2026-002',
            name: 'Siti Aminah',
            email: 'siti.aminah@outlook.com',
            phone: '6289876543210',
            occupation: 'Karyawan Swasta',
            institution: 'PT. Telekomunikasi Indonesia',
            gender: 'Wanita',
            religion: 'Islam',
            relationshipStatus: 'Single',
            profileAddress: 'Jl. Margonda Raya No. 12, Depok, Jawa Barat 16431',
            photoURL: 'https://i.pravatar.cc/150?img=5',
            item: 'Kost Melati',
            address: 'Margonda, Depok',
            roomType: 'Deluxe (AC)',
            periodLabel: '3 Bulan',
            paymentType: 'gateway',
            paymentMethod: 'Midtrans - GoPay',
            paymentBank: null,
            transferProofUrl: null,
            date: '2026-02-23',
            startDate: '2026-02-28',
            endDate: '2026-05-28',
            status: 'Selesai',
            amount: 3600000,
            platformFee: 45000,
            invoiceId: 'INV-2026-002',
        },
        {
            id: 'TRX-2026-003',
            name: 'Ahmad Fauzi',
            email: 'ahmad.fauzi@yahoo.com',
            phone: '6285555123456',
            occupation: 'Dosen / Peneliti',
            institution: 'Universitas Indonesia',
            gender: 'Pria',
            religion: 'Islam',
            relationshipStatus: 'Menikah',
            profileAddress: 'Jl. Pemuda No. 8, Rawamangun, Jakarta Timur 13220',
            photoURL: 'https://i.pravatar.cc/150?img=15',
            item: 'Kost Orange Residence',
            address: 'Dramaga, Bogor',
            roomType: 'Executive VIP',
            periodLabel: 'Tahunan',
            paymentType: 'transfer',
            paymentMethod: 'Transfer Bank Mandiri',
            paymentBank: 'Mandiri',
            transferProofUrl: 'https://images.unsplash.com/photo-1554772954-84b39f8e1b49?w=600&q=80',
            date: '2026-02-22',
            startDate: '2026-03-10',
            endDate: '2027-03-10',
            status: 'Ditolak',
            amount: 25000000,
            platformFee: 250000,
            invoiceId: 'INV-2026-003',
        },
    ];
    const dummyVerifications = [
        {
            id: 'SRV-2026-001',
            // Profil Pemesan
            name: 'Rizal Firmansyah',
            email: 'rizal.firmansyah@gmail.com',
            phone: '6281388990011',
            photoURL: 'https://i.pravatar.cc/150?img=3',
            // Detail Kost Tujuan
            kostName: 'Kost Bintang Mas (Link: goo.gl/maps/xxx)',
            ownerPhone: '6281234000111',
            kostAddress: 'Jl. Babakan Raya No. 12, Dramaga, Bogor 16680',
            source: 'Database RuangSinggah',
            // Jadwal Video Call
            surveyDate: '2026-03-05',
            surveyTime: '10:00',
            notes: 'Tolong cek air kamar mandi dan pastikan ada ventilasi / jendela yang bisa dibuka. Cek juga sinyal wifi di dalam kamar.',
            // Pesanan
            date: '2026-02-24',
            status: 'Menunggu',
            amount: 70000,
            platformFee: 0,
            invoiceId: 'INV-SRV-001',
            paymentType: 'transfer',
            paymentMethod: 'Transfer Bank BRI',
            transferProofUrl: 'https://images.unsplash.com/photo-1554774853-d50f9c681ae2?w=600&q=80',
        },
        {
            id: 'SRV-2026-002',
            name: 'Dita Amelia',
            email: 'dita.amelia@outlook.com',
            phone: '6285299887766',
            photoURL: 'https://i.pravatar.cc/150?img=9',
            kostName: 'Kost Melati Indah Depok',
            ownerPhone: '6287788990000',
            kostAddress: 'Jl. Margonda Raya No. 99, Beji, Depok 16423',
            source: 'Sosial Media (IG/TikTok)',
            surveyDate: '2026-03-07',
            surveyTime: '14:00',
            notes: 'Cek sinyal internet di kamar, akses kunci pagar malam hari, dan kondisi kamar mandi bersama.',
            date: '2026-02-25',
            status: 'Dijadwalkan',
            amount: 70000,
            platformFee: 0,
            invoiceId: 'INV-SRV-002',
            paymentType: 'gateway',
            paymentMethod: 'Midtrans - QRIS',
            transferProofUrl: null,
        },
    ];
    const dummyMitra = [
        { id: 'MTR-001', name: 'Pak Haji Rohim', phone: '6281234568900', email: 'haji.rohim@email.com', date: '2026-02-21', status: 'Diproses', city: 'Bogor', propertyCount: 3, businessType: 'Kos-kosan' },
        { id: 'MTR-002', name: 'Ibu Sari Dewi', phone: '6285678901234', email: 'sari.dewi@email.com', date: '2026-02-22', status: 'Menunggu', city: 'Depok', propertyCount: 1, businessType: 'Kontrakan' },
    ];
    const dummyDbOrders = [
        {
            id: 'DB-ORD-001',
            // Profil Pembeli
            name: 'Kevin Pratama',
            email: 'kevin.pratama@gmail.com',
            phone: '6281377223344',
            occupation: 'Mahasiswa S2',
            institution: 'Universitas Gadjah Mada',
            gender: 'Pria',
            religion: 'Kristen Protestan',
            relationshipStatus: 'Single',
            profileAddress: 'Jl. Kaliurang KM 5, Sleman, Yogyakarta 55281',
            photoURL: 'https://i.pravatar.cc/150?img=7',
            // Detail Pembelian
            dbName: 'Data Mahasiswa Kost Bogor Raya 2024',
            dbType: 'Data Mahasiswa',
            dbCity: 'Bogor',
            dbYear: '2024',
            date: '2026-02-24',
            status: 'Menunggu',
            amount: 150000,
            platformFee: 5000,
            invoiceId: 'INV-DB-001',
            paymentType: 'transfer',
            paymentMethod: 'Transfer Bank Mandiri',
            transferProofUrl: 'https://images.unsplash.com/photo-1554772954-84b39f8e1b49?w=600&q=80',
        },
        {
            id: 'DB-ORD-002',
            name: 'Anisa Rahayu',
            email: 'anisa.rahayu@yahoo.com',
            phone: '6285611122233',
            occupation: 'Karyawan Swasta',
            institution: 'PT. Startup Digital Indonesia',
            gender: 'Wanita',
            religion: 'Islam',
            relationshipStatus: 'Single',
            profileAddress: 'Jl. TB Simatupang No. 48, Pasar Minggu, Jakarta Selatan 12520',
            photoURL: 'https://i.pravatar.cc/150?img=47',
            dbName: 'Database Pencari Kost Depok 2024 – Semester Genap',
            dbType: 'Data Pencari Kost',
            dbCity: 'Depok',
            dbYear: '2024',
            date: '2026-02-23',
            status: 'Selesai',
            amount: 120000,
            platformFee: 5000,
            invoiceId: 'INV-DB-002',
            paymentType: 'gateway',
            paymentMethod: 'Midtrans - GoPay',
            transferProofUrl: null,
        },
    ];


    const renderSidebar = () => (
        <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-80px)] hidden md:flex flex-col sticky top-20 z-10">
            <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Admin Panel</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Sistem Manajemen</p>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                <SidebarItem icon="📊" label="Ringkasan Analisis" isActive={activeMenu === 'analytics'} onClick={() => setActiveMenu('analytics')} />

                <div className="pt-4 pb-2">
                    <p className="px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Katalog Utama</p>
                </div>
                <SidebarItem icon="🏠" label="Kelola Kost" isActive={activeMenu === 'properties'} onClick={() => setActiveMenu('properties')} />
                <SidebarItem icon="🗄️" label="Kelola Database" isActive={activeMenu === 'databases'} onClick={() => setActiveMenu('databases')} />
                <SidebarItem icon="🛡️" label="Verifikasi Kost" isActive={activeMenu === 'verification'} onClick={() => setActiveMenu('verification')} />

                <div className="pt-4 pb-2">
                    <p className="px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Transaksi & Klien</p>
                </div>
                <SidebarItem icon="🛒" label="Sewa Kost" isActive={activeMenu === 'transactions_rent'} onClick={() => setActiveMenu('transactions_rent')} />
                <SidebarItem icon="📦" label="Pembelian DB" isActive={activeMenu === 'transactions_db'} onClick={() => setActiveMenu('transactions_db')} />

                <div className="pt-4 pb-2">
                    <p className="px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Permohonan</p>
                </div>
                <SidebarItem icon="✅" label="Verifikasi Kost" isActive={activeMenu === 'verifikasi'} onClick={() => setActiveMenu('verifikasi')} />
                <SidebarItem icon="🤝" label="Pendaftar Mitra" isActive={activeMenu === 'mitra'} onClick={() => setActiveMenu('mitra')} />
            </nav>
        </aside>
    );

    const SidebarItem = ({ icon, label, isActive, onClick }: { icon: string, label: string, isActive: boolean, onClick: () => void }) => (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${isActive ? 'bg-orange-50 text-orange-600 font-bold' : 'text-gray-600 hover:bg-gray-50 font-semibold'
                }`}
        >
            <span className="text-lg">{icon}</span>
            <span className="text-xs uppercase tracking-wide">{label}</span>
        </button>
    );

    const currentYear = new Date().getFullYear();

    // --- DUMMY DATA UNTUK GRAFIK ---
    const generateTrendData = (filter: string, startDate?: string, endDate?: string, year?: string) => {
        if (filter === 'hari_ini') {
            return [
                { time: '00:00', pengguna: 5, sewa: 0, db: 1, verifikasi: 1, pendapatan: 500000 },
                { time: '04:00', pengguna: 8, sewa: 1, db: 2, verifikasi: 0, pendapatan: 800000 },
                { time: '08:00', pengguna: 25, sewa: 3, db: 5, verifikasi: 2, pendapatan: 2500000 },
                { time: '12:00', pengguna: 45, sewa: 8, db: 12, verifikasi: 4, pendapatan: 5200000 },
                { time: '16:00', pengguna: 35, sewa: 6, db: 9, verifikasi: 3, pendapatan: 4000000 },
                { time: '20:00', pengguna: 55, sewa: 12, db: 18, verifikasi: 6, pendapatan: 7500000 },
            ];
        } else if (filter === 'minggu_ini') {
            return [
                { time: 'Sen', pengguna: 120, sewa: 15, db: 25, verifikasi: 8, pendapatan: 12500000 },
                { time: 'Sel', pengguna: 85, sewa: 10, db: 18, verifikasi: 5, pendapatan: 8500000 },
                { time: 'Rab', pengguna: 150, sewa: 22, db: 30, verifikasi: 12, pendapatan: 18000000 },
                { time: 'Kam', pengguna: 110, sewa: 14, db: 22, verifikasi: 7, pendapatan: 11000000 },
                { time: 'Jum', pengguna: 90, sewa: 12, db: 20, verifikasi: 6, pendapatan: 9500000 },
                { time: 'Sab', pengguna: 180, sewa: 25, db: 40, verifikasi: 15, pendapatan: 22000000 },
                { time: 'Min', pengguna: 210, sewa: 30, db: 45, verifikasi: 20, pendapatan: 27000000 },
            ];
        } else if (filter === 'bulan_ini') {
            return [
                { time: 'Minggu 1', pengguna: 450, sewa: 60, db: 120, verifikasi: 35, pendapatan: 55000000 },
                { time: 'Minggu 2', pengguna: 520, sewa: 75, db: 140, verifikasi: 42, pendapatan: 68000000 },
                { time: 'Minggu 3', pengguna: 480, sewa: 65, db: 130, verifikasi: 38, pendapatan: 62000000 },
                { time: 'Minggu 4', pengguna: 610, sewa: 85, db: 160, verifikasi: 50, pendapatan: 81000000 },
            ];
        } else if (filter === 'tahunan') {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
            const multiplier = year === '2025' ? 0.8 : year === '2026' ? 1.2 : 1.5;
            return months.map(m => ({
                time: m,
                pengguna: Math.floor((Math.random() * 500 + 500) * multiplier),
                sewa: Math.floor((Math.random() * 50 + 50) * multiplier),
                db: Math.floor((Math.random() * 80 + 80) * multiplier),
                verifikasi: Math.floor((Math.random() * 40 + 20) * multiplier),
                pendapatan: Math.floor((Math.random() * 50000000 + 50000000) * multiplier)
            }));
        } else if (filter === 'custom' && startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (end < start) return [{ time: 'Error Date', pengguna: 0, sewa: 0, db: 0, pendapatan: 0 }];

            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            const points = [];
            const dataCount = diffDays <= 14 ? diffDays + 1 : diffDays <= 30 ? 4 : Math.ceil(diffDays / 7);
            const interval = diffDays <= 14 ? 1 : diffDays <= 30 ? 7 : Math.ceil(diffDays / dataCount);

            let currentDate = new Date(start);
            for (let i = 0; i < dataCount; i++) {
                if (currentDate > end) break;
                const label = diffDays <= 14
                    ? `${currentDate.getDate()}/${currentDate.getMonth() + 1}`
                    : `P${i + 1} (${currentDate.getDate()}/${currentDate.getMonth() + 1})`;

                points.push({
                    time: label,
                    pengguna: Math.floor(Math.random() * 400 + 200),
                    sewa: Math.floor(Math.random() * 30 + 10),
                    db: Math.floor(Math.random() * 50 + 20),
                    verifikasi: Math.floor(Math.random() * 20 + 5),
                    pendapatan: Math.floor(Math.random() * 30000000 + 10000000)
                });
                currentDate.setDate(currentDate.getDate() + interval);
            }
            if (points.length === 0) {
                points.push({ time: `${start.getDate()}/${start.getMonth() + 1}`, pengguna: 10, sewa: 1, db: 2, verifikasi: 1, pendapatan: 1000000 });
            }
            return points;
        } else {
            // Filter "Semua Waktu" -> Data per tahun dari 2025 sampai tahun sekarang
            const years = Array.from({ length: currentYear - 2025 + 1 }, (_, i) => 2025 + i);
            return years.map(y => ({
                time: y.toString(),
                pengguna: Math.floor(Math.random() * 2000 + 1000),
                sewa: Math.floor(Math.random() * 200 + 50),
                db: Math.floor(Math.random() * 300 + 100),
                verifikasi: Math.floor(Math.random() * 150 + 50),
                pendapatan: Math.floor(Math.random() * 200000000 + 100000000)
            }));
        }
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-xl z-50">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} className="text-xs font-bold" style={{ color: entry.color }}>
                            {entry.name}: {entry.name.toLowerCase().includes('pendapatan') ? FORMAT_CURRENCY(entry.value) : entry.value}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    const renderAnalytics = () => {
        // Mock data logic based on dateFilter
        const trendData = generateTrendData(dateFilter, customStartDate, customEndDate, selectedYear);
        let kostMultiplier = 1;
        let dbMultiplier = 1;
        let verifMultiplier = 1;

        if (dateFilter === 'hari_ini') {
            kostMultiplier = 0.05;
            dbMultiplier = 0.1;
            verifMultiplier = 0.08;
        } else if (dateFilter === 'minggu_ini') {
            kostMultiplier = 0.2;
            dbMultiplier = 0.3;
            verifMultiplier = 0.25;
        } else if (dateFilter === 'bulan_ini') {
            kostMultiplier = 0.6;
            dbMultiplier = 0.5;
            verifMultiplier = 0.7;
        } else if (dateFilter === 'tahunan') {
            kostMultiplier = 6.0;
            dbMultiplier = 5.0;
            verifMultiplier = 6.5;
        }

        const getMaxEndDate = () => {
            if (!customStartDate) return undefined;
            const start = new Date(customStartDate);
            start.setMonth(start.getMonth() + 3);
            return start.toISOString().split('T')[0];
        };

        const statsKost = {
            users: Math.floor(154 * kostMultiplier),
            active: Math.max(1, Math.floor(adminListings.length * kostMultiplier)),
            revenue: 8500000 * kostMultiplier
        };

        const statsDb = {
            buyers: Math.floor(89 * dbMultiplier),
            active: Math.max(1, Math.floor(dbProducts.length * dbMultiplier)),
            revenue: 4000000 * dbMultiplier
        };

        const statsVerif = {
            orders: Math.floor(45 * verifMultiplier),
            revenue: Math.floor(45 * verifMultiplier) * (verifikasiPrice || 70000)
        };

        const generalMultiplier = Math.max(kostMultiplier, dbMultiplier);
        const statsGeneral = {
            users: Math.floor(243 * generalMultiplier), // 154 + 89
            mitra: Math.floor(12 * generalMultiplier),
            dbActive: statsDb.active,
            totalRevenue: statsKost.revenue + statsDb.revenue + statsVerif.revenue
        };

        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                {/* Header Analisis & Filter */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Ringkasan Analisis</h2>
                        <p className="text-gray-500 text-sm mt-1">Pantau performa bisnis dan pertumbuhan pengguna RuangSinggah.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 items-center w-full md:w-auto">
                        {dateFilter === 'custom' && (
                            <div className="flex gap-2 items-center bg-gray-50 p-1.5 rounded-lg border border-gray-200">
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => {
                                        setCustomStartDate(e.target.value);
                                        // Validasi: Kosongkan End Date jika melampaui batas max 3 bulan dari start date yang baru
                                        if (customEndDate) {
                                            const start = new Date(e.target.value);
                                            const end = new Date(customEndDate);
                                            const maxEnd = new Date(start);
                                            maxEnd.setMonth(start.getMonth() + 3);
                                            if (end < start || end > maxEnd) setCustomEndDate('');
                                        }
                                    }}
                                    className="text-xs bg-white border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                                <span className="text-gray-400 text-xs font-bold">-</span>
                                <input
                                    type="date"
                                    min={customStartDate}
                                    max={getMaxEndDate()}
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="text-xs bg-white border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                        )}
                        {dateFilter === 'tahunan' && (
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-xl focus:ring-orange-500 focus:border-orange-500 block p-2.5 font-bold outline-none"
                            >
                                {Array.from({ length: Math.max(1, currentYear - 2025 + 1) }, (_, i) => 2025 + i).map(year => (
                                    <option key={year} value={year.toString()}>{year}</option>
                                ))}
                            </select>
                        )}
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-xl focus:ring-orange-500 focus:border-orange-500 block w-full md:w-auto p-2.5 font-bold uppercase tracking-wider outline-none"
                        >
                            <option value="all">Semua Waktu</option>
                            <option value="hari_ini">Hari Ini</option>
                            <option value="minggu_ini">Minggu Ini</option>
                            <option value="bulan_ini">Bulan Ini</option>
                            <option value="tahunan">Tahunan</option>
                            <option value="custom">Rentang Kustom</option>
                        </select>
                    </div>
                </div>

                {/* GENERAL SUMMARY SECTION */}
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 shadow-inner">
                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="text-xl">🌐</span> Ringkasan Umum
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <StatCard title="Total Pengguna" value={statsGeneral.users.toString()} icon="👥" color="bg-blue-100 text-blue-700" />
                        <StatCard title="Total Pendapatan" value={FORMAT_CURRENCY(statsGeneral.totalRevenue)} icon="💰" color="bg-orange-100 text-orange-700" />
                        <StatCard title="Total Mitra Aktif" value={statsGeneral.mitra.toString()} icon="🤝" color="bg-emerald-100 text-emerald-700" />
                        <StatCard title="Total Database Aktif" value={statsGeneral.dbActive.toString()} icon="🗄️" color="bg-purple-100 text-purple-700" />
                    </div>

                    {/* Chart Tren Ringkasan Umum */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Tren Pengguna vs Pendapatan</h4>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorPendapatan" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorPengguna" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} dy={10} />
                                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(value) => `${value / 1000000}M`} />
                                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                    <Area yAxisId="left" type="monotone" dataKey="pendapatan" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorPendapatan)" name="Pendapatan" />
                                    <Area yAxisId="right" type="monotone" dataKey="pengguna" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorPengguna)" name="Pengguna Aktif" />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* KOST SECTION */}
                <div>
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="text-xl">🏠</span> Performa Berlangganan / Sewa Kost
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <StatCard title="Total Penyewa Baru" value={statsKost.users.toString()} icon="👥" color="bg-blue-50 text-blue-600" />
                        <StatCard title="Total Kost Tersewa" value={statsKost.active.toString()} icon="🔑" color="bg-green-50 text-green-600" />
                        <StatCard title="Pendapatan Sewa (Est)" value={FORMAT_CURRENCY(statsKost.revenue)} icon="💰" color="bg-orange-50 text-orange-600" />
                    </div>

                    {/* Chart Tren Sewa Kost */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Grafik Tren Sewa Baru</h4>
                        <div className="h-56 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={trendData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                                    <Bar dataKey="sewa" fill="#22c55e" radius={[4, 4, 0, 0]} name="Sewa Baru" maxBarSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* DB SECTION */}
                <div>
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2 mt-8">
                        <span className="text-xl">🗄️</span> Performa Penjualan Database
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <StatCard title="Total Pembeli Baru" value={statsDb.buyers.toString()} icon="🛒" color="bg-indigo-50 text-indigo-600" />
                        <StatCard title="Total File Terjual" value={statsDb.active.toString()} icon="📦" color="bg-purple-50 text-purple-600" />
                        <StatCard title="Pendapatan Penjualan DB" value={FORMAT_CURRENCY(statsDb.revenue)} icon="💳" color="bg-pink-50 text-pink-600" />
                    </div>

                    {/* Chart Tren Penjualan Database */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Grafik Tren Penjualan DB</h4>
                        <div className="h-56 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorDb" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                    <Area type="monotone" dataKey="db" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorDb)" name="Pembelian DB" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* VERIFIKASI SECTION */}
                <div>
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2 mt-8">
                        <span className="text-xl">✅</span> Performa Layanan Verifikasi Kost
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <StatCard title="Total Pesanan" value={statsVerif.orders.toString()} icon="📝" color="bg-violet-50 text-violet-600" />
                        <StatCard title="Pendapatan Verifikasi" value={FORMAT_CURRENCY(statsVerif.revenue)} icon="💰" color="bg-pink-50 text-pink-600" />
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                            <div>
                                <h4 className="font-bold text-gray-900 text-sm">Target vs Pencapaian Verifikasi Kost</h4>
                                <div className="mt-4">
                                    <div className="flex justify-between items-end mb-2">
                                        <p className="text-4xl font-black text-gray-900">{statsVerif.orders} <span className="text-sm text-gray-400 font-medium">pesanan {dateFilter !== 'all' ? 'periode ini' : ''}</span></p>
                                        <p className="text-sm font-bold text-orange-500">{FORMAT_CURRENCY(statsVerif.revenue)}</p>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
                                        <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${Math.min(100, (statsVerif.orders / 100) * 100)}%` }}></div>
                                    </div>
                                    <p className="text-xs text-gray-500 flex justify-between">
                                        <span>Target Bulanan: 100</span>
                                        <span className="font-bold">{(statsVerif.orders / 100 * 100).toFixed(0)}%</span>
                                    </p>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* NEW GRAPH FOR VERIFIKASI KOST */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mt-6">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-lg font-black text-gray-900">Performa Layanan Verifikasi Kost</h3>
                                <p className="text-xs text-gray-500 font-medium mt-1">Tren pesanan bulanan berdasarkan layanan video call langsung eksklusif.</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Pesanan Aktual</p>
                                <p className="text-xl font-bold text-gray-900">{statsVerif.orders}</p>
                            </div>
                        </div>
                        <div className="w-full h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                    <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} />
                                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={10} tickFormatter={(val) => `Rp ${val / 1000000}M`} />
                                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                                    <Bar yAxisId="left" dataKey="verifikasi" name="Jumlah Verifikasi" stroke="#8b5cf6" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                    {/* Menganimasikan tren pendapatan verifikasi berdasar harga dinamis menggunakan mapping in-place (simulasi) */}
                                    <Bar yAxisId="right" dataKey={(data) => data.verifikasi * (verifikasiPrice || 70000)} name="Pendapatan (Hrg Config)" stroke="#f59e0b" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>
            </div>
        );
    };

    const StatCard = ({ title, value, icon, color }: { title: string, value: string, icon: string, color: string }) => (
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{title}</p>
                <p className="text-xl font-black text-gray-900 mt-1">{value}</p>
            </div>
        </div>
    );

    const renderTableView = (title: string, columns: string[], data: any[]) => (
        <div className="space-y-6">
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-2">{title}</h2>
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-500">
                        <thead className="bg-gray-50/50 text-xs font-black text-gray-500 uppercase tracking-widest">
                            <tr>
                                {columns.map((col, i) => <th key={i} className="px-6 py-4">{col}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, i) => (
                                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                    {Object.values(row).map((val: any, j) => (
                                        <td key={j} className="px-6 py-4 font-medium text-gray-900">
                                            {typeof val === 'number' && j === Object.values(row).length - 1 ? FORMAT_CURRENCY(val) : val}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            {data.length === 0 && (
                                <tr>
                                    <td colSpan={columns.length} className="px-6 py-12 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">Belum ada data</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderVerifikasi = () => (
        <div className="animate-in fade-in duration-500 max-w-4xl mx-auto space-y-8 pb-10">
            <div className="bg-gradient-to-br from-violet-600 to-fuchsia-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-10 -mt-20"></div>
                <div className="relative z-10">
                    <div className="inline-flex py-1 px-3 bg-white/20 rounded-full text-[10px] font-black tracking-widest uppercase mb-4 shadow-sm backdrop-blur-md">
                        ★ Katalog Jasa RuangSinggah
                    </div>
                    <h2 className="text-3xl lg:text-4xl font-black tracking-tight drop-shadow-sm leading-tight max-w-2xl">
                        Kelola Layanan Verifikasi Kost
                    </h2>
                    <p className="text-violet-100 font-medium mt-3 text-sm lg:text-base max-w-xl leading-relaxed opacity-90">
                        Atur informasi harga, diskon, dan manfaat layanan Live Video Call Cek Lokasi yang terintegrasi langsung dengan Cart Pembayaran.
                    </p>
                </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Pengaturan Harga Layanan</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                            Harga Normal (Biaya Dasar)
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">Rp</span>
                            <input
                                type="number"
                                value={verifikasiPrice}
                                onChange={(e) => setVerifikasiPrice(Number(e.target.value))}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-4 text-gray-900 font-bold text-lg outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 focus:bg-white transition-all"
                                placeholder="Misal: 70000"
                            />
                        </div>
                        <p className="text-xs text-gray-400 font-medium">Harga aktual yang tercermin di seluruh analitik Dashboard.</p>
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-violet-400 uppercase tracking-widest flex items-center gap-1">
                            Harga Diskon (Opsional)
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">Rp</span>
                            <input
                                type="number"
                                value={verifikasiDiscount}
                                onChange={(e) => setVerifikasiDiscount(Number(e.target.value))}
                                className="w-full bg-violet-50/30 border border-violet-100 rounded-xl pl-12 pr-4 py-4 text-violet-900 font-bold text-lg outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 focus:bg-white transition-all"
                                placeholder="Harga setelah potongan, contoh: 50000"
                            />
                        </div>
                        <p className="text-xs text-gray-400 font-medium">Jika diisi, harga normal akan dicoret pada antarmuka Klien.</p>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">KONTROL DESKRIPSI (LANDING PAGE)</h3>
                </div>
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                        Teks Benefit Layanan Ekstra
                    </label>
                    <textarea
                        rows={5}
                        value={verifikasiDescription}
                        onChange={(e) => setVerifikasiDescription(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-700 font-medium text-sm leading-relaxed outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 focus:bg-white transition-all"
                        placeholder="Berikan deskripsi profesional untuk diiklankan kepada pengguna..."
                    />
                </div>

                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex gap-3">
                    <div className="text-blue-500 shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <p className="text-sm font-medium text-blue-900 leading-relaxed">
                        <strong>Efek Analitik:</strong> Nilai harga "<strong>{FORMAT_CURRENCY(verifikasiPrice)}</strong>" saat ini langsung dihubungkan dengan Grafik Performa Verifikasi pada Tab <span className="underline cursor-pointer" onClick={() => setActiveMenu('analytics')}>Ringkasan Analisis</span>. Perubahan Anda akan instan merevisi seluruh peta pendapatan layanan!
                    </p>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button
                    onClick={() => {
                        setIsSavingVerifikasi(true);
                        setTimeout(() => setIsSavingVerifikasi(false), 800);
                        alert("Katalog Layanan Verifikasi berhasil diperbarui secara global!");
                    }}
                    className={`px-8 py-3.5 rounded-xl font-bold text-white transition-all shadow-lg active:scale-95 flex items-center gap-2 ${isSavingVerifikasi ? 'bg-gray-400 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-700'}`}
                    disabled={isSavingVerifikasi}
                >
                    {isSavingVerifikasi ? (
                        <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div> Menyimpan...</>
                    ) : (
                        <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Simpan Perubahan Jasa</>
                    )}
                </button>
            </div>
        </div>
    );

    const renderRentTransactions = () => (
        <div className="space-y-6">
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-2">Manajemen Transaksi Sewa Kost</h2>
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex gap-3 mb-6">
                <div className="text-blue-500 shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <p className="text-sm font-medium text-blue-900 leading-relaxed">
                    Transaksi via <strong>Transfer Bank</strong> memerlukan verifikasi bukti mutasi manual sebelum dikonfirmasi. Transaksi via <strong>Payment Gateway</strong> terkonfirmasi otomatis oleh sistem.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {dummyTransactions.map((trx) => (
                    <div key={trx.id} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow relative overflow-hidden">
                        {trx.status === 'Selesai' && <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-bl-full -z-0"></div>}

                        <div className="flex-1 space-y-4 relative z-10">
                            <div className="flex flex-wrap justify-between items-start border-b border-gray-50 pb-4 gap-2">
                                <div>
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <span className="bg-orange-100 text-orange-700 font-bold px-2 py-1 rounded text-[10px] uppercase tracking-wider">{trx.id}</span>
                                        <span className="text-xs text-gray-400 font-medium">Order: {trx.date}</span>
                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${(trx as any).paymentType === 'gateway' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-700'}`}>
                                            {(trx as any).paymentType === 'gateway' ? '⚡ Gateway' : '🏦 Transfer Manual'}
                                        </span>
                                    </div>
                                    <p className="font-medium text-gray-500 text-sm mt-1">Penyewa: <button onClick={() => setViewingProfile(trx)} className="font-black text-orange-600 hover:text-orange-700 hover:underline underline-offset-2 transition-colors cursor-pointer text-base">{trx.name}</button></p>
                                </div>
                                <span className={`inline-flex px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg border ${trx.status === 'Menunggu' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                    trx.status === 'Selesai' ? 'bg-green-50 text-green-700 border-green-200' :
                                        'bg-red-50 text-red-700 border-red-200'
                                    }`}>
                                    {trx.status === 'Menunggu' ? 'Menunggu Konfirmasi' : trx.status}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Properti</p>
                                    <p className="text-sm font-bold text-gray-900">{trx.item}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tipe Kamar</p>
                                    <p className="text-sm font-bold text-violet-600">{trx.roomType}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Durasi Sewa</p>
                                    <p className="text-sm font-bold text-blue-600">{trx.periodLabel}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Mulai Tinggal</p>
                                    <p className="text-sm font-bold text-gray-900">{trx.startDate}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Sampai</p>
                                    <p className="text-sm font-bold text-gray-900">{(trx as any).endDate}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Metode Bayar</p>
                                    <p className={`text-sm font-bold ${(trx as any).paymentType === 'gateway' ? 'text-blue-600' : 'text-amber-600'}`}>{trx.paymentMethod}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2.5 md:w-52 shrink-0 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 relative z-10">
                            <div className="mb-1">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Total Tagihan</p>
                                <p className="text-xl font-black text-orange-500 text-right">{FORMAT_CURRENCY(trx.amount)}</p>
                                <p className="text-[11px] text-gray-400 text-right">{(trx as any).invoiceId}</p>
                            </div>

                            {(trx as any).paymentType === 'transfer' && (trx as any).transferProofUrl && (
                                <button
                                    onClick={() => setViewingProof({ id: trx.id, name: trx.name, proofUrl: (trx as any).transferProofUrl })}
                                    className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 py-2.5 rounded-xl text-xs font-bold transition-all flex justify-center items-center gap-1.5"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    Lihat Bukti Transfer
                                </button>
                            )}

                            {trx.status === 'Menunggu' && (
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => alert(`Transaksi ${trx.id} dikonfirmasi! Kamar ${trx.roomType} resmi terpesan untuk ${trx.name}.`)}
                                        className="w-full bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex justify-center items-center gap-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        Terima
                                    </button>
                                    <button
                                        onClick={() => { if (window.confirm(`Tolak transaksi ${trx.id}?`)) alert('Transaksi ditolak.'); }}
                                        className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-2.5 rounded-xl text-xs font-bold transition-all border border-red-200 active:scale-95 flex justify-center items-center gap-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        Tolak
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={() => setViewingInvoice(trx)}
                                className="w-full bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 py-2.5 rounded-xl text-xs font-bold transition-all flex justify-center items-center gap-1.5"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                Lihat Invoice
                            </button>

                            <button
                                onClick={() => window.open(`https://wa.me/${trx.phone}?text=${encodeURIComponent(`Halo ${trx.name}, saya Admin RuangSinggah.id. Kami ingin melakukan konfirmasi terkait transaksi sewa kost Anda (${trx.id}) untuk properti ${trx.item}. Mohon bantuannya. Terima kasih.`)}`, '_blank')}
                                className="w-full bg-green-50 hover:bg-green-500 text-green-600 hover:text-white border border-green-200 py-2.5 rounded-xl text-xs font-bold transition-all flex justify-center items-center gap-1.5 group"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.711.956 2.873.956 3.182 0 5.768-2.585 5.77-5.765.001-3.181-2.586-5.768-5.768-5.768zm3.333 8.33c-.15.424-.877.817-1.229.845-.306.024-.652.128-2.146-.464-1.801-.715-2.956-2.548-3.047-2.671-.09-.122-.727-.968-.727-1.844 0-.875.452-1.304.613-1.472.161-.168.351-.21.468-.21.117 0 .234.004.336.008.109.006.255-.044.398.303.151.365.518 1.264.565 1.356.046.091.077.198.016.321-.061.121-.092.197-.184.304-.092.107-.193.226-.275.319-.092.105-.188.22-.083.402.105.183.468.775 1.002 1.25.688.614 1.27.8 1.455.892.183.092.29.077.397-.038.106-.115.46-.537.583-.721.122-.184.244-.154.409-.092.165.061 1.042.492 1.221.583.179.092.298.138.341.214.043.076.043.447-.107.871z" /></svg>
                                Follow Up WA
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── MODAL: PROFIL PENYEWA ─────────────────────── */}
            {viewingProfile && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewingProfile(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        {/* Header Profil */}
                        <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-5 text-white relative shrink-0">
                            <div className="flex items-center gap-4">
                                {viewingProfile.photoURL ? (
                                    <img src={viewingProfile.photoURL} alt={viewingProfile.name} className="w-16 h-16 rounded-full border-2 border-white/30 object-cover shrink-0" />
                                ) : (
                                    <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center text-white text-xl font-black shrink-0">
                                        {viewingProfile.name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black tracking-widest uppercase opacity-60">Profil Penyewa</p>
                                    <h3 className="text-lg font-black truncate">{viewingProfile.name}</h3>
                                    <p className="text-xs opacity-70 truncate">{viewingProfile.email}</p>
                                </div>
                                <button onClick={() => setViewingProfile(null)} className="p-2 rounded-xl hover:bg-white/10 transition-colors shrink-0">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        </div>

                        {/* Body Profil */}
                        <div className="overflow-y-auto p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No. WhatsApp</p>
                                    <p className="font-bold text-gray-900 mt-0.5">{viewingProfile.phone}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Jenis Kelamin</p>
                                    <p className="font-bold text-gray-900 mt-0.5">{viewingProfile.gender || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pekerjaan</p>
                                    <p className="font-bold text-gray-900 mt-0.5">{viewingProfile.occupation || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Institusi / Kampus</p>
                                    <p className="font-bold text-gray-900 mt-0.5">{viewingProfile.institution || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Agama</p>
                                    <p className="font-bold text-gray-900 mt-0.5">{viewingProfile.religion || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status Hubungan</p>
                                    <p className="font-bold text-gray-900 mt-0.5">{viewingProfile.relationshipStatus || '-'}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Alamat Domisili</p>
                                    <p className="font-bold text-gray-900 mt-0.5 leading-relaxed">{viewingProfile.profileAddress || '-'}</p>
                                </div>
                            </div>

                            {/* Transaksi Terkait */}
                            <div className="border-t border-gray-100 pt-4">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Transaksi Terkait</p>
                                <div className="bg-gray-50 rounded-xl p-3 flex justify-between items-center">
                                    <div>
                                        <p className="text-xs font-black text-gray-500">{viewingProfile.id} · {viewingProfile.item}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{viewingProfile.roomType} · {viewingProfile.periodLabel}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${viewingProfile.status === 'Selesai' ? 'bg-green-100 text-green-700' : viewingProfile.status === 'Menunggu' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                        {viewingProfile.status}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Footer: Follow Up WA */}
                        <div className="p-4 border-t border-gray-100 shrink-0">
                            <button
                                onClick={() => window.open(`https://wa.me/${viewingProfile.phone}?text=${encodeURIComponent(`Halo ${viewingProfile.name}, saya Admin RuangSinggah.id. Kami ingin melakukan konfirmasi terkait transaksi Anda (${viewingProfile.id}) untuk properti ${viewingProfile.item}. Mohon bantuannya. Terima kasih.`)}`, '_blank')}
                                className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl text-sm font-bold transition-all flex justify-center items-center gap-2 shadow-sm"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.711.956 2.873.956 3.182 0 5.768-2.585 5.77-5.765.001-3.181-2.586-5.768-5.768-5.768zm3.333 8.33c-.15.424-.877.817-1.229.845-.306.024-.652.128-2.146-.464-1.801-.715-2.956-2.548-3.047-2.671-.09-.122-.727-.968-.727-1.844 0-.875.452-1.304.613-1.472.161-.168.351-.21.468-.21.117 0 .234.004.336.008.109.006.255-.044.398.303.151.365.518 1.264.565 1.356.046.091.077.198.016.321-.061.121-.092.197-.184.304-.092.107-.193.226-.275.319-.092.105-.188.22-.083.402.105.183.468.775 1.002 1.25.688.614 1.27.8 1.455.892.183.092.29.077.397-.038.106-.115.46-.537.583-.721.122-.184.244-.154.409-.092.165.061 1.042.492 1.221.583.179.092.298.138.341.214.043.076.043.447-.107.871z" /></svg>
                                Hubungi via WhatsApp
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: BUKTI TRANSFER ─────────────────────── */}
            {viewingProof && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewingProof(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bukti Transfer</p>
                                <h3 className="text-base font-black text-gray-900 mt-0.5">{viewingProof.id} — {viewingProof.name}</h3>
                            </div>
                            <button onClick={() => setViewingProof(null)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-4">
                            <img src={viewingProof.proofUrl} alt="Bukti Transfer" className="w-full rounded-xl border border-gray-100 object-cover max-h-80" />
                        </div>
                        <div className="bg-yellow-50 border-t border-yellow-100 px-5 py-3 flex items-center gap-2">
                            <span className="text-yellow-500 text-sm">⚠️</span>
                            <p className="text-xs text-yellow-800 font-medium">Verifikasi kesesuaian jumlah dan rekening tujuan sebelum menekan "Terima".</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: INVOICE ────────────────────────────── */}
            {viewingInvoice && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewingInvoice(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-orange-500 to-orange-400 p-5 text-white">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-black tracking-widest uppercase opacity-80">RuangSinggah.id</p>
                                    <h3 className="text-xl font-black mt-1">{viewingInvoice.invoiceId}</h3>
                                    <p className="text-xs mt-1 opacity-70">Diterbitkan: {viewingInvoice.date}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${viewingInvoice.status === 'Selesai' ? 'bg-white/30 text-white' : viewingInvoice.status === 'Menunggu' ? 'bg-yellow-300/30 text-yellow-100' : 'bg-red-300/30 text-red-100'}`}>
                                    {viewingInvoice.status}
                                </span>
                            </div>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Penyewa</p>
                                    <p className="font-bold text-gray-900">{viewingInvoice.name}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Properti</p>
                                    <p className="font-bold text-gray-900">{viewingInvoice.item}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipe Kamar</p>
                                    <p className="font-bold text-violet-600">{viewingInvoice.roomType}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Durasi</p>
                                    <p className="font-bold text-blue-600">{viewingInvoice.periodLabel}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Masa Sewa</p>
                                    <p className="font-bold text-gray-900">{viewingInvoice.startDate} — {viewingInvoice.endDate}</p>
                                </div>
                            </div>

                            <div className="border-t border-dashed border-gray-200 pt-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Biaya Sewa ({viewingInvoice.periodLabel})</span>
                                    <span className="font-bold">{FORMAT_CURRENCY(viewingInvoice.amount - viewingInvoice.platformFee)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Biaya Platform</span>
                                    <span className="font-bold">{FORMAT_CURRENCY(viewingInvoice.platformFee)}</span>
                                </div>
                                <div className="flex justify-between text-sm font-black text-gray-900 border-t border-gray-100 pt-2">
                                    <span>Total Dibayar</span>
                                    <span className="text-orange-500 text-base">{FORMAT_CURRENCY(viewingInvoice.amount)}</span>
                                </div>
                            </div>

                            <div className={`rounded-xl p-3 flex gap-3 items-center ${viewingInvoice.paymentType === 'gateway' ? 'bg-blue-50 border border-blue-100' : 'bg-amber-50 border border-amber-100'}`}>
                                <span className="text-xl shrink-0">{viewingInvoice.paymentType === 'gateway' ? '⚡' : '🏦'}</span>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Metode Pembayaran</p>
                                    <p className="font-bold text-gray-900 text-sm">{viewingInvoice.paymentMethod}</p>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-1">
                                <button onClick={() => setViewingInvoice(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-xs font-bold transition-all">
                                    Tutup
                                </button>
                                <button onClick={() => window.print()} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-xs font-bold transition-all flex justify-center items-center gap-1.5 shadow-sm">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                    Cetak Invoice
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderDbTransactions = () => (
        <div className="space-y-6">
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-2">Manajemen Pembelian Database</h2>
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex gap-3 mb-2">
                <span className="text-blue-500 shrink-0">📦</span>
                <p className="text-sm font-medium text-blue-900">Transaksi via <strong>Transfer Bank</strong> perlu verifikasi bukti pembayaran sebelum akses database diberikan kepada pembeli.</p>
            </div>
            <div className="grid grid-cols-1 gap-6">
                {dummyDbOrders.map((ordr: any) => (
                    <div key={ordr.id} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow relative overflow-hidden">
                        {ordr.status === 'Selesai' && <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-bl-full -z-0"></div>}
                        <div className="flex-1 space-y-4 relative z-10">
                            <div className="flex flex-wrap justify-between items-start border-b border-gray-50 pb-4 gap-2">
                                <div>
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <span className="bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded text-[10px] uppercase tracking-wider">{ordr.id}</span>
                                        <span className="text-xs text-gray-400 font-medium">Order: {ordr.date}</span>
                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${ordr.paymentType === 'gateway' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-700'}`}>{ordr.paymentType === 'gateway' ? '⚡ Gateway' : '🏦 Transfer Manual'}</span>
                                    </div>
                                    <p className="font-medium text-gray-500 text-sm">Pembeli: <button onClick={() => setViewingDbProfile(ordr)} className="font-black text-orange-600 hover:text-orange-700 hover:underline underline-offset-2 transition-colors text-base">{ordr.name}</button></p>
                                </div>
                                <span className={`inline-flex px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg border ${ordr.status === 'Menunggu' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : ordr.status === 'Selesai' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{ordr.status}</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Database</p><p className="text-sm font-bold text-gray-900 mt-0.5">{ordr.dbName}</p></div>
                                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Jenis Data</p><p className="text-sm font-bold text-blue-600 mt-0.5">{ordr.dbType}</p></div>
                                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kota / Tahun</p><p className="text-sm font-bold text-gray-900 mt-0.5">{ordr.dbCity} · {ordr.dbYear}</p></div>
                                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tanggal Beli</p><p className="text-sm font-bold text-gray-900 mt-0.5">{ordr.date}</p></div>
                                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Metode Bayar</p><p className={`text-sm font-bold mt-0.5 ${ordr.paymentType === 'gateway' ? 'text-blue-600' : 'text-amber-600'}`}>{ordr.paymentMethod}</p></div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2.5 md:w-52 shrink-0 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 relative z-10">
                            <div className="mb-1">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Total Tagihan</p>
                                <p className="text-xl font-black text-orange-500 text-right">{FORMAT_CURRENCY(ordr.amount + ordr.platformFee)}</p>
                                <p className="text-[11px] text-gray-400 text-right">{ordr.invoiceId}</p>
                            </div>
                            {ordr.paymentType === 'transfer' && ordr.transferProofUrl && (
                                <button onClick={() => setViewingDbProof({ id: ordr.id, name: ordr.name, proofUrl: ordr.transferProofUrl })} className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 py-2.5 rounded-xl text-xs font-bold transition-all flex justify-center items-center gap-1.5">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    Lihat Bukti Transfer
                                </button>
                            )}
                            {ordr.status === 'Menunggu' && (
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => alert(`Order ${ordr.id} dikonfirmasi! Akses database akan segera dikirim ke ${ordr.email}.`)} className="w-full bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl text-xs font-bold active:scale-95 flex justify-center items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Terima
                                    </button>
                                    <button onClick={() => { if (window.confirm(`Tolak order ${ordr.id}?`)) alert('Order ditolak.'); }} className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-2.5 rounded-xl text-xs font-bold border border-red-200 active:scale-95 flex justify-center items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>Tolak
                                    </button>
                                </div>
                            )}
                            <button onClick={() => setViewingDbInvoice(ordr)} className="w-full bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 py-2.5 rounded-xl text-xs font-bold transition-all flex justify-center items-center gap-1.5">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                Lihat Invoice
                            </button>
                            <button onClick={() => window.open(`https://wa.me/${ordr.phone}?text=${encodeURIComponent(`Halo ${ordr.name}, Admin RuangSinggah. Konfirmasi pesanan database (${ordr.id}) - ${ordr.dbName}. Mohon bantuannya.`)}`, '_blank')} className="w-full bg-green-50 hover:bg-green-500 text-green-600 hover:text-white border border-green-200 py-2.5 rounded-xl text-xs font-bold transition-all flex justify-center items-center gap-1.5">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.711.956 2.873.956 3.182 0 5.768-2.585 5.77-5.765.001-3.181-2.586-5.768-5.768-5.768zm3.333 8.33c-.15.424-.877.817-1.229.845-.306.024-.652.128-2.146-.464-1.801-.715-2.956-2.548-3.047-2.671-.09-.122-.727-.968-.727-1.844 0-.875.452-1.304.613-1.472.161-.168.351-.21.468-.21.117 0 .234.004.336.008.109.006.255-.044.398.303.151.365.518 1.264.565 1.356.046.091.077.198.016.321-.061.121-.092.197-.184.304-.092.107-.193.226-.275.319-.092.105-.188.22-.083.402.105.183.468.775 1.002 1.25.688.614 1.27.8 1.455.892.183.092.29.077.397-.038.106-.115.46-.537.583-.721.122-.184.244-.154.409-.092.165.061 1.042.492 1.221.583.179.092.298.138.341.214.043.076.043.447-.107.871z" /></svg>
                                Follow Up WA
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {viewingDbProfile && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewingDbProfile(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-5 text-white shrink-0">
                            <div className="flex items-center gap-4">
                                {viewingDbProfile.photoURL ? <img src={viewingDbProfile.photoURL} alt="" className="w-16 h-16 rounded-full border-2 border-white/30 object-cover shrink-0" /> : <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center text-xl font-black shrink-0">{viewingDbProfile.name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}</div>}
                                <div className="flex-1 min-w-0"><p className="text-[10px] font-black tracking-widest uppercase opacity-60">Profil Pembeli</p><h3 className="text-lg font-black truncate">{viewingDbProfile.name}</h3><p className="text-xs opacity-70 truncate">{viewingDbProfile.email}</p></div>
                                <button onClick={() => setViewingDbProfile(null)} className="p-2 rounded-xl hover:bg-white/10 shrink-0"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                            </div>
                        </div>
                        <div className="overflow-y-auto p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No. WhatsApp</p><p className="font-bold text-gray-900 mt-0.5">{viewingDbProfile.phone}</p></div>
                                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Jenis Kelamin</p><p className="font-bold text-gray-900 mt-0.5">{viewingDbProfile.gender || '-'}</p></div>
                                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pekerjaan</p><p className="font-bold text-gray-900 mt-0.5">{viewingDbProfile.occupation || '-'}</p></div>
                                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Institusi</p><p className="font-bold text-gray-900 mt-0.5">{viewingDbProfile.institution || '-'}</p></div>
                                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Agama</p><p className="font-bold text-gray-900 mt-0.5">{viewingDbProfile.religion || '-'}</p></div>
                                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</p><p className="font-bold text-gray-900 mt-0.5">{viewingDbProfile.relationshipStatus || '-'}</p></div>
                                <div className="col-span-2"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Database Dibeli</p><p className="font-bold text-blue-600 mt-0.5">{viewingDbProfile.dbName}</p></div>
                                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Jenis</p><p className="font-bold text-gray-900 mt-0.5">{viewingDbProfile.dbType}</p></div>
                                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status Pesanan</p><span className={`px-2 py-1 rounded-lg text-xs font-black inline-block mt-0.5 ${viewingDbProfile.status === 'Selesai' ? 'bg-green-100 text-green-700' : viewingDbProfile.status === 'Menunggu' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{viewingDbProfile.status}</span></div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 shrink-0">
                            <button onClick={() => window.open(`https://wa.me/${viewingDbProfile.phone}?text=${encodeURIComponent(`Halo ${viewingDbProfile.name}, Admin RuangSinggah. Konfirmasi pesanan database (${viewingDbProfile.id}) - ${viewingDbProfile.dbName}.`)}`, '_blank')} className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl text-sm font-bold transition-all flex justify-center items-center gap-2 shadow-sm">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.711.956 2.873.956 3.182 0 5.768-2.585 5.77-5.765.001-3.181-2.586-5.768-5.768-5.768zm3.333 8.33c-.15.424-.877.817-1.229.845-.306.024-.652.128-2.146-.464-1.801-.715-2.956-2.548-3.047-2.671-.09-.122-.727-.968-.727-1.844 0-.875.452-1.304.613-1.472.161-.168.351-.21.468-.21.117 0 .234.004.336.008.109.006.255-.044.398.303.151.365.518 1.264.565 1.356.046.091.077.198.016.321-.061.121-.092.197-.184.304-.092.107-.193.226-.275.319-.092.105-.188.22-.083.402.105.183.468.775 1.002 1.25.688.614 1.27.8 1.455.892.183.092.29.077.397-.038.106-.115.46-.537.583-.721.122-.184.244-.154.409-.092.165.061 1.042.492 1.221.583.179.092.298.138.341.214.043.076.043.447-.107.871z" /></svg>
                                Hubungi via WhatsApp
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {viewingDbProof && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewingDbProof(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-gray-100"><div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bukti Transfer</p><h3 className="text-base font-black text-gray-900 mt-0.5">{viewingDbProof.id} — {viewingDbProof.name}</h3></div><button onClick={() => setViewingDbProof(null)} className="p-2 rounded-xl hover:bg-gray-100"><svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div>
                        <div className="p-4"><img src={viewingDbProof.proofUrl} alt="Bukti Transfer" className="w-full rounded-xl border border-gray-100 object-cover max-h-80" /></div>
                        <div className="bg-yellow-50 border-t border-yellow-100 px-5 py-3 flex items-center gap-2"><span>⚠️</span><p className="text-xs text-yellow-800 font-medium">Verifikasi nominal sebelum menekan "Terima".</p></div>
                    </div>
                </div>
            )}
            {viewingDbInvoice && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewingDbInvoice(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-blue-700 to-blue-600 p-5 text-white">
                            <div className="flex justify-between items-start"><div><p className="text-xs font-black tracking-widest uppercase opacity-80">RuangSinggah.id — Database</p><h3 className="text-xl font-black mt-1">{viewingDbInvoice.invoiceId}</h3><p className="text-xs mt-1 opacity-70">Diterbitkan: {viewingDbInvoice.date}</p></div><span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-white/20">{viewingDbInvoice.status}</span></div>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pembeli</p><p className="font-bold text-gray-900">{viewingDbInvoice.name}</p></div>
                                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Jenis Database</p><p className="font-bold text-gray-900">{viewingDbInvoice.dbType}</p></div>
                                <div className="col-span-2"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Database</p><p className="font-bold text-gray-900">{viewingDbInvoice.dbName}</p></div>
                            </div>
                            <div className="border-t border-dashed border-gray-200 pt-4 space-y-2">
                                <div className="flex justify-between text-sm"><span className="text-gray-600">Harga Database</span><span className="font-bold">{FORMAT_CURRENCY(viewingDbInvoice.amount)}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-gray-600">Biaya Platform</span><span className="font-bold">{FORMAT_CURRENCY(viewingDbInvoice.platformFee)}</span></div>
                                <div className="flex justify-between text-sm font-black text-gray-900 border-t border-gray-100 pt-2"><span>Total Dibayar</span><span className="text-blue-600 text-base">{FORMAT_CURRENCY(viewingDbInvoice.amount + viewingDbInvoice.platformFee)}</span></div>
                            </div>
                            <div className={`rounded-xl p-3 flex gap-3 items-center ${viewingDbInvoice.paymentType === 'gateway' ? 'bg-blue-50 border border-blue-100' : 'bg-amber-50 border border-amber-100'}`}><span className="text-xl">{viewingDbInvoice.paymentType === 'gateway' ? '⚡' : '🏦'}</span><div><p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Metode</p><p className="font-bold text-gray-900 text-sm">{viewingDbInvoice.paymentMethod}</p></div></div>
                            <div className="flex gap-2 pt-1">
                                <button onClick={() => setViewingDbInvoice(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-xs font-bold">Tutup</button>
                                <button onClick={() => window.print()} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-xl text-xs font-bold flex justify-center items-center gap-1.5 shadow-sm"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>Cetak</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderVerifikasiRequests = () => (
        <div className="space-y-6">
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-2">Permohonan Jasa Survey Kost</h2>
            <div className="bg-violet-50/50 border border-violet-100 rounded-xl p-4 flex gap-3 mb-2">
                <span className="text-violet-500 shrink-0">🔍</span>
                <p className="text-sm font-medium text-violet-900">Harga layanan: <strong>Rp 70.000/lokasi</strong>. Transfer Bank perlu verifikasi manual sebelum survey dijadwalkan.</p>
            </div>
            <div className="grid grid-cols-1 gap-6">
                {dummyVerifications.map((req: any) => (
                    <div key={req.id} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow relative overflow-hidden">
                        {req.status === 'Dijadwalkan' && <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-bl-full"></div>}
                        <div className="flex-1 space-y-4 relative z-10">
                            <div className="flex flex-wrap justify-between items-start border-b border-gray-50 pb-4 gap-2">
                                <div>
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <span className="bg-violet-100 text-violet-700 font-bold px-2 py-1 rounded text-[10px] uppercase tracking-wider">{req.id}</span>
                                        <span className="text-xs text-gray-400 font-medium">Order: {req.date}</span>
                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${req.paymentType === 'gateway' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-700'}`}>{req.paymentType === 'gateway' ? '⚡ Gateway' : '🏦 Transfer Manual'}</span>
                                    </div>
                                    <p className="font-medium text-gray-500 text-sm">Pemesan: <button onClick={() => setViewingVerifProfile(req)} className="font-black text-orange-600 hover:text-orange-700 hover:underline underline-offset-2 transition-colors text-base">{req.name}</button></p>
                                </div>
                                <span className={`inline-flex px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg border ${req.status === 'Menunggu' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : req.status === 'Dijadwalkan' ? 'bg-blue-50 text-blue-700 border-blue-200' : req.status === 'Selesai' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{req.status}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kost Dituju</p><p className="font-bold text-gray-900 text-sm mt-0.5">{req.kostName}</p></div>
                                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">HP Pemilik/Penjaga</p><p className="font-bold text-gray-900 text-sm mt-0.5">{req.ownerPhone}</p></div>
                                <div className="col-span-2"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Alamat Kost</p><p className="font-bold text-gray-900 text-sm mt-0.5">{req.kostAddress}</p></div>
                                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sumber Info</p><p className="font-bold text-gray-900 text-sm mt-0.5">{req.source}</p></div>
                                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Metode Bayar</p><p className={`font-bold text-sm mt-0.5 ${req.paymentType === 'gateway' ? 'text-blue-600' : 'text-amber-600'}`}>{req.paymentMethod}</p></div>
                                <div className="col-span-2"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">📅 Jadwal Video Call Survey</p><p className="font-bold text-violet-700 text-sm mt-0.5">{req.surveyDate} · Pukul {req.surveyTime} WIB</p></div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Catatan Khusus dari Pemesan</p>
                                <p className="text-sm text-gray-700 italic">"{req.notes}"</p>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2.5 md:w-52 shrink-0 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 relative z-10">
                            <div className="mb-1">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Biaya Layanan</p>
                                <p className="text-xl font-black text-violet-600 text-right">{FORMAT_CURRENCY(req.amount)}</p>
                                <p className="text-[11px] text-gray-400 text-right">{req.invoiceId}</p>
                            </div>
                            {req.paymentType === 'transfer' && req.transferProofUrl && (
                                <button onClick={() => setViewingVerifProof({ id: req.id, name: req.name, proofUrl: req.transferProofUrl })} className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 py-2.5 rounded-xl text-xs font-bold transition-all flex justify-center items-center gap-1.5">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    Lihat Bukti Transfer
                                </button>
                            )}
                            {req.status === 'Menunggu' && (
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => alert(`Pesanan ${req.id} dikonfirmasi!`)} className="w-full bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl text-xs font-bold active:scale-95 flex justify-center items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Terima</button>
                                    <button onClick={() => { if (window.confirm(`Tolak pesanan ${req.id}?`)) alert('Ditolak.'); }} className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-2.5 rounded-xl text-xs font-bold border border-red-200 active:scale-95 flex justify-center items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>Tolak</button>
                                </div>
                            )}
                            <button onClick={() => setViewingVerifInvoice(req)} className="w-full bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 py-2.5 rounded-xl text-xs font-bold transition-all flex justify-center items-center gap-1.5">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>Lihat Invoice
                            </button>
                            <button onClick={() => window.open(`https://wa.me/${req.phone}?text=${encodeURIComponent(`Halo ${req.name}, Admin RuangSinggah. Konfirmasi pesanan Jasa Survey (${req.id}) untuk kost ${req.kostName}, jadwal ${req.surveyDate} pukul ${req.surveyTime} WIB.`)}`, '_blank')} className="w-full bg-green-50 hover:bg-green-500 text-green-600 hover:text-white border border-green-200 py-2.5 rounded-xl text-xs font-bold transition-all flex justify-center items-center gap-1.5">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.711.956 2.873.956 3.182 0 5.768-2.585 5.77-5.765.001-3.181-2.586-5.768-5.768-5.768zm3.333 8.33c-.15.424-.877.817-1.229.845-.306.024-.652.128-2.146-.464-1.801-.715-2.956-2.548-3.047-2.671-.09-.122-.727-.968-.727-1.844 0-.875.452-1.304.613-1.472.161-.168.351-.21.468-.21.117 0 .234.004.336.008.109.006.255-.044.398.303.151.365.518 1.264.565 1.356.046.091.077.198.016.321-.061.121-.092.197-.184.304-.092.107-.193.226-.275.319-.092.105-.188.22-.083.402.105.183.468.775 1.002 1.25.688.614 1.27.8 1.455.892.183.092.29.077.397-.038.106-.115.46-.537.583-.721.122-.184.244-.154.409-.092.165.061 1.042.492 1.221.583.179.092.298.138.341.214.043.076.043.447-.107.871z" /></svg>
                                Follow Up WA
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderMitraRequests = () => (
        <div className="space-y-6">
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-2">Pendaftar Mitra</h2>
            <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-4 flex gap-3 mb-2">
                <span className="text-orange-500 shrink-0">🤝</span>
                <p className="text-sm font-medium text-orange-900">Daftar pendaftar yang ingin bergabung sebagai <strong>Mitra Pemilik Kost</strong>. Hubungi via WA untuk verifikasi dan onboarding.</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
                {dummyMitra.map((mitra: any) => (
                    <div key={mitra.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row gap-4 hover:shadow-md transition-shadow">
                        <div className="flex-1">
                            <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">{mitra.id}</span>
                                        <span className="text-xs text-gray-400">{mitra.date}</span>
                                    </div>
                                    <p className="font-medium text-gray-500 text-sm">Nama: <span className="font-black text-gray-900 text-base">{mitra.name}</span></p>
                                </div>
                                <span className={`inline-flex px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg border ${mitra.status === 'Menunggu' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : mitra.status === 'Diproses' ? 'bg-blue-50 text-blue-700 border-blue-200' : mitra.status === 'Diterima' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{mitra.status}</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No. WA</p><p className="font-bold text-gray-900 text-sm mt-0.5">{mitra.phone}</p></div>
                                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kota</p><p className="font-bold text-gray-900 text-sm mt-0.5">{mitra.city}</p></div>
                                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Jenis Bisnis</p><p className="font-bold text-gray-900 text-sm mt-0.5">{mitra.businessType}</p></div>
                                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Jml. Properti</p><p className="font-bold text-orange-600 text-sm mt-0.5">{mitra.propertyCount} unit</p></div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 sm:w-44 shrink-0 border-t sm:border-t-0 sm:border-l border-gray-100 pt-3 sm:pt-0 sm:pl-5 justify-center">
                            {(mitra.status === 'Menunggu' || mitra.status === 'Diproses') && (
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => alert(`Mitra ${mitra.name} (${mitra.id}) diterima!`)} className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-xl text-xs font-bold active:scale-95 flex justify-center items-center gap-1">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Terima
                                    </button>
                                    <button onClick={() => { if (window.confirm(`Tolak pendaftaran ${mitra.name}?`)) alert('Ditolak.'); }} className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-xl text-xs font-bold border border-red-200 active:scale-95 flex justify-center items-center gap-1">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>Tolak
                                    </button>
                                </div>
                            )}
                            <button onClick={() => window.open(`https://wa.me/${mitra.phone}?text=${encodeURIComponent(`Halo ${mitra.name}, kami dari Admin RuangSinggah.id. Terima kasih sudah mendaftar sebagai Mitra (${mitra.id}). Kami ingin melanjutkan proses verifikasi Anda. Apakah ada waktu untuk berdiskusi?`)}`, '_blank')} className="w-full bg-green-50 hover:bg-green-500 text-green-600 hover:text-white border border-green-200 py-2 rounded-xl text-xs font-bold transition-all flex justify-center items-center gap-1.5">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.711.956 2.873.956 3.182 0 5.768-2.585 5.77-5.765.001-3.181-2.586-5.768-5.768-5.768zm3.333 8.33c-.15.424-.877.817-1.229.845-.306.024-.652.128-2.146-.464-1.801-.715-2.956-2.548-3.047-2.671-.09-.122-.727-.968-.727-1.844 0-.875.452-1.304.613-1.472.161-.168.351-.21.468-.21.117 0 .234.004.336.008.109.006.255-.044.398.303.151.365.518 1.264.565 1.356.046.091.077.198.016.321-.061.121-.092.197-.184.304-.092.107-.193.226-.275.319-.092.105-.188.22-.083.402.105.183.468.775 1.002 1.25.688.614 1.27.8 1.455.892.183.092.29.077.397-.038.106-.115.46-.537.583-.721.122-.184.244-.154.409-.092.165.061 1.042.492 1.221.583.179.092.298.138.341.214.043.076.043.447-.107.871z" /></svg>
                                Follow Up WA
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {isSubmitting && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-orange-500"></div>
                    <p className="ml-4 text-white text-lg font-bold">Memproses...</p>
                </div>
            )}

            {/* SIDEBAR DESKTOP */}
            {isAdmin && renderSidebar()}

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto">

                    {/* MOBILE MENU DROPDOWN (if no sidebar) */}
                    {isAdmin && (
                        <div className="md:hidden w-full mb-6 relative z-20">
                            <select
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-orange-500/20"
                                value={activeMenu}
                                onChange={(e) => setActiveMenu(e.target.value as DashboardMenu)}
                            >
                                <option value="analytics">📊 Ringkasan Analisis</option>
                                <option value="properties">🏠 Kelola Kost</option>
                                <option value="databases">🗄️ Kelola Database</option>
                                <option value="transactions_rent">🛒 Sewa Kost</option>
                                <option value="transactions_db">📦 Pembelian DB</option>
                                <option value="verification">✅ Verifikasi Kost</option>
                                <option value="mitra">🤝 Pendaftar Mitra</option>
                            </select>
                        </div>
                    )}

                    {/* LOADING STATE */}
                    {loading ? (
                        <div className="text-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div></div>
                    ) : (
                        <>
                            {/* CONTENT: STRUKTUR BARU */}
                            {activeMenu === 'analytics' && renderAnalytics()}
                            {activeMenu === 'transactions_rent' && renderRentTransactions()}
                            {activeMenu === 'transactions_db' && renderDbTransactions()}
                            {activeMenu === 'verifikasi' && renderVerifikasiRequests()}
                            {activeMenu === 'mitra' && renderMitraRequests()}

                            {/* VIEW MODE: VERIFIKASI KOST (CATALOG VIEW) */}
                            {activeMenu === 'verification' && renderVerifikasi()}

                            {/* VIEW MODE: PROPERTIES */}
                            {activeMenu === 'properties' && (
                                <>
                                    <div className="flex justify-end mb-4">
                                        <button
                                            onClick={openAddModal}
                                            className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg active:scale-95 flex items-center gap-2"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                            Tambah Kost
                                        </button>
                                    </div>
                                    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm text-gray-500">
                                                <thead className="bg-gray-50/50 text-xs font-black text-gray-500 uppercase tracking-widest">
                                                    <tr>
                                                        <th className="px-6 py-4">Info Kost</th>
                                                        <th className="px-6 py-4">Lokasi</th>
                                                        <th className="px-6 py-4">Harga /Bulan</th>
                                                        <th className="px-6 py-4">Status</th>
                                                        <th className="px-6 py-4 text-right">Aksi</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {displayListings.map(item => (
                                                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <img
                                                                        src={item.imageUrls?.[0] || 'https://via.placeholder.com/100'}
                                                                        alt={item.title}
                                                                        className="w-12 h-12 rounded-lg object-cover bg-gray-100"
                                                                    />
                                                                    <div>
                                                                        <p className="font-bold text-gray-900">{item.title}</p>
                                                                        <p className="text-xs text-gray-400 mt-0.5">{item.type}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <p className="font-medium text-gray-900">{item.city}</p>
                                                                <p className="text-xs text-gray-400 mt-0.5">{item.area}</p>
                                                            </td>
                                                            <td className="px-6 py-4 font-bold text-gray-900">
                                                                {FORMAT_CURRENCY(item.price)}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className={`inline-flex px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${item.status === 'published' ? 'bg-green-100 text-green-700' :
                                                                    item.status === 'draft' ? 'bg-gray-100 text-gray-600' : 'bg-orange-100 text-orange-700'
                                                                    }`}>
                                                                    {item.status || 'Active'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex justify-end gap-2">
                                                                    <button onClick={() => window.open(`/?kostId=${item.id}`, '_blank')} className="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors">Kunjungi</button>
                                                                    <button onClick={() => openEditModal(item)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 transition-colors">Edit</button>
                                                                    <button onClick={() => handleDelete(item.id, 'kost', item.title)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors">Hapus</button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {displayListings.length === 0 && (
                                                        <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400 font-medium">Belum ada data kost.</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* VIEW MODE: DATABASES */}
                            {activeMenu === 'databases' && (
                                <>
                                    <div className="flex justify-end mb-4">
                                        <button
                                            onClick={openAddDbModal}
                                            className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg active:scale-95 flex items-center gap-2"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                            Tambah Database
                                        </button>
                                    </div>
                                    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm text-gray-500">
                                                <thead className="bg-gray-50/50 text-xs font-black text-gray-500 uppercase tracking-widest">
                                                    <tr>
                                                        <th className="px-6 py-4">Info Database</th>
                                                        <th className="px-6 py-4">Kota/Area</th>
                                                        <th className="px-6 py-4">Harga</th>
                                                        <th className="px-6 py-4 text-right">Aksi</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {dbProducts.map(db => (
                                                        <tr key={db.id} className="hover:bg-gray-50/50 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-500 shrink-0">
                                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-bold text-gray-900">{db.campus}</p>
                                                                        <p className="text-xs text-gray-400 mt-0.5">{db.totalData || '-'} Data</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <p className="font-medium text-gray-900">{db.city}</p>
                                                                <p className="text-xs text-gray-400 mt-0.5">{db.area}</p>
                                                            </td>
                                                            <td className="px-6 py-4 font-bold text-gray-900">
                                                                {FORMAT_CURRENCY(db.price)}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex justify-end gap-2">
                                                                    <button onClick={() => openEditDbModal(db)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 transition-colors">Edit</button>
                                                                    <button onClick={() => handleDelete(db.id, 'database', db.campus)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors">Hapus</button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {dbProducts.length === 0 && (
                                                        <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400 font-medium">Belum ada data database.</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>

                {/* MODAL PROPERTY FORM */}
                {isModalOpen && activeMenu === 'properties' && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 overflow-hidden">
                        <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
                        <div className="bg-white w-full h-full sm:h-auto sm:max-w-6xl sm:max-h-[90vh] sm:rounded-[2.5rem] shadow-2xl relative flex flex-col overflow-hidden animate-in zoom-in-95">

                            {/* Header */}
                            <div className="p-6 sm:p-8 border-b border-gray-100 flex justify-between items-center bg-white z-20">
                                <h2 className="text-xl sm:text-2xl font-black text-gray-900 uppercase tracking-tight">{editingId ? 'Edit Properti' : 'Tambah Properti Baru'}</h2>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            {/* Content Body - Split View */}
                            <div className="flex flex-col md:flex-row flex-grow overflow-hidden relative">

                                {/* Desktop Sidebar Navigation */}
                                <div className="hidden md:flex flex-col w-72 bg-gray-50 border-r border-gray-100 overflow-y-auto shrink-0">
                                    <div className="p-4 space-y-1">
                                        {sections.map(tab => (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`w-full text-left px-6 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                                                    ? 'bg-white text-orange-600 shadow-sm border border-gray-100'
                                                    : 'text-gray-400 hover:bg-white/50 hover:text-gray-600'
                                                    }`}
                                            >
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Form Area */}
                                <div className="flex-1 overflow-y-auto bg-white relative">
                                    <form onSubmit={handleSubmit} className="min-h-full flex flex-col">

                                        {/* Mobile Accordion & Desktop Content Wrapper */}
                                        <div className="flex-grow p-6 sm:p-10 space-y-4">
                                            {sections.map(section => (
                                                <div key={section.id} className="md:hidden border border-gray-100 rounded-2xl overflow-hidden">
                                                    {/* Mobile Header Toggle */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveTab(activeTab === section.id ? '' : section.id)}
                                                        className={`w-full flex items-center justify-between p-5 text-left transition-colors ${activeTab === section.id ? 'bg-orange-50 text-orange-600' : 'bg-white text-gray-700'
                                                            }`}
                                                    >
                                                        <span className="text-xs font-black uppercase tracking-widest">{section.label}</span>
                                                        <svg className={`w-4 h-4 transition-transform ${activeTab === section.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                    </button>

                                                    {/* Mobile Content */}
                                                    <div className={`${activeTab === section.id ? 'block' : 'hidden'} border-t border-gray-100 bg-white p-5`}>
                                                        {renderSectionContent(section.id)}
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Desktop Visible Content */}
                                            <div className="hidden md:block">
                                                {renderSectionContent(activeTab)}
                                            </div>
                                        </div>

                                        {/* Sticky Footer */}
                                        <div className="p-6 sm:p-8 border-t border-gray-100 bg-white/95 backdrop-blur-sm sticky bottom-0 z-10 flex justify-between gap-4 mt-auto">
                                            {editingId && (
                                                <button type="button" onClick={handleDeleteFromModal} className="px-6 py-3 rounded-xl font-bold text-red-500 hover:bg-red-50 transition-colors">
                                                    Hapus Properti
                                                </button>
                                            )}
                                            <div className="flex gap-4 ml-auto">
                                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-colors">Batal</button>
                                                <button type="submit" disabled={isSubmitting} className="px-8 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-100 active:scale-95">
                                                    {isSubmitting ? 'Menyimpan...' : 'Simpan Properti'}
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL DATABASE FORM */}
                {isDbModalOpen && activeMenu === 'databases' && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm" onClick={() => setIsDbModalOpen(false)}></div>
                        <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative z-10 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <h2 className="text-xl font-black uppercase">{editingDbId ? 'Edit Database' : 'Tambah Database'}</h2>
                                <button onClick={() => setIsDbModalOpen(false)}>&times;</button>
                            </div>
                            <form onSubmit={handleDbSubmit} className="flex-grow overflow-y-auto p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase">Nama Kampus</label>
                                        <input required className="w-full border rounded-xl px-4 py-3 font-bold" value={dbForm.campus} onChange={e => setDbForm({ ...dbForm, campus: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase">Estimasi Jumlah Data</label>
                                        <input required type="number" className="w-full border rounded-xl px-4 py-3 font-bold" value={dbForm.totalData} onChange={e => setDbForm({ ...dbForm, totalData: Number(e.target.value) })} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase">Kota</label>
                                        <input required className="w-full border rounded-xl px-4 py-3 font-bold" value={dbForm.city} onChange={e => setDbForm({ ...dbForm, city: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase">Area (Kecamatan/Daerah)</label>
                                        <input required className="w-full border rounded-xl px-4 py-3 font-bold" value={dbForm.area} onChange={e => setDbForm({ ...dbForm, area: e.target.value })} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Deskripsi</label>
                                    <textarea required className="w-full border rounded-xl px-4 py-3 font-medium" rows={3} value={dbForm.description} onChange={e => setDbForm({ ...dbForm, description: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Harga (IDR)</label>
                                    <input required type="number" className="w-full border rounded-xl px-4 py-3 font-bold" value={dbForm.price} onChange={e => setDbForm({ ...dbForm, price: Number(e.target.value) })} />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Cover Image</label>
                                    <input type="file" accept="image/*" onChange={e => setDbCoverFile(e.target.files ? e.target.files[0] : null)} className="w-full text-sm" />
                                    {dbForm.fileUrls?.coverImage?.original && <p className="text-xs text-green-500">Current: {dbForm.fileUrls.coverImage.original.substring(0, 30)}...</p>}
                                </div>

                                <div className="space-y-4 border-t pt-4">
                                    <label className="text-xs font-bold text-gray-400 uppercase">File Database</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2">
                                            <input type="radio" name="fileType" checked={dbForm.fileType === 'link'} onChange={() => setDbForm({ ...dbForm, fileType: 'link' })} />
                                            <span className="text-sm font-bold">Link Google Drive</span>
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input type="radio" name="fileType" checked={dbForm.fileType === 'upload'} onChange={() => setDbForm({ ...dbForm, fileType: 'upload' })} />
                                            <span className="text-sm font-bold">Upload File (Excel/PDF)</span>
                                        </label>
                                    </div>

                                    {dbForm.fileType === 'link' ? (
                                        <input
                                            type="url"
                                            placeholder="https://drive.google.com/..."
                                            className="w-full border rounded-xl px-4 py-3 font-medium"
                                            value={dbForm.fileUrl}
                                            onChange={e => setDbForm({ ...dbForm, fileUrl: e.target.value })}
                                        />
                                    ) : (
                                        <div>
                                            <input type="file" accept=".xlsx,.xls,.pdf" onChange={e => setDbDocFile(e.target.files ? e.target.files[0] : null)} className="w-full text-sm" />
                                            {dbForm.fileName && <p className="text-xs text-green-500 mt-1">Current File: {dbForm.fileName}</p>}
                                        </div>
                                    )}
                                </div>
                            </form>
                            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                                <button onClick={() => setIsDbModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-white">Batal</button>
                                <button onClick={handleDbSubmit} disabled={isSubmitting} className="px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600">
                                    {isSubmitting ? 'Menyimpan...' : 'Simpan Database'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* CUSTOM CONFIRM DELETE MODAL */}
                {showConfirmDeleteModal && itemToDelete && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm" onClick={cancelDeleteItem}></div>
                        <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl p-6 relative z-10 animate-in zoom-in-95">
                            <h3 className="text-xl font-black text-gray-900 mb-4">Konfirmasi Penghapusan</h3>
                            <p className="text-gray-700 mb-6">
                                Anda yakin ingin menghapus {itemToDelete.type === 'kost' ? 'properti' : 'database'}{" "}
                                <span className="font-bold">"{itemToDelete.name}"</span> ini secara permanen?
                                Data yang dihapus tidak dapat dikembalikan.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button onClick={cancelDeleteItem} className="px-5 py-2 rounded-lg font-bold text-gray-500 hover:bg-gray-50 transition-colors">Batal</button>
                                <button onClick={confirmDeleteItem} className="px-5 py-2 rounded-lg font-bold text-white bg-red-600 hover:bg-red-700 transition-colors">Hapus Sekarang</button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default Dashboards;
