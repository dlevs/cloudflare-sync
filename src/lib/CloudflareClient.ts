import fs from "node:fs/promises";

export interface CloudflareImage {
  id: string;
  localAbsolutePath: string;
  serverData?: CloudflareImageData;
}

interface CloudflareImageData {
  id: string;
  filename: string;
  uploaded: string;
  requireSignedURLs: boolean;
  variants: string[];
}

export class CloudflareClient {
  accountId: string;
  apiKey: string;

  constructor(accountId: string, apiKey: string) {
    this.accountId = accountId;
    this.apiKey = apiKey;
  }

  async getImages() {
    const images: CloudflareImageData[] = [];
    let page = 0;

    // Exhaust pagination.
    //
    // This is not suitable for use cases with many, many image. But it's
    // fine for small hobbyist sites.
    while (true) {
      page++;

      const params = new URLSearchParams({
        per_page: "100",
        page: page.toString(),
      });
      const { result } = await this.callJSONAPI<{
        result: { images: CloudflareImageData[] };
      }>(`/images/v1?${params}`);

      if (result.images.length) {
        images.push(...result.images);
      } else {
        // No more images to fetch!
        break;
      }
    }

    return images;
  }

  async uploadImage(file: CloudflareImage) {
    const fileContent = await fs.readFile(file.localAbsolutePath);
    const formData = new FormData();
    formData.append("file", new Blob([fileContent]), file.id);
    // Custom ID so we can just use the original filename in the final CDN URL.
    formData.append("id", file.id);

    const result = await this.callJSONAPI("/images/v1", {
      method: "POST",
      body: formData,
    });

    return result;
  }

  private async callJSONAPI<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const result = await fetch(url, {
      ...options,
      headers: { ...this.headers, ...options.headers },
    });
    if (!result.ok) {
      throw new Error(
        `API call failed: ${result.status} ${await result.text()}`
      );
    }

    return result.json();
  }

  private get baseUrl() {
    return `https://api.cloudflare.com/client/v4/accounts/${this.accountId}`;
  }

  private get headers() {
    return { Authorization: `Bearer ${this.apiKey}` };
  }
}
