"use client";

import { motion } from "framer-motion";
import { TrendingDown, Clock, EyeOff } from "lucide-react";

const problemCards = [
    {
        title: "Estimaciones",
        description: "Asumir rendimientos que no son reales.",
        icon: TrendingDown,
        accentColor: "cyan",
        bgGradient: "from-cyan-900/30 to-slate-900/20",
        shadowColor: "shadow-cyan-500/20",
        iconBg: "bg-cyan-500/10",
        borderHover: "hover:border-cyan-500/30"
    },
    {
        title: "Datos Tardíos",
        description: "Saber cuánto produjiste cuando ya no puedes corregir errores.",
        icon: Clock,
        accentColor: "amber",
        bgGradient: "from-amber-900/30 to-slate-900/20",
        shadowColor: "shadow-amber-500/20",
        iconBg: "bg-amber-500/10",
        borderHover: "hover:border-amber-500/30"
    },
    {
        title: "Puntos Ciegos",
        description: "No saber qué está pasando realmente en tu línea ahora mismo.",
        icon: EyeOff,
        accentColor: "rose",
        bgGradient: "from-rose-900/30 to-slate-900/20",
        shadowColor: "shadow-rose-500/20",
        iconBg: "bg-rose-500/10",
        borderHover: "hover:border-rose-500/30"
    }
];

const iconColors: Record<string, string> = {
    cyan: "text-cyan-400",
    amber: "text-amber-400",
    rose: "text-rose-400"
};

const titleColors: Record<string, string> = {
    cyan: "text-cyan-400",
    amber: "text-amber-400",
    rose: "text-rose-400"
};

const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: {
            delay: i * 0.15,
            duration: 0.6,
            ease: "easeOut"
        }
    })
};

export default function Problem() {
  return (
    <section className="py-24 bg-slate-950 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-slate-900/50 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
            >
                <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-6">
                    La incertidumbre operativa <br />
                    <span className="text-slate-400">
                        te está costando dinero.
                    </span>
                </h2>
                <div className="h-1 w-24 bg-gradient-to-r from-cyan-400 to-transparent mx-auto rounded-full mb-8" />
                
                <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-16 leading-relaxed">
                    En la agroindustria, muchas veces se opera basándose en estimaciones al ojo o se obtienen los datos reales cuando el proceso ya terminó.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                    {problemCards.map((card, index) => {
                        const IconComponent = card.icon;
                        return (
                            <motion.div
                                key={card.title}
                                custom={index}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={cardVariants}
                                className={`relative group overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-8 transition-all duration-500 ${card.borderHover} hover:shadow-2xl ${card.shadowColor} hover:-translate-y-2`}
                            >
                                {/* Gradient overlay on hover */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${card.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                                
                                {/* Glow effect */}
                                <div className={`absolute -top-10 -right-10 w-32 h-32 ${card.iconBg} rounded-full blur-3xl opacity-0 group-hover:opacity-60 transition-opacity duration-500`} />
                                
                                <div className="relative z-10">
                                    {/* Icon container with background */}
                                    <div className={`inline-flex items-center justify-center w-14 h-14 ${card.iconBg} rounded-xl mb-6 transition-transform duration-300 group-hover:scale-110`}>
                                        <IconComponent className={`w-7 h-7 ${iconColors[card.accentColor]}`} />
                                    </div>
                                    
                                    <h3 className={`${titleColors[card.accentColor]} text-xl font-bold mb-3 transition-colors duration-300`}>
                                        {card.title}
                                    </h3>
                                    <p className="text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors duration-300">
                                        {card.description}
                                    </p>
                                </div>

                                {/* Decorative corner accent */}
                                <div className={`absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-tl ${card.bgGradient} opacity-30 rounded-tl-full`} />
                            </motion.div>
                        );
                    })}
                </div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                    className="mt-16"
                >
                    <p className="text-2xl font-medium text-white italic">
                        &quot;Elimina la suposición. Toma decisiones con datos reales, al instante.&quot;
                    </p>
                </motion.div>

            </motion.div>
        </div>
    </section>
  );
}
