import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

interface ProductCardProps {
  name: string;
  imageSrc: string;
  linkHref: string;
}

export function ProductCard({ name, imageSrc, linkHref }: ProductCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col h-full"
    >
      <Link href={linkHref} className="block flex-grow">
        <div className="relative aspect-square overflow-hidden p-4">
          <div className="relative w-full h-full rounded-lg overflow-hidden">
            <Image
              src={imageSrc}
              alt={name}
              layout="fill"
              objectFit="cover"
              className="transition-transform duration-300 hover:scale-105"
            />
          </div>
        </div>
        <div className="p-4 text-center">
          <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
        </div>
      </Link>
    </motion.div>
  );
}
