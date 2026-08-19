export function buildTelegramShareUrl(text: string, resultUrl: string): string {
  const params = new URLSearchParams({ url: resultUrl, text });
  return `https://t.me/share/url?${params.toString()}`;
}

export function buildWebSharePayload(text: string, resultUrl: string) {
  return { title: "Quarenta Safras", text, url: resultUrl };
}

export async function shareOrCopy(text: string, resultUrl: string): Promise<"shared" | "copied"> {
  const payload = buildWebSharePayload(text, resultUrl);
  if (typeof navigator !== "undefined" && navigator.share) {
    await navigator.share(payload);
    return "shared";
  }
  await navigator.clipboard.writeText(`${text}\n${resultUrl}`);
  return "copied";
}
