/** The component-stack lines kept in a Home error entry: enough to name the components, not the whole tree. */
export const HOME_ERROR_STACK_LINES = 30;
const MESSAGE_CHARS = 500;

/**
 * One entry for the Home error log (the plugin's backend writes it to the log folder): the time, what was thrown and
 * the first lines of React's component stack. Pure; never throws.
 */
export function homeErrorEntry(error: unknown, componentStack: string | null | undefined, at: Date = new Date()): string {
    const text = String(error).slice(0, MESSAGE_CHARS);
    const stack = componentStack ? componentStack.split('\n').filter((line) => line.trim() !== '').slice(0, HOME_ERROR_STACK_LINES) : [];
    return [`${at.toISOString()} Home recovered from an error: ${text}`, ...stack].join('\n');
}
