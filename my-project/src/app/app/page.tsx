"use client";

import { useContext, useState } from "react";
import { AuthenticationContext } from "../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

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

  // Sample data - replace with real data
  const [analyses, setAnalyses] = useState<Analysis[]>([
    {
      id: "1",
      product: "asparagus",
      date: "2024-03-15",
      status: "active",
      totalCount: 1500,
      passPercentage: 92,
    },
    {
      id: "1",
      product: "asparagus",
      date: "2024-03-15",
      status: "active",
      totalCount: 1500,
      passPercentage: 92,
    },
    {
      id: "1",
      product: "asparagus",
      date: "2024-03-15",
      status: "active",
      totalCount: 1500,
      passPercentage: 92,
    },
    {
      id: "1",
      product: "asparagus",
      date: "2024-03-15",
      status: "active",
      totalCount: 1500,
      passPercentage: 92,
    },
    {
      id: "1",
      product: "asparagus",
      date: "2024-03-15",
      status: "active",
      totalCount: 1500,
      passPercentage: 92,
    },
    {
      id: "1",
      product: "asparagus",
      date: "2024-03-15",
      status: "active",
      totalCount: 1500,
      passPercentage: 92,
    },
    {
      id: "1",
      product: "asparagus",
      date: "2024-03-15",
      status: "active",
      totalCount: 1500,
      passPercentage: 92,
    },
    {
      id: "1",
      product: "asparagus",
      date: "2024-03-15",
      status: "active",
      totalCount: 1500,
      passPercentage: 92,
    },
    {
      id: "1",
      product: "asparagus",
      date: "2024-03-15",
      status: "active",
      totalCount: 1500,
      passPercentage: 92,
    },
    {
      id: "1",
      product: "asparagus",
      date: "2024-03-15",
      status: "active",
      totalCount: 1500,
      passPercentage: 92,
    },
    {
      id: "1",
      product: "asparagus",
      date: "2024-03-15",
      status: "active",
      totalCount: 1500,
      passPercentage: 92,
    },
    {
      id: "1",
      product: "asparagus",
      date: "2024-03-15",
      status: "active",
      totalCount: 1500,
      passPercentage: 92,
    },
    {
      id: "1",
      product: "asparagus",
      date: "2024-03-15",
      status: "active",
      totalCount: 1500,
      passPercentage: 92,
    },
    {
      id: "1",
      product: "asparagus",
      date: "2024-03-15",
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
      id: "2",
      product: "grape",
      date: "2024-03-14",
      status: "completed",
      totalCount: 2800,
      passPercentage: 88,
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
      id: "2",
      product: "grape",
      date: "2024-03-14",
      status: "completed",
      totalCount: 2800,
      passPercentage: 88,
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
      id: "2",
      product: "grape",
      date: "2024-03-14",
      status: "completed",
      totalCount: 2800,
      passPercentage: 88,
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
      id: "2",
      product: "grape",
      date: "2024-03-14",
      status: "completed",
      totalCount: 2800,
      passPercentage: 88,
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
      id: "2",
      product: "grape",
      date: "2024-03-14",
      status: "completed",
      totalCount: 2800,
      passPercentage: 88,
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
      id: "2",
      product: "grape",
      date: "2024-03-14",
      status: "completed",
      totalCount: 2800,
      passPercentage: 88,
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
      id: "2",
      product: "grape",
      date: "2024-03-14",
      status: "completed",
      totalCount: 2800,
      passPercentage: 88,
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
      id: "2",
      product: "grape",
      date: "2024-03-14",
      status: "completed",
      totalCount: 2800,
      passPercentage: 88,
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
      id: "2",
      product: "grape",
      date: "2024-03-14",
      status: "completed",
      totalCount: 2800,
      passPercentage: 88,
    },
    {
      id: "2",
      product: "grape",
      date: "2024-03-14",
      status: "completed",
      totalCount: 2800,
      passPercentage: 88,
    },
    // Add 20+ more sample items...
  ]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  const filteredAnalyses = analyses
    .filter(
      (analysis) =>
        selectedProduct === "all" || analysis.product === selectedProduct
    )
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
              <option value="asparagus">Asparagus</option>
              <option value="grape">Grape</option>
              {/* Add more products */}
            </select>
            <span className="text-sm text-gray-500">
              Showing {filteredAnalyses.length} analyses
            </span>
          </div>
        </div>

        {/* Active Analyses Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center justify-between">
              Active Quality Checks
              <span className="text-sm font-normal text-gray-500">
                {activeAnalyses.length} ongoing analyses
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {activeAnalyses.length === 0 ? (
                <div className="text-gray-500 text-center py-4">
                  No active quality checks
                </div>
              ) : (
                activeAnalyses.map((analysis) => (
                  <AnalysisItem key={analysis.id} analysis={analysis} />
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Historical Analyses Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center justify-between">
              Historical Analysis
              <span className="text-sm font-normal text-gray-500">
                Last {historicalAnalyses.length} quality reports
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
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
                  {historicalAnalyses.length - displayedHistoricalCount}{" "}
                  remaining)
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const AnalysisItem = ({ analysis }: { analysis: Analysis }) => (
  <div className="group p-4 border rounded-lg hover:shadow-md transition-all bg-white grid grid-cols-5 items-center gap-4">
    <div className="col-span-2">
      <h3 className="font-semibold capitalize">{analysis.product}</h3>
      <p className="text-sm text-gray-500">
        {new Date(analysis.date).toLocaleDateString()}
      </p>
    </div>

    <div className="flex items-center gap-2">
      <span
        className={`inline-block w-2 h-2 rounded-full ${
          analysis.status === "active" ? "bg-green-500" : "bg-gray-300"
        }`}
      />
      <span className="text-sm capitalize">{analysis.status}</span>
    </div>

    <div>
      <p className="text-lg font-semibold">
        {analysis.totalCount.toLocaleString()}
      </p>
      <p className="text-sm text-gray-500">Units analyzed</p>
    </div>

    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Pass Rate</span>
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
  </div>
);
