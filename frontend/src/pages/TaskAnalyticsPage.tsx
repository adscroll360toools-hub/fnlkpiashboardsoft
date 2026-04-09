import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  BarChart3, TrendingUp, Calendar, Users, 
  Target, CheckCircle2, AlertCircle, Filter,
  ArrowUpRight, ArrowDownRight, Activity
} from "lucide-react";
import { 
  LineChart, Line, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell 
} from "recharts";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export default function TaskAnalyticsPage() {
  const { currentUser } = useAuth();
  const [range, setRange] = useState("month");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.companyId && currentUser?.role !== 'super_admin') return;
    
    setLoading(true);
    api.tasks.analytics({ 
      companyId: currentUser?.companyId || "", 
      range 
    })
      .then(res => setData(res))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [range, currentUser]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  const COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-500" /> Task Performance Analytics
          </h1>
          <p className="text-slate-400 mt-1">Detailed productivity insight and trends</p>
        </div>
        
        <div className="flex items-center gap-1 bg-slate-900/50 border border-white/5 p-1 rounded-xl">
          {["week", "month", "year"].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                range === r 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                : "text-slate-400 hover:text-white"
              }`}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-white/5 p-6 rounded-2xl">
          <div className="text-slate-500 text-sm font-medium mb-2">Total Assigned</div>
          <div className="text-3xl font-bold text-white mb-2">{data?.total || 0}</div>
          <div className="flex items-center gap-1 text-emerald-400 text-xs">
            <ArrowUpRight className="w-3 h-3" /> +12% from last {range}
          </div>
        </div>
        <div className="bg-slate-900 border border-white/5 p-6 rounded-2xl">
          <div className="text-slate-500 text-sm font-medium mb-2">Tasks Completed</div>
          <div className="text-3xl font-bold text-white mb-2">{data?.completed || 0}</div>
          <div className="flex items-center gap-1 text-emerald-400 text-xs">
            <ArrowUpRight className="w-3 h-3" /> +8.4% productivity
          </div>
        </div>
        <div className="bg-slate-900 border border-white/5 p-6 rounded-2xl">
          <div className="text-slate-500 text-sm font-medium mb-2">Completion Rate</div>
          <div className="text-3xl font-bold text-white mb-2">{data?.completionRate || 0}%</div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full mt-3 overflow-hidden">
             <div className="h-full bg-blue-500 rounded-full" style={{ width: `${data?.completionRate}%` }} />
          </div>
        </div>
        <div className="bg-slate-900 border border-white/5 p-6 rounded-2xl">
          <div className="text-slate-500 text-sm font-medium mb-2">Avg. Completion Time</div>
          <div className="text-3xl font-bold text-white mb-2">4.2h</div>
          <div className="flex items-center gap-1 text-amber-400 text-xs">
            <ArrowDownRight className="w-3 h-3" /> -10m improvement
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Trend Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-white/5 p-8 rounded-3xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" /> Performance Trend
            </h3>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Completed</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-700" /> Assigned</div>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.chartData || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff0a" />
                <XAxis 
                  dataKey="label" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#ffffff1a', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="completed" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#0f172a' }}
                  activeDot={{ r: 6, fill: '#3b82f6' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="assigned" 
                  stroke="#334155" 
                  strokeWidth={2} 
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Team Productivity Bar */}
        <div className="bg-slate-900 border border-white/5 p-8 rounded-3xl">
           <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
              <Users className="w-5 h-5 text-violet-400" /> Team Productivity
           </h3>
           <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.leaderboard?.slice(0, 5) || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" vertical={false} horizontal={false} stroke="#ffffff0a" />
                <XAxis type="number" hide />
                <YAxis 
                   dataKey="name" 
                   type="category" 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fill: '#cbd5e1', fontSize: 11 }} 
                   width={80}
                />
                <Tooltip 
                  cursor={{ fill: '#ffffff05' }}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#ffffff1a', borderRadius: '12px' }}
                />
                <Bar 
                   dataKey="completed" 
                   radius={[0, 4, 4, 0]} 
                   barSize={16}
                >
                   {data?.leaderboard?.map((_: any, index: number) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                   ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
           </div>
        </div>
      </div>

      {/* Leaderboard Detail */}
      <div className="bg-slate-900 border border-white/5 rounded-3xl overflow-hidden">
        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
           <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-400" /> Performance Leaderboard
           </h3>
           <div className="text-xs text-slate-500 font-medium bg-white/5 px-3 py-1 rounded-full uppercase tracking-widest">
              Live Ranking
           </div>
        </div>
        <div className="overflow-x-auto">
           <table className="w-full text-left">
              <thead>
                 <tr className="text-slate-500 text-xs uppercase tracking-wider">
                    <th className="px-8 py-4 font-black">Rank</th>
                    <th className="px-8 py-4 font-black">Employee</th>
                    <th className="px-8 py-4 font-black text-center">Assigned</th>
                    <th className="px-8 py-4 font-black text-center">Completed</th>
                    <th className="px-8 py-4 font-black text-right">KPI Score</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                 {data?.leaderboard?.map((member: any, i: number) => (
                    <tr key={member.id} className="hover:bg-white/5 transition-colors group">
                       <td className="px-8 py-4">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                             i === 0 ? 'bg-amber-400/20 text-amber-400' :
                             i === 1 ? 'bg-slate-300/20 text-slate-300' :
                             i === 2 ? 'bg-orange-500/20 text-orange-400' : 'text-slate-500'
                          }`}>
                             {i + 1}
                          </div>
                       </td>
                       <td className="px-8 py-4">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-black text-slate-300 uppercase">
                                {member.name[0]}
                             </div>
                             <div className="text-white font-bold text-sm tracking-tight">{member.name}</div>
                          </div>
                       </td>
                       <td className="px-8 py-4 text-center text-slate-400 font-medium">{member.total}</td>
                       <td className="px-8 py-4 text-center">
                          <span className="text-emerald-400 font-bold">{member.completed}</span>
                       </td>
                       <td className="px-8 py-4 text-right">
                          <div className="inline-flex items-center gap-3">
                             <div className="text-white font-black">{member.kpiScore}%</div>
                             <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${member.kpiScore}%` }} />
                             </div>
                          </div>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </div>
    </div>
  );
}
