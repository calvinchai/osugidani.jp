

import HandleAPI from './api';
let ORIGIN_URL = '';
let woker_domain = '';
// Rewriter classes
class AttributeRewriter {
  attributeName: string;
  constructor(attributeName: string) {
    this.attributeName = attributeName;
  }
  element(element: Element) {
    const attribute = element.getAttribute(this.attributeName);
    if (attribute) {
      element.setAttribute(
        this.attributeName,
        attribute.replace(ORIGIN_URL, woker_domain)
      );
    }
  }
}

class ScriptRewriter {
  element(element: Element) {
    const srcAttribute = element.getAttribute("src");
    if (srcAttribute) {
      element.setAttribute("src", srcAttribute.replace(ORIGIN_URL, woker_domain));
    }
  }
}

class ScriptAdder {
  scriptUrl: string;
  constructor(scriptUrl: string) {
    this.scriptUrl = scriptUrl;
  }
  element(element: Element) {
    element.append(`<script src="${this.scriptUrl}" async ></script>`, { html: true });
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    
    ORIGIN_URL = env.ORIGIN_URL;
    //remove the last slash for ORIGIN_URL
    if (ORIGIN_URL.endsWith('/')) {
      ORIGIN_URL = ORIGIN_URL.slice(0, -1);
    }
    const SCRIPT_URL = env.GH_PAGE_URL + 'scripts/localize.js';
    const url = new URL(request.url);
    woker_domain = url.origin;

    if (url.pathname.startsWith('/cf-api/')) {
      return HandleAPI.fetch(request, env);
    }

    const new_request = new Request(ORIGIN_URL + url.pathname, request);
    const response = await fetch(new_request);

    if (!response.headers.get("content-type")?.includes("text/html")) {
      return response;
    }

    const transformer = new HTMLRewriter()
      .on("a, link", new AttributeRewriter("href"))
      .on("script", new ScriptRewriter())
      .on("head", new ScriptAdder("https://unpkg.com/i18next/dist/umd/i18next.js"))
      .on("body", new ScriptAdder(SCRIPT_URL));

    return transformer.transform(response);
  },
};

