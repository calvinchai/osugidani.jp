// const noi18nConfig = {
//     workerUrl: noi18nConfigDiv.getAttribute("data-worker-url") || 'http://127.0.0.1:8787/cf-api/',
//     maxPathTags: parseInt(noi18nConfigDiv.getAttribute("data-max-path-tags")) || 5,
//     allowPureAscii: noi18nConfigDiv.getAttribute("data-allow-pure-ascii") || false,
//     allowPureNumbers: noi18nConfigDiv.getAttribute("data-allow-pure-numbers") || false,
//     statusCode: parseInt(noi18nConfigDiv.getAttribute("data-status-code")) || 200
// }


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
            : currentPath.concat([element.nodeName.toLowerCase()]).slice(-noi18nConfig.maxPathTags);

        const textContent = Array.from(element.childNodes)
            .filter(n => n.nodeType === Node.TEXT_NODE && n.nodeValue.trim())
            .map(n => n.nodeValue.trim())
            .join(' ').trim();

        if (textContent &&
            !isPureSpace(textContent) &&
            !(noi18nConfig.allowPureAscii === false && isPureAscii(textContent)) &&
            !(noi18nConfig.allowPureNumbers === false && isPureNumbers(textContent)) &&
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
        const translation = i18next.t(key, { returnNull: true });
        if (key.indexOf(translation) == -1) { // Only replace if a translation was found
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
            !(noi18nConfig.allowPureAscii === false && isPureAscii(titleText)) &&
            !(noi18nConfig.allowPureNumbers === false && isPureNumbers(titleText))
        ) {
            const key = CryptoJS.MD5(titleText).toString();
            i18nData['title'] = {
                [key]: titleText
            };
            title.setAttribute('data-i18n', `title:${key}`);
        }
    }
}


async function postTranslation(data) {
    pathName = window.translationNamespace;

    fetch(noi18nConfig.workerUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Pathname': pathName
        },
        body: JSON.stringify(data)
    });

}

(async () => {
    try {
        while (!window.translationLoaded) {
            await new Promise(r => setTimeout(r, 100));
        }
        const nsTranslationData = window.nsTranslationData || {};
        const allTranslationData = window.allTranslationData || {};
        addTitleToI18nData();
        addTranslationKeysToElement(document.body);
        i18next.init({
            lng: 'en',
            debug: true,
            // defaultNS: 'ns',
            fallbackNS: 'translation',
            returnNull: false, // Set this to false
            returnEmptyString: false, // Set this to false
            resources: {
                en: {
                    translation: allTranslationData,
                    ...nsTranslationData

                }
            }
        });
        
        applyTranslations();
        postTranslation(i18nData);
    } catch (err) {
        console.error("Error fetching or applying translations:", err);
    }
})();