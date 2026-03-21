import { TOOL_DEFINITIONS, callTool } from "./tools";

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_NAME = "planit-mcp";
const SERVER_VERSION = "1.0.0";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

function jsonRpcError(
  id: string | number | null,
  code: number,
  message: string,
): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id: id ?? 0,
    error: { code, message },
  };
}

function handleInitialize(req: JsonRpcRequest): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id: req.id!,
    result: {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {
        tools: { listChanged: false },
      },
      serverInfo: {
        name: SERVER_NAME,
        version: SERVER_VERSION,
      },
    },
  };
}

function handleToolsList(req: JsonRpcRequest): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id: req.id!,
    result: {
      tools: TOOL_DEFINITIONS,
    },
  };
}

function handleToolsCall(req: JsonRpcRequest): JsonRpcResponse {
  const params = req.params as
    | { name?: string; arguments?: Record<string, unknown> }
    | undefined;
  const toolName = params?.name;
  const toolArgs = params?.arguments ?? {};

  if (!toolName) {
    return jsonRpcError(req.id ?? 0, -32602, "Missing tool name");
  }

  const result = callTool(toolName, toolArgs);
  return {
    jsonrpc: "2.0",
    id: req.id!,
    result,
  };
}

export function handleJsonRpcRequest(
  body: unknown,
): JsonRpcResponse | JsonRpcResponse[] | null {
  if (Array.isArray(body)) {
    const responses = body
      .map((req) => handleSingleRequest(req as JsonRpcRequest))
      .filter(Boolean) as JsonRpcResponse[];
    return responses.length > 0 ? responses : null;
  }
  return handleSingleRequest(body as JsonRpcRequest);
}

function handleSingleRequest(
  req: JsonRpcRequest,
): JsonRpcResponse | null {
  if (!req.jsonrpc || req.jsonrpc !== "2.0") {
    return jsonRpcError(req.id ?? null, -32600, "Invalid JSON-RPC version");
  }

  if (req.id === undefined || req.id === null) {
    return null;
  }

  switch (req.method) {
    case "initialize":
      return handleInitialize(req);
    case "tools/list":
      return handleToolsList(req);
    case "tools/call":
      return handleToolsCall(req);
    case "ping":
      return { jsonrpc: "2.0", id: req.id, result: {} };
    default:
      return jsonRpcError(req.id, -32601, `Method not found: ${req.method}`);
  }
}
