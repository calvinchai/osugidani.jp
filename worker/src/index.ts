import HandleAPI from './api';

// Rewriter classes
class AttributeRewriter {
  attributeName: string;
  originBaseUrl: string;
  workerBaseUrl: string;

  constructor(attributeName: string, workerDomain: string, originDomain: string) {
    this.attributeName = attributeName;
    this.workerBaseUrl = workerDomain;
    this.originBaseUrl = originDomain;
  }
  element(element: Element) {
    const attribute = element.getAttribute(this.attributeName);
    if (attribute) {
      element.setAttribute(
        this.attributeName,
        attribute.replace(this.originBaseUrl, this.workerBaseUrl)
      );
    }
  }
}

class ScriptRewriter {
  workerBaseUrl: string;
  originBaseUrl: string;
  constructor(workerDomain: string, originDomain: string) {
    this.workerBaseUrl = workerDomain;
    this.originBaseUrl = originDomain;
  }
  element(element: Element) {
    const srcAttribute = element.getAttribute("src");
    if (srcAttribute) {
      element.setAttribute("src", srcAttribute.replace(this.originBaseUrl, this.workerBaseUrl));
    }
  }
}

class ScriptAdder {
  scriptUrl: string;
  defer: boolean;
  constructor(scriptUrl: string,defer=false) {
    this.scriptUrl = scriptUrl;
    this.defer = defer;
  }
  element(element: Element) {
    if (this.defer){
      element.append(`<script src="${this.scriptUrl}" defer ></script>`, { html: true });
      return
    }
    element.append(`<script src="${this.scriptUrl}" async ></script>`, { html: true });
  }
}
class HeadDivAdder {
  attributes: Object;
  
  constructor(attributes: Object) {
    this.attributes = attributes;
  }
  
  element(element: Element) {
    const attrString = this.attributesToString(this.attributes);
    element.append(`<div ${attrString}></div>`, { html: true });
  }

  attributesToString(attributes: Object): string {
    return Object.entries(attributes)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const workerBaseUrl = url.origin;
    const originBaseUrl = new URL(env.ORIGIN_BASE_URL).origin;
    const workerApiEndpoint = env.WORKER_API_ENDPOINT || "/cf-api";
    
    if (url.pathname.startsWith(workerApiEndpoint)) {
      return HandleAPI.fetch(request, env);
    }
    // console.log(env.ORIGIN_BASE_URL, url.pathname)
    const forwardRequestUrl = new URL(url.pathname,originBaseUrl).toString();
    const forwardRequest = new Request(forwardRequestUrl, request);

    const response = await fetch(forwardRequest);

    if (!response.headers.get("content-type")?.includes("text/html")) {
      return response;
    }
    const frontendConfig = {
      id: "noi18n-config",
      "data-worker-url": new URL(workerApiEndpoint,workerBaseUrl).toString(),
      "data-max-path-tags": env.MAX_PATH_TAGS || 5,
      "data-allow-pure-ascii": env.ALLOW_PURE_ASCII || false,
      "data-allow-pure-numbers": env.ALLOW_PURE_NUMBERS || false,
      "data-status-code": response.status || 200,
    }
    const transformer = new HTMLRewriter()
      // rewrite the origin domain to worker domain
      .on("a, link", new AttributeRewriter("href", workerBaseUrl, originBaseUrl))
      // so the css will load regardless of CORS
      .on("script", new ScriptRewriter(workerBaseUrl, originBaseUrl))
      .on("head", new HeadDivAdder(frontendConfig))
      .on("head", new ScriptAdder("https://unpkg.com/i18next/dist/umd/i18next.js"))
      .on("head", new ScriptAdder("https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.2.0/crypto-js.min.js"))
      .on("head", new ScriptAdder(env.GH_PAGE_URL + 'scripts/fetch_translation.js'))
      .on("body", new ScriptAdder(env.GH_PAGE_URL + 'scripts/localize.js', true));

    // if (response.status>=400){
    //   transformer.on("head", new StatusMetaWriter(response.status));
    // }
    return transformer.transform(response);
  },
};

