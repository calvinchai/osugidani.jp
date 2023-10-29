/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
// import * as cheerio from "cheerio";
const ORIGIN_URL = 'https://osugidani.jp';
// Export a default object containing event handlers

const scriptContent =
`
// Configurable settings
const SETTINGS = {
    allowPureAscii: false,
    allowPureNumbers: false,
    maxPathTags: 5
};

function isPureAscii(str) {
    return /^[\\x00-\\x7F]+$/.test(str);
}

function isPureNumbers(str) {
    return /^\d+$/.test(str);
}

function isPureSpace(str) {
    return /^\s+$/.test(str);
}

let i18nData = {};
function hashString(str) {
    // Simple hash function for text
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}
function addTranslationKeysToElement(element, currentPath = []) {
    if (element.nodeType === Node.ELEMENT_NODE) {
        const newPath = (element.nodeName.toLowerCase() === 'html' || element.nodeName.toLowerCase() === 'body')
            ? currentPath
            : currentPath.concat([element.nodeName.toLowerCase()]).slice(-SETTINGS.maxPathTags);

        const textContent = Array.from(element.childNodes)
            .filter(n => n.nodeType === Node.TEXT_NODE && n.nodeValue.trim())
            .map(n => n.nodeValue.trim())
            .join(' ').trim();

        if (textContent && 
            !isPureSpace(textContent) &&
            !(SETTINGS.allowPureAscii === false && isPureAscii(textContent)) &&
            !(SETTINGS.allowPureNumbers === false && isPureNumbers(textContent)) &&
            !element.getAttribute('data-i18n')
        ) {
            const namespace = newPath.join('_');
            const key = hashString(textContent); // Use a hash of the text content as the key

            if (!i18nData[namespace]) {
                i18nData[namespace] = {};
            }
            i18nData[namespace][key] = textContent;

            element.setAttribute('data-i18n', \`\${namespace}:\${key}\`);
        }

        for (let child of element.childNodes) {
            addTranslationKeysToElement(child, newPath);
        }
    }
    

}
function applyTranslations() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translation = i18next.t(key);
        if (translation !== key) { // Only replace if a translation was found
            el.textContent = translation;
        }
    });
}
addTranslationKeysToElement(document.body);
function addTitleToI18nData() {
    const title = document.querySelector('title');
    if (title) {
        const titleText = title.textContent.trim();
        if (titleText &&
            !isPureSpace(titleText) &&
            !(SETTINGS.allowPureAscii === false && isPureAscii(titleText)) &&
            !(SETTINGS.allowPureNumbers === false && isPureNumbers(titleText))
        ) {
            const key = hashString(titleText);
            i18nData['title'] = {
                [key]: titleText
            };
			title.setAttribute('data-i18n', \`title:\${key}\`);
        }
    }
}
addTitleToI18nData();
i18nData['div_nav_ul_li_a']['-531052624']='test'
// console.log(i18nData);  // This will log the built translation JSON to the console
// var script = document.createElement('script');
// script.src = 'https://unpkg.com/i18next/dist/umd/i18next.js'; // replace with your CDN link
// document.body.appendChild(script);
i18next.init({
    lng: 'en', // if you're using a language detector, do not define the lng option
    debug: true,
    resources: {
      en: i18nData
    }
  });


applyTranslations()



`

export default {

	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		let time = new Date().getTime();
		class AttributeRewriter {
			constructor(attributeName) {
			  this.attributeName = attributeName;
			}
			element(element) {
			  const attribute = element.getAttribute(this.attributeName);
			  if (attribute) {
				element.setAttribute(
				  this.attributeName,
				  attribute.replace( ORIGIN_URL,_origin)
				);
				// console.log(element.getAttribute(this.attributeName));
			  }
			}
		  }
		  class ScriptRewriter {
			element(element) {
			  const srcAttribute = element.getAttribute("src");
			  if (srcAttribute) {
				element.setAttribute("src", srcAttribute.replace(ORIGIN_URL, _origin));
			  }
			  // You can also add additional logic here for modifying script content if needed
			}
		  }
		  class scriptAdder {
			element(element) {
				element.append(`<script src="https://unpkg.com/i18next/dist/umd/i18next.js" async ></script>`,{html:true});
			}
		  }
		  class scriptAdder2 {
			element(element) {
				element.append(`<script src="https://raw.githubusercontent.com/calvinchai/translation-osugidani/main/scripts/localize.js" defer></script>`,{html:true});
			}
		  }


		let url = new URL(request.url);
		// console.log(url);
		const _origin = url.origin;
		let new_request = new Request(ORIGIN_URL + url.pathname, request);
		// console.log(new_request);
		let response = await fetch(new_request);
		if (!response.headers.get("content-type")?.includes("text/html")) {
			return response;
		}
		let transformer = new HTMLRewriter().on("a, link", new AttributeRewriter("href")).on("script", new ScriptRewriter()).on("head",new scriptAdder()).on("body",new scriptAdder2());
		let new_response = transformer.transform(response);
		return new_response;
	},
};
// const $ = cheerio.load(await new_response.text());
		// $('*').each(function () {
		// 	const text = $(this).contents().filter(function () {
		// 		return this.nodeType === 3;
		// 	}).text().trim();
		  
		// 	// Check if the element has text content
		// 	if (text) {
		// 		const parentID = $(this).parent().attr('id') || 'default'; // Fallback to 'default' if no parent ID
		// 	  // Add the 'i18next' attribute to the element
			  
		// 	  $(this).attr('i18next', `${parentID}_${this.name}:${text}`);
		// 	}
		//   });

		// new_response = new Response($.html(), new_response);
		// console.log(new Date().getTime() - time);
		

