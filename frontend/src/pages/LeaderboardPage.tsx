import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Medal, Star, Crown } from "lucide-react";
import { stagger, fadeUp } from "@/lib/animations";
import { LeaderboardWidget } from "@/components/LeaderboardWidget";

export default function LeaderboardPage() {
    return (
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 h-[calc(100vh-8rem)]">
            <motion.div variants={fadeUp} className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Global Leaderboard</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Keep track of top performers based on KPI targets and resolved tasks.</p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1.5">
                    <Trophy className="h-4 w-4 text-accent" />
                    <span className="text-xs font-medium text-accent">Live Rankings</span>
                </div>
            </motion.div>

            {/* Replace static data entirely with the live LeaderboardWidget component but styled to fill this page */}
            <motion.div variants={fadeUp} className="h-full mt-4">
                <LeaderboardWidget />
            </motion.div>
        </motion.div>
    );
}
