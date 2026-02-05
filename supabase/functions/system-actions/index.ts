import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  dirname,
  isAbsolute,
  relative,
  resolve,
} from "https://deno.land/std@0.168.0/path/mod.ts";

type SystemActionType = "exec" | "read" | "write" | "list";

interface SystemAction {
  type: SystemActionType;
  payload: Record<string, unknown>;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SANDBOX_ROOT = Deno.env.get("SYSTEM_ACTIONS_ROOT") ?? Deno.cwd();
const ALLOWED_COMMANDS = new Set([
  "ls",
  "pwd",
  "whoami",
  "cat",
  "rg",
  "echo",
  "git",
  "node",
  "npm",
  "pnpm",
  "bun",
]);

const COMMAND_TOKEN_REGEX = /"([^"]*)"|'([^']*)'|(\S+)/g;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const resolveSandboxPath = (inputPath: string) => {
  if (!inputPath || typeof inputPath !== "string") {
    throw new Error("Path is required");
  }

  const resolved = resolve(SANDBOX_ROOT, inputPath.trim());
  const relativePath = relative(SANDBOX_ROOT, resolved);

  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error("Path is outside sandbox");
  }

  return resolved;
};

const parseCommand = (command: string) => {
  const tokens: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = COMMAND_TOKEN_REGEX.exec(command)) !== null) {
    const token = match[1] ?? match[2] ?? match[3];
    if (token) tokens.push(token);
  }

  if (tokens.length === 0) {
    throw new Error("Command is required");
  }

  return tokens;
};

const executeCommand = async (command: string) => {
  const [cmd, ...args] = parseCommand(command);

  if (!ALLOWED_COMMANDS.has(cmd)) {
    throw new Error(`Command not allowed: ${cmd}`);
  }

  const process = new Deno.Command(cmd, {
    args,
    stdout: "piped",
    stderr: "piped",
  });

  const output = await process.output();
  const decoder = new TextDecoder();

  return {
    stdout: decoder.decode(output.stdout),
    stderr: decoder.decode(output.stderr),
    exitCode: output.code,
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const startTime = Date.now();

  try {
    const { action } = await req.json();

    if (!action || typeof action !== "object") {
      return jsonResponse({ error: "Action payload is required" }, 400);
    }

    const typedAction = action as SystemAction;

    if (!typedAction.type) {
      return jsonResponse({ error: "Action type is required" }, 400);
    }

    let result: unknown;
    let success = true;

    switch (typedAction.type) {
      case "exec": {
        const command = typedAction.payload.command as string;
        result = await executeCommand(command);
        success = (result as { exitCode?: number }).exitCode === 0;
        break;
      }
      case "read": {
        const path = resolveSandboxPath(typedAction.payload.path as string);
        const content = await Deno.readTextFile(path);
        const info = await Deno.stat(path);
        result = {
          path,
          content,
          size: info.size,
        };
        break;
      }
      case "write": {
        const path = resolveSandboxPath(typedAction.payload.path as string);
        const content = typedAction.payload.content as string;
        await Deno.mkdir(dirname(path), { recursive: true });
        await Deno.writeTextFile(path, content ?? "");
        const bytesWritten = new TextEncoder().encode(content ?? "").length;
        result = { path, bytesWritten };
        break;
      }
      case "list": {
        const path = resolveSandboxPath(typedAction.payload.path as string);
        const items = [] as Array<{
          name: string;
          isDirectory: boolean;
          isFile: boolean;
          size: number;
        }>;

        for await (const entry of Deno.readDir(path)) {
          const entryPath = resolve(path, entry.name);
          const info = await Deno.stat(entryPath);
          items.push({
            name: entry.name,
            isDirectory: entry.isDirectory,
            isFile: entry.isFile,
            size: info.size,
          });
        }

        result = { path, items };
        break;
      }
      default:
        return jsonResponse({ error: `Unsupported action: ${typedAction.type}` }, 400);
    }

    return jsonResponse({
      success,
      action: typedAction,
      result,
      duration: Date.now() - startTime,
      timestamp: startTime,
    });
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        timestamp: startTime,
      },
      500
    );
  }
});
