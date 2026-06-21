export type ToolHandler = (
  args: Record<string, unknown>,
) => unknown | Promise<unknown>;

/** Maps agent function names to client-side handlers and runs them safely. */
export class FunctionRegistry {
  private readonly handlers = new Map<string, ToolHandler>();

  register(name: string, handler: ToolHandler) {
    this.handlers.set(name, handler);
  }

  /** Runs a handler and returns a JSON string for the FunctionCallResponse. */
  async dispatch(
    name: string,
    args: Record<string, unknown>,
  ): Promise<string> {
    const handler = this.handlers.get(name);
    if (!handler) {
      return JSON.stringify({ error: `Unknown function: ${name}` });
    }
    try {
      const result = await handler(args);
      return typeof result === "string"
        ? result
        : JSON.stringify(result ?? { ok: true });
    } catch (err) {
      return JSON.stringify({ error: String(err) });
    }
  }
}
