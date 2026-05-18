/** Remove obvious high-risk literals before sending text to an external model. */

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

export function redactFreeText(input: string): string {
  return input.replace(EMAIL_RE, '[redacted-email]');
}
