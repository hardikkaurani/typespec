import { describe, expect, it, vi } from "vitest";
import type { ExtensionContext } from "vscode";
import logger from "../../src/log/logger.js";
import { resolveTypeSpecServer } from "../../src/tsp-executable-resolver.js";
import * as utils from "../../src/utils.js";

vi.mock("../../src/telemetry/telemetry-client.js", () => ({
  default: {
    logOperationDetailTelemetry: vi.fn(),
  },
}));

vi.mock("vscode", () => {
  return {
    workspace: {
      getConfiguration: () => ({
        get: () => undefined,
      }),
      workspaceFolders: [
        {
          uri: { fsPath: "/mock/workspace" },
        },
      ],
      findFiles: vi.fn().mockResolvedValue([]),
    },
  };
});

vi.mock("../../src/utils.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/utils.js")>();
  return {
    ...actual,
    checkInstalledExecutable: vi.fn(),
    checkInstalledNode: vi.fn(),
    checkInstalledTspCli: vi.fn(),
    isFile: vi.fn().mockResolvedValue(false),
    loadModule: vi.fn().mockResolvedValue({
      type: "module",
      path: "/mock/compiler",
    }),
  };
});

describe("resolveTypeSpecServer", () => {
  const mockContext = {
    asAbsolutePath: (path: string) => path,
  } as ExtensionContext;

  it("resolves node command when node is installed on PATH", async () => {
    vi.mocked(utils.checkInstalledNode).mockResolvedValue("/usr/bin/node");

    const result = await resolveTypeSpecServer("test-activity", mockContext);
    expect(result).toBeDefined();
    expect(result?.command).toBe("node");
    expect(result?.args[0]).toContain("tsp-server.js");
  });

  it("resolves tsp cli command when node is missing but tsp is on PATH", async () => {
    vi.mocked(utils.checkInstalledNode).mockResolvedValue("");
    vi.mocked(utils.checkInstalledTspCli).mockResolvedValue("/usr/bin/tsp");

    const result = await resolveTypeSpecServer("test-activity", mockContext);
    expect(result).toBeDefined();
    expect(result?.command).toBe("tsp");
    expect(result?.args).toContain("--server");
  });

  it("returns undefined and logs error popup when neither node nor tsp is on PATH (#11343)", async () => {
    vi.mocked(utils.checkInstalledNode).mockResolvedValue("");
    vi.mocked(utils.checkInstalledTspCli).mockResolvedValue("");
    const errorSpy = vi.spyOn(logger, "error");

    const result = await resolveTypeSpecServer("test-activity", mockContext);
    expect(result).toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("cannot be started because neither 'node' nor 'tsp' is available in PATH"),
      [],
      { showPopup: true, showOutput: true },
    );
  });
});
