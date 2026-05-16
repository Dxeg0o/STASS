import { NextResponse } from "next/server";
import {
  getGlobalLotesPayload,
  parseGlobalLotesQuery,
} from "@/app/api/lotes/global/query";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = parseGlobalLotesQuery(searchParams);

  if (!query) {
    return NextResponse.json(
      { error: "empresaId is required" },
      { status: 400 }
    );
  }

  const all = searchParams.get("all") === "true";
  const payload = await getGlobalLotesPayload(query, { paginate: !all });
  return NextResponse.json(payload);
}
