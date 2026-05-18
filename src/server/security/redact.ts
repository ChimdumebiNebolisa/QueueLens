/** Remove obvious high-risk literals before sending text to an external model. */

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE = /\b(?:\+?1[-.\s]*)?(?:(?:\(?\d{3}\)?[-.\s]*)\d{3}[-.\s]*\d{4}|\d{3}[-.\s]*\d{4})\b/g;

export function redactFreeText(input: string): string {
  return input.replace(EMAIL_RE, '[redacted-email]').replace(PHONE_RE, '[redacted-phone]');
}
