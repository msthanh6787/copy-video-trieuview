import React, { useState, useEffect, useRef } from 'react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  serverTimestamp,
  FirebaseUser,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  updateDoc,
  limit,
  addDoc
} from './src/firebase';
import { analyzeVideo, transcribeAudioVideo } from './geminiService';
import { SceneJson, BulkVideoItem, UserProfile, Order } from './types';
import { Sidebar, Navbar } from './src/components/Layout';
import { 
  Upload, 
  Play, 
  Download, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  FileVideo,
  FileAudio,
  Clock,
  Type,
  Mic,
  FileText,
  ChevronDown,
  Search,
  UserPlus,
  Check,
  X,
  ShieldAlert,
  ShoppingBag,
  Phone,
  History,
  RefreshCcw,
  User as UserIcon
} from 'lucide-react';
import { cn } from './src/lib/utils';

import { getApiBaseUrl } from './src/lib/api';

const AdminDashboard = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to pending orders
    const qOrders = query(collection(db, 'orders'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
    const unsubOrders = onSnapshot(qOrders, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(list);
    });

    // Initial users fetch
    const fetchUsers = async () => {
      const qUsers = query(collection(db, 'users'), limit(50));
      const snap = await getDocs(qUsers);
      const list = snap.docs.map(doc => ({ ...doc.data() } as UserProfile));
      setUsers(list);
      setLoading(false);
    };
    fetchUsers();

    return () => unsubOrders();
  }, []);

  const handleApproveOrder = async (order: Order) => {
    try {
      const orderRef = doc(db, 'orders', order.id);
      const userRef = doc(db, 'users', order.userId);
      
      // Update order status
      await updateDoc(orderRef, { status: 'completed' });
      
      // Add credits to user
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const currentCredits = userSnap.data().credits || 0;
        await updateDoc(userRef, { credits: currentCredits + order.credits });
      }
      
      alert("Đã phê duyệt đơn hàng và cộng credit thành công!");
    } catch (error) {
      console.error(error);
      alert("Lỗi khi phê duyệt đơn hàng.");
    }
  };

  const handleManualUpgrade = async (userId: string, creditsToAdd: number) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const currentCredits = userSnap.data().credits || 0;
        await updateDoc(userRef, { credits: currentCredits + creditsToAdd });
        alert(`Đã cộng ${creditsToAdd} credits cho người dùng.`);
        
        // Refresh local user list
        setUsers(prev => prev.map(u => u.uid === userId ? { ...u, credits: u.credits + creditsToAdd } : u));
      }
    } catch (error) {
      console.error(error);
      alert("Lỗi khi nâng cấp thủ công.");
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Pending Orders Section */}
      <div className="glass-panel p-8 rounded-3xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight">ĐƠN HÀNG CHỜ PHÊ DUYỆT ({orders.length})</h3>
        </div>

        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl">
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Không có đơn hàng nào đang chờ</p>
            </div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex items-center justify-between group hover:border-indigo-500/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                    <ShoppingBag className="w-6 h-6 text-slate-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">{order.userEmail}</h4>
                    <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-0.5">Mã: #{order.id.substring(0, 8).toUpperCase()}</p>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">
                      {order.credits.toLocaleString()} Credits • {order.amount.toLocaleString()} VNĐ
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleApproveOrder(order)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/20"
                  >
                    <Check className="w-4 h-4" /> HOÀN THÀNH
                  </button>
                  <button className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-xl transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* User Management Section */}
      <div className="glass-panel p-8 rounded-3xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <UserIcon className="w-5 h-5 text-indigo-500" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">QUẢN LÝ NGƯỜI DÙNG</h3>
          </div>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text"
              placeholder="Tìm theo email hoặc tên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:border-indigo-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] border-b border-slate-800">
                <th className="pb-4 pl-4">NGƯỜI DÙNG</th>
                <th className="pb-4">EMAIL</th>
                <th className="pb-4">CREDITS</th>
                <th className="pb-4">VAI TRÒ</th>
                <th className="pb-4 text-right pr-4">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredUsers.map(u => (
                <tr key={u.uid} className="group hover:bg-slate-800/20 transition-colors">
                  <td className="py-4 pl-4">
                    <div className="flex items-center gap-3">
                      {u.photoURL ? (
                        <img src={u.photoURL} className="w-8 h-8 rounded-full border border-slate-700" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                          <UserIcon className="w-4 h-4 text-slate-500" />
                        </div>
                      )}
                      <span className="text-sm font-bold text-white">{u.displayName || "N/A"}</span>
                    </div>
                  </td>
                  <td className="py-4 text-sm text-slate-400">{u.email}</td>
                  <td className="py-4">
                    <span className="text-sm font-bold text-indigo-400">{u.credits.toLocaleString()}</span>
                  </td>
                  <td className="py-4">
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider",
                      u.role === 'admin' ? "bg-indigo-500/20 text-indigo-400" : "bg-slate-800 text-slate-500"
                    )}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-4 text-right pr-4">
                    <button 
                      onClick={() => {
                        const amount = prompt("Nhập số credits muốn cộng thêm:");
                        if (amount && !isNaN(parseInt(amount))) {
                          handleManualUpgrade(u.uid, parseInt(amount));
                        }
                      }}
                      className="p-2 hover:bg-indigo-500/10 text-slate-500 hover:text-indigo-400 rounded-lg transition-all"
                      title="Cộng Credit thủ công"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bulk');

  // Bulk Mode State
  const [bulkItems, setBulkItems] = useState<BulkVideoItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-3-flash-preview');
  const [selectedStyle, setSelectedStyle] = useState('Phân tích theo video gốc (Original Style)');
  const [showTopUp, setShowTopUp] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // Transcribe Mode State
  const [transcribeFiles, setTranscribeFiles] = useState<File[]>([]);
  const [hasTimestamp, setHasTimestamp] = useState(true);
  const [transcriptionResult, setTranscriptionResult] = useState<string>("");

  // Merge Mode State
  const [mergeFilesTxt, setMergeFilesTxt] = useState<File[]>([]);
  const [mergeFilesCsv, setMergeFilesCsv] = useState<File[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        // Listen to profile changes
        const unsubProfile = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            // Migration: If user has the old default (100), update to 5000
            if (data.credits === 100) {
              setDoc(userDocRef, { credits: 5000 }, { merge: true });
            }
            // Admin migration
            const adminEmails = ["msthanh6787@gmail.com"];
            if (adminEmails.includes(data.email) && data.role !== 'admin') {
              setDoc(userDocRef, { role: 'admin' }, { merge: true });
            }
            setProfile(data);
          } else {
            // Create new profile with IP check
            try {
              const baseUrl = getApiBaseUrl();
              const response = await fetch(`${baseUrl}/api/check-registration-limit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: firebaseUser.uid })
              });
              const result = await response.json();

              if (!result.allowed) {
                alert(result.message || "Bạn đã đạt giới hạn tạo tài khoản từ IP này.");
                // Create profile with 0 credits if blocked
                const newProfile: UserProfile = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email || '',
                  displayName: firebaseUser.displayName || '',
                  photoURL: firebaseUser.photoURL || '',
                  credits: 0, 
                  role: 'user',
                  createdAt: serverTimestamp(),
                  registrationIp: 'blocked'
                };
                await setDoc(userDocRef, newProfile);
                return;
              }

              const adminEmails = ["msthanh6787@gmail.com"];
              const newProfile: UserProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || '',
                photoURL: firebaseUser.photoURL || '',
                credits: 5000, // Initial free credits
                role: adminEmails.includes(firebaseUser.email || '') ? 'admin' : 'user',
                createdAt: serverTimestamp(),
                registrationIp: 'verified'
              };
              await setDoc(userDocRef, newProfile);
            } catch (error) {
              console.error("Registration check failed:", error);
              // Fallback: create with 0 credits if check fails to be safe
              const newProfile: UserProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || '',
                photoURL: firebaseUser.photoURL || '',
                credits: 0,
                role: 'user',
                createdAt: serverTimestamp()
              };
              await setDoc(userDocRef, newProfile);
            }
          }
        });
        
        setLoading(false);
        return () => unsubProfile();
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0b0e14]">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="flex min-h-screen bg-[#0b0e14] text-slate-200">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} role={profile?.role} />
      
      <main className="flex-1 flex flex-col">
        <Navbar 
          user={user} 
          credits={profile?.credits || 0} 
          onLogout={handleLogout} 
          onOpenTopUp={() => setShowTopUp(true)} 
          onOpenHistory={() => setShowHistory(true)}
          onOpenStats={() => setShowStats(true)}
        />
        
        <div className="p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'admin' && profile?.role === 'admin' && (
            <AdminDashboard />
          )}
          
          {activeTab === 'bulk' && (
            <BulkAnalysis 
              items={bulkItems} 
              setItems={setBulkItems} 
              isProcessing={isProcessing} 
              setIsProcessing={setIsProcessing}
              model={selectedModel}
              setModel={setSelectedModel}
              style={selectedStyle}
              setStyle={setSelectedStyle}
              userCredits={profile?.credits || 0}
              userId={user.uid}
            />
          )}
          {activeTab === 'transcribe' && (
            <Transcription 
              files={transcribeFiles}
              setFiles={setTranscribeFiles}
              hasTimestamp={hasTimestamp}
              setHasTimestamp={setHasTimestamp}
              result={transcriptionResult}
              setResult={setTranscriptionResult}
            />
          )}
          {activeTab === 'merge-txt' && (
            <MergeFiles 
              type="txt" 
              files={mergeFilesTxt} 
              setFiles={setMergeFilesTxt} 
            />
          )}
          {activeTab === 'merge-csv' && (
            <MergeFiles 
              type="csv" 
              files={mergeFilesCsv} 
              setFiles={setMergeFilesCsv} 
            />
          )}
        </div>
      </main>

      {showTopUp && user && (
        <TopUpModal 
          onClose={() => setShowTopUp(false)} 
          userId={user.uid} 
          userEmail={user.email || ''} 
        />
      )}
      {showStats && profile && (
        <StatisticsModal 
          onClose={() => setShowStats(false)} 
          credits={profile.credits} 
          userId={profile.uid}
        />
      )}

      {showHistory && user && (
        <OrderHistoryModal 
          onClose={() => setShowHistory(false)} 
          userId={user.uid} 
        />
      )}
    </div>
  );
}

const OrderHistoryModal = ({ onClose, userId }: { onClose: () => void, userId: string }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'orders'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(list);
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Bạn có chắc chắn muốn hủy đơn hàng này?")) return;
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: 'cancelled' });
    } catch (error) {
      console.error(error);
      alert("Lỗi khi hủy đơn hàng.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-2xl rounded-[2.5rem] overflow-hidden relative animate-in fade-in zoom-in duration-300">
        <div className="p-8 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <History className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight uppercase">LỊCH SỬ ĐƠN HÀNG</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Theo dõi trạng thái nạp credits</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 max-h-[60vh] overflow-y-auto space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl">
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Chưa có lịch sử giao dịch</p>
            </div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex items-center justify-between group hover:border-indigo-500/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                    <ShoppingBag className="w-6 h-6 text-slate-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white tracking-tight">{order.credits.toLocaleString()} CREDITS</h4>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                        order.status === 'completed' ? "bg-emerald-500/20 text-emerald-400" : 
                        order.status === 'pending' ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"
                      )}>
                        {order.status === 'completed' ? 'THÀNH CÔNG' : order.status === 'pending' ? 'CHỜ XỬ LÝ' : 'ĐÃ HỦY'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                      {order.createdAt?.toDate().toLocaleString() || "Đang xử lý..."} • +{order.credits.toLocaleString()} Credits
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{order.amount.toLocaleString()}đ</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Mã: #{order.id.substring(0, 8).toUpperCase()}</p>
                  </div>
                  {order.status === 'pending' && (
                    <button 
                      onClick={() => handleCancelOrder(order.id)}
                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold rounded-lg transition-all uppercase tracking-widest"
                    >
                      HỦY ĐƠN
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="p-4 bg-slate-950/50 text-center border-t border-slate-800">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Nếu có bất kỳ thắc mắc nào về đơn hàng, vui lòng liên hệ Zalo hỗ trợ: 0888.649.819</p>
        </div>
      </div>
    </div>
  );
};

const StatisticsModal = ({ onClose, credits, userId }: { onClose: () => void, credits: number, userId: string }) => {
  const [totalTransactions, setTotalTransactions] = useState(0);

  useEffect(() => {
    const q = query(collection(db, 'orders'), where('userId', '==', userId), where('status', '==', 'completed'));
    const unsub = onSnapshot(q, (snap) => {
      setTotalTransactions(snap.size);
    });
    return () => unsub();
  }, [userId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-2xl rounded-[2.5rem] overflow-hidden relative animate-in fade-in zoom-in duration-300">
        <div className="p-8 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xl font-black text-white tracking-tight uppercase">THỐNG KÊ CREDIT</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">SỐ DƯ HIỆN TẠI</p>
              <p className="text-3xl font-black text-indigo-400">{credits.toLocaleString()}</p>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">TỔNG GIAO DỊCH</p>
              <p className="text-3xl font-black text-white">{totalTransactions}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] border-b border-slate-800 pb-2">
              <span>THỜI GIAN</span>
              <span>LOẠI</span>
              <span>SỐ LƯỢNG</span>
              <span>NỘI DUNG</span>
            </div>
            <div className="py-12 text-center">
              <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">Chưa có lịch sử giao dịch</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TopUpModal = ({ onClose, userId, userEmail }: { onClose: () => void, userId: string, userEmail: string }) => {
  const [step, setStep] = useState<'select' | 'confirm' | 'payment'>('select');
  const [selectedOption, setSelectedOption] = useState<{ credits: number, amount: number } | null>(null);
  const [orderId, setOrderId] = useState<string>("");

  const handleSelectOption = (credits: number, amount: number) => {
    setSelectedOption({ credits, amount });
    setStep('confirm');
  };

  const handleConfirmOrder = async () => {
    if (!selectedOption) return;
    try {
      const docRef = await addDoc(collection(db, 'orders'), {
        userId,
        userEmail,
        credits: selectedOption.credits,
        amount: selectedOption.amount,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setOrderId(docRef.id);
      setStep('payment');
    } catch (error) {
      console.error(error);
      alert("Lỗi khi gửi yêu cầu nạp tiền.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-2xl rounded-[2.5rem] overflow-hidden relative animate-in fade-in zoom-in duration-300">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <ShoppingBag className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight uppercase">THANH TOÁN</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Quét mã để nhận credits</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-10">
          {step === 'select' && (
            <>
              <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">NẠP CREDITS</h2>
              <p className="text-slate-400 text-sm mb-8">Chọn gói credits để tiếp tục phân tích video. 1000 credits = 60 giây video.</p>

              <div className="mt-8 space-y-3 mb-8">
                <a 
                  href="https://zalo.me/0907886787" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all border border-indigo-500/30 uppercase tracking-widest text-xs"
                >
                  <Mic className="w-5 h-5" /> HỖ TRỢ ZALO NHANH
                </a>
              </div>

              <div className="space-y-4">
                <TopUpOption amount="50,000" price="50.000Đ" sub="50K CREDITS" onClick={() => handleSelectOption(50000, 50000)} />
                <TopUpOption amount="110,000" price="100.000Đ" sub="110K CREDITS" onClick={() => handleSelectOption(110000, 100000)} />
                <TopUpOption amount="600,000" price="500.000Đ" sub="600K CREDITS" onClick={() => handleSelectOption(600000, 500000)} />
              </div>
            </>
          )}

          {step === 'confirm' && selectedOption && (
            <div className="text-center space-y-8 py-4">
              <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto border border-indigo-500/20">
                <ShoppingBag className="w-10 h-10 text-indigo-500" />
              </div>
              
              <div>
                <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">XÁC NHẬN ĐĂNG KÝ GÓI</h2>
                <p className="text-slate-400 text-sm">Bạn đang đăng ký gói <span className="text-indigo-400 font-bold">{(selectedOption.credits / 1000)}k Credits</span></p>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 space-y-6">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">SỐ LƯỢNG CREDITS</span>
                  <span className="text-xl font-black text-white">{selectedOption.credits.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">TỔNG TIỀN THANH TOÁN</span>
                  <span className="text-xl font-black text-indigo-400">{selectedOption.amount.toLocaleString()}đ</span>
                </div>
              </div>

              <div className="space-y-4">
                <button 
                  onClick={handleConfirmOrder}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-600/20 uppercase tracking-widest"
                >
                  <Check className="w-5 h-5" /> XÁC NHẬN ĐĂNG KÝ
                </button>
                <button 
                  onClick={() => setStep('select')}
                  className="text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-colors"
                >
                  QUAY LẠI
                </button>
              </div>
            </div>
          )}

          {step === 'payment' && selectedOption && (
            <div className="text-center space-y-8">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                <Check className="w-8 h-8 text-emerald-500" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">XÁC NHẬN THÀNH CÔNG!</h2>
                <p className="text-slate-400 text-sm">Đơn hàng <span className="text-indigo-400 font-bold">#{orderId.substring(0, 8).toUpperCase()}</span> đã được ghi nhận.</p>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">SỐ LƯỢNG CREDITS</span>
                  <span className="text-lg font-bold text-white">{selectedOption.credits.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">TỔNG TIỀN THANH TOÁN</span>
                  <span className="text-lg font-bold text-indigo-400">{selectedOption.amount.toLocaleString()}đ</span>
                </div>
              </div>

              <div className="bg-indigo-600/5 border border-indigo-500/10 rounded-2xl py-3 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                VUI LÒNG THỰC HIỆN THANH TOÁN BÊN DƯỚI
                <ChevronDown className="w-3 h-3 mx-auto mt-1 animate-bounce" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pt-4">
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-3xl shadow-2xl">
                    <img 
                      src="https://api.vietqr.io/image/970423-208152122-qr_only.jpg?amount=50000&addInfo=NAP%20CREDIT" 
                      alt="QR Code" 
                      className="w-full aspect-square object-contain"
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-white">Huỳnh Thị Ngọc Thanh</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">VPBank • 208152122</p>
                  </div>
                </div>

                <div className="text-left space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">HƯỚNG DẪN THANH TOÁN</h4>
                    <div className="space-y-3">
                      {[
                        "Mở ứng dụng Ngân hàng và chọn Quét mã QR.",
                        "Kiểm tra số tiền và nội dung chuyển khoản đã được điền sẵn.",
                        "Sau khi chuyển khoản thành công, hệ thống sẽ duyệt đơn hàng của bạn trong giây lát."
                      ].map((text, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 flex-shrink-0">{i + 1}</div>
                          <p className="text-xs text-slate-400 leading-relaxed">{text}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] text-slate-500 font-medium">Nếu sau 5 phút credits chưa được cộng, vui lòng liên hệ hỗ trợ Zalo:</p>
                    <a 
                      href="https://zalo.me/0907886787" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-xs transition-all"
                    >
                      <Mic className="w-4 h-4" /> HỖ TRỢ ZALO NHANH
                    </a>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 flex items-center justify-center gap-2">
                      <Phone className="w-4 h-4 text-slate-500" />
                      <span className="text-xs font-bold text-slate-300 tracking-tight">0907886787 (HUỲNH THANH)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TopUpOption = ({ amount, price, sub, onClick }: { amount: string, price: string, sub: string, onClick: () => void }) => (
  <div 
    onClick={onClick}
    className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 flex items-center justify-between hover:border-indigo-500/50 transition-all cursor-pointer group"
  >
    <div>
      <h4 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">{amount} Credits</h4>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{sub}</p>
    </div>
    <div className="text-right">
      <p className="text-sm font-bold text-white">{price}</p>
    </div>
  </div>
);

const LoginScreen = ({ onLogin }: { onLogin: () => void }) => (
  <div className="h-screen w-full flex items-center justify-center bg-[#0b0e14] relative overflow-hidden">
    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full" />
    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full" />
    
    <div className="glass-panel p-12 rounded-[2.5rem] w-full max-w-md text-center relative z-10">
      <div className="bg-indigo-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-500/30">
        <Play className="w-10 h-10 text-white fill-current" />
      </div>
      <h1 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase">COPY VIDEO <span className="text-indigo-500">PRO</span></h1>
      <p className="text-slate-400 mb-10 text-lg">Hệ thống phân tích video & tạo prompt chuyên nghiệp cho Veo 3</p>
      
      <button 
        onClick={onLogin}
        className="w-full bg-white text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-4 hover:bg-slate-100 transition-all active:scale-95 shadow-xl"
      >
        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6" />
        Đăng nhập với Google
      </button>
      
      <p className="mt-8 text-xs text-slate-500 font-medium uppercase tracking-widest">Hotline: 0907886787</p>
    </div>
  </div>
);

const BulkAnalysis = ({ items, setItems, isProcessing, setIsProcessing, model, setModel, style, setStyle, userCredits, userId }: any) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lastResult, setLastResult] = useState<string>("");

  const STYLES = [
    "Phân tích theo video gốc (Original Style)",
    "Synthwave, neon sunset, 80s retro",
    "Dark fantasy, dramatic lighting",
    "Kawaii chibi cute style",
    "Hyper-realistic portrait",
    "Sci-fi futuristic spaceship",
    "Disney classic 2D animation",
    "Tùy chỉnh phong cách..."
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    const newItems: BulkVideoItem[] = files.map(f => ({
      id: Math.random().toString(36).substring(7),
      file: f,
      previewUrl: URL.createObjectURL(f),
      status: 'idle',
      scenes: []
    }));
    setItems((prev: BulkVideoItem[]) => [...prev, ...newItems]);
  };

  const pendingItems = items.filter((it: any) => it.status !== 'completed');
  const totalCost = pendingItems.length * 250;

  const processItem = async (item: any) => {
    if (isProcessing) return;
    if (userCredits < 250) {
      alert("Bạn không đủ credits để xử lý video này.");
      return;
    }

    setItems((prev: any) => prev.map((it: any) => it.id === item.id ? { ...it, status: 'processing' } : it));

    try {
      const result = await analyzeVideo(item.file, style, model, 0);
      const videoText = result.scenes.map(s => JSON.stringify(s)).join("\n\n");
      
      const blob = new Blob([videoText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const baseName = item.file.name.substring(0, item.file.name.lastIndexOf('.')) || item.file.name;
      a.download = `${baseName}_prompt.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      const userDocRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        const currentCredits = userSnap.data().credits || 0;
        await updateDoc(userDocRef, { credits: Math.max(0, currentCredits - 250) });
      }

      setItems((prev: any) => prev.map((it: any) => it.id === item.id ? { ...it, status: 'completed', scenes: result.scenes } : it));
    } catch (error: any) {
      console.error("Single process error:", error);
      const errorMessage = error?.message || "Lỗi xử lý";
      setItems((prev: any) => prev.map((it: any) => it.id === item.id ? { ...it, status: 'error', error: errorMessage } : it));
    }
  };

  const startProcessing = async () => {
    if (isProcessing) return;
    
    if (userCredits < totalCost) {
      alert(`Bạn không đủ credits. Cần ${totalCost} credits để xử lý ${pendingItems.length} video.`);
      return;
    }

    setIsProcessing(true);
    setLastResult("");
    
    for (const item of items) {
      if (item.status === 'completed') continue;
      
      setItems((prev: any) => prev.map((it: any) => it.id === item.id ? { ...it, status: 'processing' } : it));
      
      try {
        const result = await analyzeVideo(item.file, style, model, 0);
        
        // Format this video's scenes as one JSON per line with blank lines
        const videoText = result.scenes.map(s => JSON.stringify(s)).join("\n\n");
        setLastResult(videoText);
        
        // Automatic download for THIS individual video
        const blob = new Blob([videoText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Use original filename but change extension to .txt
        const baseName = item.file.name.substring(0, item.file.name.lastIndexOf('.')) || item.file.name;
        a.download = `${baseName}_prompt.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Deduct credits
        const userDocRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const currentCredits = userSnap.data().credits || 0;
          await updateDoc(userDocRef, { credits: Math.max(0, currentCredits - 250) });
        }

        setItems((prev: any) => prev.map((it: any) => it.id === item.id ? { ...it, status: 'completed', scenes: result.scenes } : it));
      } catch (error: any) {
        console.error("Bulk process error:", error);
        const errorMessage = error?.message || "Lỗi xử lý";
        setItems((prev: any) => prev.map((it: any) => it.id === item.id ? { ...it, status: 'error', error: errorMessage } : it));
      }
    }

    setIsProcessing(false);
    
    // We need to get the latest state or track counts locally because 'items' in this closure is stale
    setItems((currentItems: any) => {
      const successCount = currentItems.filter((it: any) => it.status === 'completed').length;
      const errorCount = currentItems.filter((it: any) => it.status === 'error').length;
      
      if (errorCount > 0) {
        alert(`Xử lý hoàn tất: ${successCount} video thành công, ${errorCount} video bị lỗi. Vui lòng kiểm tra lại các video bị lỗi.`);
      } else if (successCount > 0) {
        alert("Đã xử lý xong toàn bộ video và tự động tải về file prompt!");
      }
      return currentItems;
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 space-y-6">
        <div className="glass-panel p-8 rounded-3xl">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-indigo-500" /> NGUỒN VIDEO
          </h3>
          
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-800 rounded-2xl p-10 text-center hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all cursor-pointer group"
          >
            <Upload className="w-10 h-10 text-slate-600 mx-auto mb-4 group-hover:text-indigo-400 transition-colors" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {items.length > 0 ? `ĐÃ CHỌN ${items.length} VIDEO` : "KÉO THẢ HOẶC NHẤP ĐỂ CHỌN NHIỀU VIDEO"}
            </p>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="video/*" className="hidden" />
          </div>

          <div className="mt-8 space-y-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-indigo-500" /> CẤU HÌNH SAO CHÉP
            </h3>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">AI MODEL</label>
              <select 
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full input-field bg-slate-950 border-slate-800 text-sm font-bold"
              >
                <option value="gemini-3-flash-preview">Gemini 3 Flash (Nhanh & Ổn định)</option>
                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Chất lượng cao)</option>
                <option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">PHONG CÁCH ĐÍCH</label>
              <select 
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="w-full input-field bg-slate-950 border-slate-800 text-sm font-bold"
              >
                {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ƯỚC TÍNH CHI PHÍ:</span>
              <span className="text-sm font-bold text-indigo-400">{totalCost.toLocaleString()} Credits</span>
            </div>
          </div>

          <button 
            onClick={startProcessing}
            disabled={isProcessing || items.length === 0}
            className="w-full btn-primary mt-8 py-4 text-sm font-black uppercase tracking-widest"
          >
            {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : null}
            BẮT ĐẦU CLONE HÀNG LOẠT
          </button>
        </div>

        <div className="glass-panel p-8 rounded-3xl">
          <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-4">THÔNG TIN CÔNG CỤ</h4>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Hệ thống sẽ chia nhỏ video thành các phân đoạn 8 giây để phân tích chi tiết về nhân vật, bối cảnh, hành động và phong cách hình ảnh. 
            Kết quả trả về định dạng JSON kỹ thuật dùng để tái tạo video trên các nền tảng AI Video Generation.
          </p>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="glass-panel rounded-3xl h-[calc(100vh-12rem)] flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> DANH SÁCH XỬ LÝ HÀNG LOẠT ({items.length})
            </h3>
            {items.length > 0 && (
              <button 
                onClick={() => setItems([])}
                className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 uppercase tracking-widest"
              >
                XÓA HẾT
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-700">
                <div className="w-24 h-24 rounded-full bg-slate-900/50 flex items-center justify-center mb-6">
                  <FileVideo className="w-10 h-10 opacity-20" />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest opacity-30">CHƯA CÓ VIDEO TRONG DANH SÁCH</p>
              </div>
            ) : (
              items.map((item: any) => (
                <div key={item.id} className="bg-slate-900/30 border border-slate-800/50 rounded-2xl p-4 flex items-center gap-4 group hover:bg-slate-800/30 transition-all">
                  <div className="w-24 h-14 bg-slate-950 rounded-xl overflow-hidden relative flex-shrink-0 border border-slate-800">
                    <video src={item.previewUrl} className="w-full h-full object-cover" />
                    {item.status === 'processing' && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white truncate uppercase tracking-tight">{item.file.name}</h4>
                    <p className="text-[10px] text-slate-500 uppercase font-bold mt-1">
                      {item.status === 'idle' ? 'CHỜ XỬ LÝ' : item.status === 'processing' ? 'ĐANG XỬ LÝ...' : item.status === 'completed' ? 'HOÀN THÀNH' : `LỖI: ${item.error || 'Xử lý thất bại'}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.status === 'error' && (
                      <button 
                        onClick={() => processItem(item)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-lg transition-all border border-indigo-500/20"
                        title="Thử lại"
                      >
                        <RefreshCcw className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">THỬ LẠI</span>
                      </button>
                    )}
                    <button 
                      onClick={() => setItems((prev: any) => prev.filter((it: any) => it.id !== item.id))}
                      className="p-2 hover:bg-red-500/10 text-slate-600 hover:text-red-400 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronDown className="w-4 h-4 text-slate-600" />
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="p-4 border-t border-slate-800/50 bg-slate-950/50 text-center">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em]">ENGINEERED FOR CONTENT RE-CREATION • PRIVATE ENVIRONMENT</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Transcription = ({ files, setFiles, hasTimestamp, setHasTimestamp, result, setResult }: any) => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles(selected);
  };

  const startTranscription = async () => {
    if (files.length === 0 || isTranscribing) return;
    setIsTranscribing(true);
    setResult("");
    
    try {
      const text = await transcribeAudioVideo(files[0], "gemini-1.5-flash", hasTimestamp);
      setResult(text);
    } catch (error) {
      console.error(error);
      setResult("Lỗi khi chuyển đổi văn bản.");
    }
    setIsTranscribing(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 space-y-6">
        <div className="glass-panel p-8 rounded-3xl">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Mic className="w-4 h-4" /> NGUỒN AUDIO/VIDEO
          </h3>
          
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-800 rounded-2xl p-10 text-center hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all cursor-pointer group"
          >
            <Upload className="w-10 h-10 text-slate-600 mx-auto mb-4 group-hover:text-indigo-400 transition-colors" />
            <p className="text-sm font-medium text-slate-400">Chọn file Audio hoặc Video</p>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="video/*,audio/*" className="hidden" />
          </div>

          {files.length > 0 && (
            <div className="mt-4 p-3 bg-slate-950/50 rounded-xl border border-slate-800 flex items-center gap-3">
              <FileAudio className="w-5 h-5 text-indigo-400" />
              <span className="text-xs font-medium truncate">{files[0].name}</span>
            </div>
          )}

          <div className="mt-8 space-y-4">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Cấu hình mốc thời gian</label>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => setHasTimestamp(true)}
                className={cn("py-2 rounded-lg text-xs font-bold transition-all", hasTimestamp ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-500")}
              >
                CÓ TIMESTAMP
              </button>
              <button 
                onClick={() => setHasTimestamp(false)}
                className={cn("py-2 rounded-lg text-xs font-bold transition-all", !hasTimestamp ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-500")}
              >
                KHÔNG TIMESTAMP
              </button>
            </div>
          </div>

          <button 
            onClick={startTranscription}
            disabled={isTranscribing || files.length === 0}
            className="w-full btn-primary mt-8 py-4 text-lg"
          >
            {isTranscribing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Type className="w-6 h-6" />}
            BẮT ĐẦU CHUYỂN SOẠN
          </button>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="glass-panel rounded-3xl h-[calc(100vh-12rem)] flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" /> KẾT QUẢ VĂN BẢN
            </h3>
            {result && (
              <button 
                onClick={() => {
                  const blob = new Blob([result], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = "transcription.txt";
                  a.click();
                }}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> TẢI VỀ (.TXT)
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-8">
            {isTranscribing ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600">
                <Loader2 className="w-16 h-16 mb-4 animate-spin opacity-20" />
                <p className="text-sm font-medium">Đang chuyển đổi văn bản...</p>
              </div>
            ) : result ? (
              <pre className="text-sm font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">{result}</pre>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600">
                <FileText className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-sm font-medium">Kết quả sẽ hiển thị tại đây</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const MergeFiles = ({ type, files, setFiles }: { type: 'txt' | 'csv', files: File[], setFiles: any }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [outputName, setOutputName] = useState(type === 'txt' ? 'merged_prompts' : 'merged_prompts_csv');
  const [charLimit, setCharLimit] = useState(1000000);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles((prev: File[]) => [...prev, ...selected]);
  };

  const handleMerge = async () => {
    if (files.length === 0) return;
    
    let combinedContent = "";
    
    if (type === 'txt') {
      for (const file of files) {
        const text = await file.text();
        combinedContent += text + "\n\n";
      }
    } else {
      for (const file of files) {
        const text = await file.text();
        combinedContent += text + "\n";
      }
    }

    const blob = new Blob([combinedContent], { type: type === 'txt' ? 'text/plain' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${outputName}.${type}`;
    a.click();
    URL.revokeObjectURL(url);
    alert(`Đã gộp ${files.length} file và tải về thành công!`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="lg:col-span-1 space-y-6">
        <div className="glass-panel p-8 rounded-[2rem] border-slate-800/50">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" /> NGUỒN FILE {type.toUpperCase()}
          </h3>
          
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-800 rounded-3xl p-12 text-center hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <Upload className="w-12 h-12 text-slate-600 mx-auto mb-4 group-hover:text-indigo-400 transition-all group-hover:scale-110" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] group-hover:text-slate-300 transition-colors">
              {files.length > 0 ? `ĐÃ CHỌN ${files.length} FILE` : `KÉO THẢ HOẶC NHẤP ĐỂ CHỌN NHIỀU FILE ${type.toUpperCase()}`}
            </p>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept={type === 'txt' ? '.txt' : '.csv'} className="hidden" />
          </div>

          <div className="mt-8 space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">TÊN FILE ĐẦU RA</label>
              <input 
                type="text" 
                value={outputName}
                onChange={(e) => setOutputName(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">GIỚI HẠN KÝ TỰ MỖI FILE</label>
              <input 
                type="number" 
                value={charLimit}
                onChange={(e) => setCharLimit(parseInt(e.target.value))}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:border-indigo-500 outline-none transition-all"
              />
            </div>
          </div>

          <button 
            onClick={handleMerge}
            disabled={files.length === 0}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black py-5 rounded-2xl mt-8 transition-all shadow-xl shadow-emerald-600/10 uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3"
          >
            <Download className="w-5 h-5" /> GỘP VÀ TẢI VỀ
          </button>
        </div>

        <div className="glass-panel p-8 rounded-[2rem] border-slate-800/50">
          <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em] mb-4">THÔNG TIN CÔNG CỤ</h4>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Công cụ xử lý file prompt {type.toUpperCase()}. Hỗ trợ gộp nhiều file thành một file duy nhất hoặc chuyển đổi danh sách prompt sang định dạng {type === 'txt' ? 'CSV' : 'TXT'} để quản lý dễ dàng hơn.
          </p>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="glass-panel rounded-[2.5rem] h-[calc(100vh-12rem)] flex flex-col overflow-hidden border-slate-800/50">
          <div className="p-8 border-b border-slate-800/50 flex items-center justify-between bg-slate-900/20">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" /> DANH SÁCH FILE ({files.length})
            </h3>
            {files.length > 0 && (
              <button 
                onClick={() => setFiles([])}
                className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 uppercase tracking-widest"
              >
                XÓA TẤT CẢ
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {files.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-700">
                <div className="w-32 h-32 rounded-full bg-slate-900/50 flex items-center justify-center mb-8 border border-slate-800/50">
                  <FileText className="w-12 h-12 opacity-10" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-20">CHƯA CÓ FILE {type.toUpperCase()} TRONG DANH SÁCH</p>
              </div>
            ) : (
              files.map((file, index) => (
                <div key={index} className="bg-slate-900/30 border border-slate-800/50 rounded-2xl p-5 flex items-center gap-5 group hover:bg-slate-800/30 hover:border-indigo-500/30 transition-all animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center border border-slate-800 flex-shrink-0 group-hover:border-indigo-500/50 transition-colors">
                    <FileText className="w-6 h-6 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-white truncate uppercase tracking-tight group-hover:text-indigo-100 transition-colors">{file.name}</h4>
                    <p className="text-[10px] text-slate-500 uppercase font-bold mt-1.5 tracking-widest">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button 
                    onClick={() => setFiles((prev: File[]) => prev.filter((_, i) => i !== index))}
                    className="p-3 hover:bg-red-500/10 text-slate-600 hover:text-red-400 rounded-xl transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
