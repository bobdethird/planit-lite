import { NextRequest, NextResponse } from "next/server";
import { handleJsonRpcRequest } from "@/lib/mcp/protocol";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      { status: 400 },
    );
  }

  const response = handleJsonRpcRequest(body);

  if (response === null) {
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json(response);
}

export async function GET() {
  return NextResponse.json({
    name: "planit-mcp",
    version: "1.0.0",
    description:
      "PlanIt MCP server — exposes trip scheduling tools for coordinating availability via Poke.",
  });
}
