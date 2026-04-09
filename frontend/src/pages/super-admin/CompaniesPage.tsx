import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { 
  Building2, Plus, Search, MoreVertical, Trash2, 
  Settings, Key, AlertCircle, X, CheckCircle2,
  Mail, Globe, Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    adminEmail: "",
    adminPassword: "",
    plan: "Starter",
    industry: "",
    website: ""
  });
  const { toast } = useToast();

  const loadCompanies = () => {
    setLoading(true);
    api.superAdmin.companies.list()
      .then(res => setCompanies(res.companies))
      .catch(err => toast({ title: "Error", description: err.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCompanies(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.superAdmin.companies.create(formData);
      toast({ title: "Success", description: "Company created successfully" });
      setShowCreateModal(false);
      loadCompanies();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this company and all its data? This cannot be undone.")) return;
    try {
      await api.superAdmin.companies.remove(id);
      toast({ title: "Success", description: "Company deleted successfully" });
      loadCompanies();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const filtered = companies.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.adminEmail.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-500" /> Company Management
          </h1>
          <p className="text-slate-400 mt-1">Manage platform tenants, plans, and access</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-500 gap-2 h-11 px-6 rounded-xl font-semibold shadow-lg shadow-blue-500/20">
          <Plus className="w-5 h-5" /> Add New Company
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-slate-900/50 border border-white/5 rounded-2xl px-4 py-3">
        <Search className="w-5 h-5 text-slate-500" />
        <input 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search companies by name or email..." 
          className="bg-transparent border-0 focus:ring-0 text-white flex-1 text-sm outline-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((company) => (
          <motion.div 
            layout
            key={company.id} 
            className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden hover:border-white/20 transition-all group"
          >
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xl uppercase">
                    {company.name[0]}
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg leading-tight">{company.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider uppercase ${
                        company.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {company.status}
                      </span>
                      <span className="text-slate-500 text-xs">• {company.plan} Plan</span>
                    </div>
                  </div>
                </div>
                <div className="relative group/menu">
                  <button className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-white/10 rounded-xl shadow-2xl py-2 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10 translate-y-2 group-hover/menu:translate-y-0 text-left">
                    <button className="w-full px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2">
                      <Settings className="w-4 h-4" /> Edit Company
                    </button>
                    <button className="w-full px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2">
                      <Key className="w-4 h-4" /> Reset Admin
                    </button>
                    <div className="h-px bg-white/5 mx-2 my-1" />
                    <button onClick={() => handleDelete(company.id)} className="w-full px-4 py-2 text-sm text-red-400 hover:bg-red-400/5 flex items-center gap-2">
                        <Trash2 className="w-4 h-4" /> Delete Global
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Mail className="w-4 h-4" /> {company.adminEmail}
                </div>
                {company.website && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Globe className="w-4 h-4" /> {company.website}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Briefcase className="w-4 h-4" /> {company.industry || 'Tech / SaaS'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
                  <div className="text-white font-bold leading-none">{company.userCount || 0}</div>
                  <div className="text-slate-500 text-[10px] font-medium uppercase mt-1 tracking-wider">Employees</div>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
                  <div className="text-white font-bold leading-none">0</div>
                  <div className="text-slate-500 text-[10px] font-medium uppercase mt-1 tracking-wider">Storage</div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        </div>
      )}

      {/* ── CREATE MODAL ────────────────────────────────────── */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreateModal(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Create New Company</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Company Name</label>
                    <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-slate-800 border-0 h-11" placeholder="e.g. Acme Corp" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Subscription Plan</label>
                    <select value={formData.plan} onChange={e => setFormData({...formData, plan: e.target.value})} className="flex h-11 w-full rounded-md border border-input border-0 bg-slate-800 px-3 py-2 text-sm focus-visible:outline-none text-white">
                      <option className="bg-slate-900">Starter</option>
                      <option className="bg-slate-900">Enterprise</option>
                      <option className="bg-slate-900">Global</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Admin Email</label>
                    <Input required type="email" value={formData.adminEmail} onChange={e => setFormData({...formData, adminEmail: e.target.value})} className="bg-slate-800 border-0 h-11" placeholder="admin@example.com" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Initial Password</label>
                    <Input required value={formData.adminPassword} onChange={e => setFormData({...formData, adminPassword: e.target.value})} className="bg-slate-800 border-0 h-11" placeholder="Minimum 6 characters" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Industry</label>
                    <Input value={formData.industry} onChange={e => setFormData({...formData, industry: e.target.value})} className="bg-slate-800 border-0 h-11" placeholder="e.g. Software, Tech" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Website</label>
                    <Input value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} className="bg-slate-800 border-0 h-11" placeholder="https://..." />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1 border-white/10 hover:bg-white/5 h-12 rounded-xl text-slate-400">Cancel</Button>
                  <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 h-12 rounded-xl font-bold shadow-lg shadow-blue-500/20">Provision Workspace</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
