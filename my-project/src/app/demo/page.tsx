"use client";

import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import Link from "next/link";

interface YouTubePlayerProps {
  videoId: string;
  title?: string;
}

export default function YouTubePlayer({
  videoId,
  title = "Demo STASS",
}: YouTubePlayerProps) {
  return (
    <div className="min-h-screen w-full py-6 sm:py-12 bg-green-50">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        <div className="w-24 h-8 sm:w-36 sm:h-12 mx-auto sm:mx-0">
          <Link href={"/"}>
            <img src="images/logo2.png" alt="Logo" />
          </Link>
        </div>
        <div className="my-24 md:my-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className=" font-bold tracking-tighter text-3xl md:text-5xl text-center mb-4 sm:mb-8 text-green-800">
              Ve nuestra demo
            </h2>
            <Card className="w-full max-w-lg sm:max-w-4xl mx-auto overflow-hidden shadow-lg">
              <CardContent className="p-0">
                <div className="relative w-full h-0 pb-[56.25%]">
                  <iframe
                    className="absolute top-0 left-0 w-full h-full"
                    src="https://www.youtube.com/embed/ykexYS9u_hc?si=2p5AdrxPeCuV3uWT"
                    title="STASS Demo"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  ></iframe>
                </div>
              </CardContent>
            </Card>
            <div className="text-center py-6">
              <p className="text-2xl font-medium text-green-700">
                Asegura calidad en tus exportaciones de espárragos
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
