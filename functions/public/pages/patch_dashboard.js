const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'Dashboard.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// 1. Add imports
if (!content.includes("from '../firebase'")) {
    content = content.replace(
        "import { FORMAT_CURRENCY } from '../constants';",
        "import { FORMAT_CURRENCY } from '../constants';\nimport { db } from '../firebase';\nimport { collection, query, getDocs, orderBy, updateDoc, doc } from 'firebase/firestore';"
    );
}

// 2. Update DashboardMenu type
content = content.replace(
    "type DashboardMenu = 'analytics' | 'properties' | 'databases' | 'transactions_rent' | 'transactions_db' | 'mitra' | 'verification';",
    "type DashboardMenu = 'analytics' | 'properties' | 'databases' | 'transactions_rent' | 'transactions_db' | 'mitra' | 'verification' | 'complaints';"
);

// 3. Add Complaints State and load function
if (!content.includes("const [complaints, setComplaints] = useState")) {
    const hookInsertionStr = `
    // COMPLAINTS STATE
    const [complaints, setComplaints] = useState<any[]>([]);
    
    const loadComplaints = async () => {
        if (!isAdmin) return;
        setLoading(true);
        try {
            const q = query(collection(db, 'complaints'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            setComplaints(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Gagal memuat komplain", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeMenu === 'complaints') loadComplaints();
    }, [isAdmin, activeMenu]);

    const handleUpdateComplaintStatus = async (id: string, newStatus: string) => {
        try {
            await updateDoc(doc(db, 'complaints', id), { status: newStatus });
            setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
            alert('Status Komplain diperbarui ke ' + newStatus);
        } catch(e) {
            alert('Gagal mengupdate komplain');
        }
    };
`;
    content = content.replace(
        "// --- DUMMY DATA UNTUK UI BARU ---",
        `${hookInsertionStr}\n    // --- DUMMY DATA UNTUK UI BARU ---`
    );
}

// 4. Mobile Dropdown option
if (!content.includes('<option value="complaints">')) {
    content = content.replace(
        '<option value="mitra">🤝 Pendaftar Mitra</option>',
        '<option value="mitra">🤝 Pendaftar Mitra</option>\n                                <option value="complaints">🛠️ Komplain</option>'
    );
}

// 5. Sidebar Item
if (!content.includes('label="Komplain" isActive={activeMenu === \'complaints\'}')) {
    content = content.replace(
        '<SidebarItem icon="🤝" label="Pendaftar Mitra" isActive={activeMenu === \'mitra\'} onClick={() => setActiveMenu(\'mitra\')} />',
        '<SidebarItem icon="🤝" label="Pendaftar Mitra" isActive={activeMenu === \'mitra\'} onClick={() => setActiveMenu(\'mitra\')} />\n                <SidebarItem icon="🛠️" label="Komplain" isActive={activeMenu === \'complaints\'} onClick={() => setActiveMenu(\'complaints\')} />'
    );
}

// 6. Content Switcher
if (!content.includes("activeMenu === 'complaints' && renderComplaints()")) {
    content = content.replace(
        "{activeMenu === 'mitra' && renderMitraRequests()}",
        "{activeMenu === 'mitra' && renderMitraRequests()}\n                            {activeMenu === 'complaints' && renderComplaints()}"
    );
}

// 7. Dummy Data Injection to test Rent Transactions tab handles perpanjangan/ekstra
if (!content.includes('TRX-EKSTRA-001')) {
    const dummyInsertion = `
        {
            id: 'TRX-EKSTRA-001',
            date: '2026-08-10',
            name: 'Budi Santoso',
            phone: '081234567891',
            item: 'Kost Singgah 2',
            roomType: 'Tagihan Tambahan',
            periodLabel: '-',
            paymentMethod: 'Transfer Bank BCA',
            paymentType: 'transfer',
            amount: 150000,
            status: 'Menunggu',
            startDate: '-',
            endDate: '-',
            transferProofUrl: 'https://via.placeholder.com/400x600?text=Bukti+Transfer+Tagihan',
            invoiceId: \`INV-EKS-\${Math.floor(Math.random() * 10000)}\`,
            isExtra: true
        },
        {
            id: 'TRX-EXT-002',
            date: '2026-08-11',
            name: 'Ayu Lestari',
            phone: '081234567892',
            item: 'Kost Tulip',
            roomType: 'Kamar Standard AC',
            periodLabel: 'Perpanjangan 1 Bulan',
            paymentMethod: 'Transfer Bank Mandiri',
            paymentType: 'transfer',
            amount: 850000,
            status: 'Menunggu',
            startDate: '2026-08-15',
            endDate: '2026-09-15',
            transferProofUrl: 'https://via.placeholder.com/400x600?text=Bukti+Transfer+Perpanjangan',
            invoiceId: \`INV-EXT-\${Math.floor(Math.random() * 10000)}\`,
            isExtension: true
        },
    `;
    content = content.replace(
        "const [dummyTransactions, setDummyTransactions] = useState<any[]>([",
        "const [dummyTransactions, setDummyTransactions] = useState<any[]>([\n" + dummyInsertion
    );
}

// 8. Render Complaints Function
if (!content.includes('const renderComplaints = () =>')) {
    const renderComplaintsStr = `
    const renderComplaints = () => (
        <div className="space-y-6">
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Daftar Komplain Penghuni</h2>
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm overflow-hidden">
                {complaints.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">Belum ada komplain yang masuk.</div>
                ) : (
                    <table className="w-full text-left text-sm text-gray-500">
                        <thead className="bg-gray-50/50 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Tanggall / ID</th>
                                <th className="px-6 py-4">Pelapor</th>
                                <th className="px-6 py-4">Properti</th>
                                <th className="px-6 py-4">Judul / Kendala</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {complaints.map(c => (
                                <tr key={c.id}>
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-gray-900">{c.createdAt ? new Date(c.createdAt.seconds * 1000).toLocaleDateString('id-ID') : '-'}</p>
                                        <p className="text-[10px] text-gray-400 uppercase">{c.id.slice(0,8)}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-gray-700">{c.userName}</p>
                                        <p className="text-xs text-blue-500 cursor-pointer hover:underline" onClick={() => window.open('https://wa.me/'+c.userPhone)}>{c.userPhone}</p>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-gray-700">{c.kostName}</td>
                                    <td className="px-6 py-4 max-w-xs">
                                        <p className="font-bold text-red-600 truncate">{c.title}</p>
                                        <p className="text-xs text-gray-500 line-clamp-2 mt-1">{c.description}</p>
                                        {c.photoUrl && (
                                            <button onClick={() => setViewingProof({ id: c.id, name: 'Foto Komplain', proofUrl: c.photoUrl })} className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                                                📸 Lihat Foto
                                            </button>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={\`inline-flex px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border \${c.status === 'open' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}\`}>
                                            {c.status === 'open' ? 'TERBUKA' : 'SELESAI'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {c.status === 'open' ? (
                                            <button onClick={() => handleUpdateComplaintStatus(c.id, 'closed')} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold active:scale-95 shadow-sm transition-colors">
                                                Tandai Selesai
                                            </button>
                                        ) : (
                                            <span className="text-gray-400 text-xs font-bold">Teratasi</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
`;
    content = content.replace(
        "const renderVerifikasi = () => (",
        `${renderComplaintsStr}\n    const renderVerifikasi = () => (`
    );
}

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Dashboard successfully patched!');
