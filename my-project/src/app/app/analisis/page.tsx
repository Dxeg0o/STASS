import QualityControlDashboard from "@/components/app/analisis/dashboard";

export default function QualityControlPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Control de Calidad STASS</h1>
      <QualityControlDashboard />
    </div>
  );
}
