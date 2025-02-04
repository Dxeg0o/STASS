"use client";

import { useContext, useState } from "react";
import { AuthenticationContext } from "../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRange } from "react-day-picker";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { RefreshCw, ChevronDown, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Analysis {
  id: string;
  product: string;
  date: string;
  status: "active" | "completed";
  totalCount: number;
  passPercentage: number;
}

export default function Dashboard() {
  const { data } = useContext(AuthenticationContext);
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [displayedHistoricalCount, setDisplayedHistoricalCount] = useState(5);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Simplified sample data
  const [analyses, setAnalyses] = useState<Analysis[]>([
    {
      id: "1",
      product: "asparagus",
      date: new Date().toISOString(),
      status: "active",
      totalCount: 1500,
      passPercentage: 92,
    },
    {
      id: "2",
      product: "grape",
      date: "2024-03-14",
      status: "completed",
      totalCount: 2800,
      passPercentage: 88,
    },
    {
      id: "3",
      product: "carrot",
      date: "2024-03-13",
      status: "completed",
      totalCount: 4200,
      passPercentage: 95,
    },
  ]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setIsRefreshing(false);
      // Add a new analysis to show refresh working
      setAnalyses((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          product: "apple",
          date: new Date().toISOString(),
          status: "active",
          totalCount: 3200,
          passPercentage: 90,
        },
      ]);
    }, 1000);
  };

  const filterAnalyses = (analysis: Analysis) => {
    const matchesProduct =
      selectedProduct === "all" || analysis.product === selectedProduct;
    const matchesDate =
      !dateRange ||
      (new Date(analysis.date) >= (dateRange.from || new Date(0)) &&
        new Date(analysis.date) <= (dateRange.to || new Date()));
    return matchesProduct && matchesDate;
  };

  const filteredAnalyses = analyses
    .filter(filterAnalyses)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const activeAnalyses = filteredAnalyses.filter((a) => a.status === "active");
  const historicalAnalyses = filteredAnalyses.filter(
    (a) => a.status === "completed"
  );

  return (
    <div className="flex-col md:flex">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">
            Quality Analysis Dashboard
          </h2>
          <div className="flex items-center gap-4">
            <DatePickerWithRange />
            <Button onClick={handleRefresh} disabled={isRefreshing}>
              {isRefreshing ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {/* Filter Section */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="px-4 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Products</option>
              {[...new Set(analyses.map((a) => a.product))].map((product) => (
                <option key={product} value={product}>
                  {product.charAt(0).toUpperCase() + product.slice(1)}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-500">
              Showing {filteredAnalyses.length} analyses
            </span>
          </div>
        </div>

        {/* Active Analyses Section - Only show if there are active analyses */}
        {activeAnalyses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center justify-between">
                Active Quality Checks
                <span className="text-sm font-normal text-gray-500">
                  Real-time monitoring
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {activeAnalyses.map((analysis) => (
                  <AnalysisItem key={analysis.id} analysis={analysis} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Historical Analyses Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center justify-between">
              Historical Analysis
              <span className="text-sm font-normal text-gray-500">
                {historicalAnalyses.length} completed reports
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {historicalAnalyses.length === 0 ? (
                <div className="text-gray-500 text-center py-4">
                  No historical data available
                </div>
              ) : (
                <>
                  {historicalAnalyses
                    .slice(0, displayedHistoricalCount)
                    .map((analysis) => (
                      <AnalysisItem key={analysis.id} analysis={analysis} />
                    ))}

                  {historicalAnalyses.length > displayedHistoricalCount && (
                    <Button
                      variant="ghost"
                      className="w-full text-blue-600 hover:bg-gray-50"
                      onClick={() =>
                        setDisplayedHistoricalCount((prev) => prev + 5)
                      }
                    >
                      <ChevronDown className="mr-2 h-4 w-4" />
                      Load More (
                      {historicalAnalyses.length -
                        displayedHistoricalCount}{" "}
                      remaining)
                    </Button>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const AnalysisItem = ({ analysis }: { analysis: Analysis }) => (
  <div className="group p-4 border rounded-lg hover:shadow-md transition-all bg-white grid grid-cols-[2fr_1fr_1fr_1.5fr_1fr] items-center gap-4 hover:border-blue-100">
    {/* Product Column */}
    <div>
      <h3 className="font-semibold capitalize text-gray-800">
        {analysis.product}
      </h3>
      <p className="text-sm text-gray-500 mt-1">
        {new Date(analysis.date).toLocaleDateString("en-US", {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </p>
    </div>

    {/* Status Column */}
    <div className="flex items-center gap-2">
      <span
        className={`inline-block w-2 h-2 rounded-full ${
          analysis.status === "active"
            ? "bg-green-500 animate-pulse"
            : "bg-gray-300"
        }`}
      />
      <span className="text-sm capitalize text-gray-600">
        {analysis.status}
      </span>
    </div>

    {/* Units Analyzed Column */}
    <div>
      <p className="text-lg font-semibold text-gray-800">
        {analysis.totalCount.toLocaleString()}
      </p>
      <p className="text-sm text-gray-500">Units</p>
    </div>

    {/* Pass Rate Column */}
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Pass Rate</span>
        <span className="text-sm text-gray-500">
          {analysis.passPercentage}%
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 transition-all duration-500"
          style={{ width: `${analysis.passPercentage}%` }}
        />
      </div>
    </div>

    {/* Details Button Column */}
    <div className="flex justify-end">
      <Link href={`/analysis/${analysis.id}`} className="w-full max-w-[160px]">
        <Button
          variant="outline"
          size="sm"
          className="w-full flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:border-blue-300 transition-all"
        >
          <span>Details</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </Link>
    </div>
  </div>
);
