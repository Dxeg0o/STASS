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

  const payload = await getGlobalLotesPayload(query, { paginate: false });
  return NextResponse.json({
    data: payload.data,
    total: payload.total,
    summary: payload.summary,
  });
}
