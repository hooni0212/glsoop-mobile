import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

type MailOptions = {
  subject?: string;
  body?: string;
};

export async function openExternalUrl(url: string): Promise<void> {
  if (/^https?:\/\//i.test(url)) {
    await WebBrowser.openBrowserAsync(url);
    return;
  }
  await Linking.openURL(url);
}

export async function openSupportMail(
  email: string,
  options: MailOptions = {}
): Promise<void> {
  const params = new URLSearchParams();
  if (options.subject?.trim()) params.set("subject", options.subject.trim());
  if (options.body?.trim()) params.set("body", options.body.trim());
  const query = params.toString();
  const url = `mailto:${encodeURIComponent(email)}${query ? `?${query}` : ""}`;
  await openExternalUrl(url);
}
