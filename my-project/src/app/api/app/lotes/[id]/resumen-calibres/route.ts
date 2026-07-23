import { GET as getResumen } from "../../resumen-calibres/route";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(request.url);
  url.searchParams.set("loteId", id);
  return getResumen(new Request(url, request));
}
