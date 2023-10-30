// Configurable settings
const SETTINGS = {
    allowPureAscii: false,
    allowPureNumbers: false,
    maxPathTags: 5
};
//const WORKER_URL = 'http://127.0.0.1:8787/cf-api/'

function isPureAscii(str) {
    return /^[\x00-\x7F]+$/.test(str);
}

function isPureNumbers(str) {
    return /^\d+$/.test(str);
}

function isPureSpace(str) {
    return /^\s+$/.test(str);
}

let i18nData = {};


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
            const key = CryptoJS.MD5(textContent).toString();

            if (!i18nData[namespace]) {
                i18nData[namespace] = {};
            }
            i18nData[namespace][key] = textContent;

            element.setAttribute('data-i18n', `${namespace}:${key}`);
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
            title.setAttribute('data-i18n', `title:${key}`);
        }
    }
}
addTitleToI18nData();
addTranslationKeysToElement(document.body);

async function postTranslation(data) {
    namespace = window.location.pathname;
    if (namespace == "/") {
        namespace = "index";
    }

    fetch(WORKER_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Pathname': namespace
        },
        body: JSON.stringify(data)
    });

}

(async () => {
    try {
        nsTranslationdata = window.nsTranslationdata || {};
        allTranslationdata = window.allTranslationdata || {};

        i18next.init({
            lng: 'en',
            debug: true,
            defaultNS: 'default',
            fallbackNS: 'default',
            resources: {
                en: {
                    default: allTranslationdata,
                    ...nsTranslationdata

                }
            }
        });
        postTranslation(i18nData);
        applyTranslations();
    } catch (err) {
        console.error("Error fetching or applying translations:", err);
    }
})();