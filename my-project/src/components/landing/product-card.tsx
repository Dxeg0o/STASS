import { motion } from "framer-motion";
import Link from "next/link";

interface ProductCardProps {
  name: string;
  linkHref: string;
}

export function ProductCard({ name, linkHref }: ProductCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col h-full border-2 border-[#f3c301] p-2"
    >
      <Link href={linkHref} className="block flex-grow">
        <div className="p-2 text-center">
          <h3 className="text-xl font-semibold text-[#03312e]">{name}</h3>
        </div>
      </Link>
    </motion.div>
  );
}
