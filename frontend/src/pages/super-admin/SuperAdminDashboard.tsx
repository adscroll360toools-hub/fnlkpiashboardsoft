import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { StatCard } from "@/components/StatCard";
import { Building2, Users, ClipboardCheck, TrendingUp, Plus, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.superAdmin.stats()
      .then(res => setStats(res))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Platform Overview</h1>
          <p className="text-slate-400 mt-1">Global statistics across all tenants</p>
        </div>
        <Button onClick={() => navigate("/super-admin/companies")} className="gap-2 bg-blue-600 hover:bg-blue-500">
          <Plus className="w-4 h-4" /> Create Company
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Companies" value={stats?.companiesCount?.toString() || "0"} icon={Building2} variant="primary" />
        <StatCard title="Total Users" value={stats?.usersCount?.toString() || "0"} icon={Users} />
        <StatCard title="Total Tasks" value={stats?.tasksCount?.toString() || "0"} icon={ClipboardCheck} />
        <StatCard title="Platform Health" value="100%" icon={TrendingUp} subtitle="All systems operational" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-400" /> Recent Companies
          </h2>
          <div className="space-y-4">
            {stats?.recentCompanies?.map((company: any) => (
              <div key={company.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all group">
                <div>
                  <div className="text-white font-semibold">{company.name}</div>
                  <div className="text-slate-500 text-xs">{company.adminEmail}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    company.plan === 'Global' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' :
                    company.plan === 'Enterprise' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                    'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                  }`}>
                    {company.plan}
                  </div>
                  <button onClick={() => navigate(`/super-admin/companies?id=${company.id}`)} className="text-slate-500 group-hover:text-white transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Platform Distribution</h2>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Global Plans</span>
                <span className="text-white font-medium">35%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full" style={{ width: '35%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Enterprise Plans</span>
                <span className="text-white font-medium">45%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '45%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Starter Plans</span>
                <span className="text-white font-medium">20%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-slate-500 rounded-full" style={{ width: '20%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
