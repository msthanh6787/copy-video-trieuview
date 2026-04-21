import React from 'react';
import { 
  LayoutDashboard, 
  Files, 
  FileText, 
  Mic, 
  ShoppingBag, 
  History, 
  BarChart3, 
  LogOut, 
  User as UserIcon,
  Phone,
  Plus,
  Shield
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  role?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, role }) => {
  const menuItems = [
    { id: 'bulk', label: 'COPY VIDEO HÀNG LOẠT', icon: Files },
    { id: 'merge-txt', label: 'NỐI FILE PROMPT TXT', icon: FileText },
    { id: 'merge-csv', label: 'NỐI FILE PROMPT CSV', icon: FileText },
    { id: 'transcribe', label: 'AUDIO/VIDEO THÀNH VĂN BẢN', icon: Mic },
  ];

  if (role === 'admin') {
    menuItems.push({ id: 'admin', label: 'QUẢN TRỊ ADMIN', icon: Shield });
  }

  return (
    <aside className="w-72 bg-[#0f172a] border-r border-slate-800 flex flex-col h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800/50">
        <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
          <LayoutDashboard className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">COPY VIDEO PRO</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Version 2.0</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group",
              activeTab === item.id 
                ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20" 
                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
            )}
          >
            <item.icon className={cn("w-5 h-5 transition-colors", activeTab === item.id ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300")} />
            {item.label}
          </button>
        ))}

        <div className="mt-8 px-2">
          <a 
            href="https://zalo.me/0907886787" 
            target="_blank" 
            rel="noopener noreferrer"
            className="block glass-panel rounded-2xl overflow-hidden border-slate-800/50 group cursor-pointer transition-all hover:border-indigo-500/50"
          >
            <div className="relative aspect-square">
              <img 
                src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjcwdLhOk62Zj6cA2koKhLcQKevsttgmGmde1mwQnT9TVSyq5m6xbjqwv0GdKdHASjIZT6HJ0MIWsoCL0121wMrHXdoiZf0Z5aW-zfDtqGgF0s_wE4Qhff3y3SmE4srYLqqOO_W6rHr_fN1Vo9Kc15FwL-N1pNYCWKGFD309NjB2ezXWE48Ryhg9Qd3LdI/s320/thanh.png" 
                alt="Coaching Banner" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </a>
        </div>
      </nav>

      <div className="p-4 border-t border-slate-800/50">
        <div className="bg-slate-800/30 rounded-2xl p-4 border border-slate-800/50">
          <div className="flex items-center gap-2 text-indigo-400 mb-2">
            <Phone className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Hotline Hỗ Trợ</span>
          </div>
          <p className="text-lg font-bold text-white">0907886787</p>
        </div>
      </div>
    </aside>
  );
};

interface NavbarProps {
  user: any;
  credits: number;
  onLogout: () => void;
  onOpenTopUp: () => void;
  onOpenHistory: () => void;
  onOpenStats: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, credits, onLogout, onOpenTopUp, onOpenHistory, onOpenStats }) => {
  return (
    <header className="h-20 bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800/50 px-8 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-6">
        <nav className="flex items-center gap-1">
          <a 
            href="https://999.edu.vn/?ref=156" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-wider"
          >
            <ShoppingBag className="w-4 h-4" />
            HỌC AI FREE
          </a>
          <NavButton icon={History} label="ĐÃ MUA" onClick={onOpenHistory} />
          <NavButton icon={FileText} label="ĐƠN HÀNG" onClick={onOpenHistory} />
          <NavButton icon={BarChart3} label="THỐNG KÊ" onClick={onOpenStats} />
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 bg-indigo-600/10 border border-indigo-500/20 px-4 py-2 rounded-full">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-sm font-bold text-indigo-400">{credits.toLocaleString()} CREDITS</span>
          <button 
            onClick={onOpenTopUp}
            className="p-1 hover:bg-indigo-500/20 rounded-full transition-colors"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
          </button>
        </div>

        <div className="h-8 w-[1px] bg-slate-800 mx-2" />

        <div className="flex items-center gap-3">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-slate-800 shadow-lg" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border-2 border-slate-700">
              <UserIcon className="w-5 h-5 text-slate-400" />
            </div>
          )}
          <button 
            onClick={onLogout}
            className="p-2 hover:bg-red-500/10 hover:text-red-400 text-slate-400 rounded-lg transition-all"
            title="Đăng xuất"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

const NavButton = ({ icon: Icon, label, onClick }: { icon: any, label: string, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-wider"
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
);
