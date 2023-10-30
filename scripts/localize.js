// const noi18nConfig = {
//     workerUrl: noi18nConfigDiv.getAttribute("data-worker-url") || 'http://127.0.0.1:8787/cf-api/',
//     maxPathTags: parseInt(noi18nConfigDiv.getAttribute("data-max-path-tags")) || 5,
//     allowPureAscii: noi18nConfigDiv.getAttribute("data-allow-pure-ascii") || false,
//     allowPureNumbers: noi18nConfigDiv.getAttribute("data-allow-pure-numbers") || false,
//     statusCode: parseInt(noi18nConfigDiv.getAttribute("data-status-code")) || 200
// }

const i18nData = {};

const validators = {
    isPureAscii: str => /^[\x00-\x7F]+$/.test(str),
    isPureNumbers: str => /^\d+$/.test(str),
    isPureSpace: str => /^\s+$/.test(str)
};

function isValidText(textContent) {
    return textContent &&
        !validators.isPureSpace(textContent) &&
        !(noi18nConfig.allowPureAscii === false && validators.isPureAscii(textContent)) &&
        !(noi18nConfig.allowPureNumbers === false && validators.isPureNumbers(textContent));
}


function addTranslationKeysToElement(element, currentPath = []) {
    if (element.nodeName.toLowerCase() === 'script') {
        return;
    }

    if (element.nodeType !== Node.ELEMENT_NODE) {
        return;
    }
    
    const newPath = (element.nodeName.toLowerCase() === 'html' || element.nodeName.toLowerCase() === 'body')
            ? currentPath
            : [...currentPath, element.nodeName.toLowerCase()].slice(-noi18nConfig.maxPathTags);

        const textContent = Array.from(element.childNodes)
            .filter(n => n.nodeType === Node.TEXT_NODE && n.nodeValue.trim())
            .map(n => n.nodeValue.trim())
            .join(' ').trim();

        if (isValidText(textContent) && !element.getAttribute('data-i18n')) {
            const namespace = newPath.join('_');
            const key = CryptoJS.MD5(textContent).toString();

            i18nData[namespace] = { ...i18nData[namespace], [key]: textContent };
            element.setAttribute('data-i18n', `${namespace}:${key}`);
        }

        element.childNodes.forEach(child => addTranslationKeysToElement(child, newPath));

}

function addTitleToI18nData() {
    const title = document.querySelector('title');
    if (title && isValidText(title.textContent.trim())) {
        const key = CryptoJS.MD5(title.textContent.trim()).toString();
        i18nData['title'] = { [key]: title.textContent.trim() };
        title.setAttribute('data-i18n', `title:${key}`);
    }
}

function applyTranslations() {
    const elements = [...document.querySelectorAll('[data-i18n]')];
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translation = i18next.t(key, { returnNull: true });
        if (!key.includes(translation)) el.textContent = translation;
    });
}

async function postTranslation(data) {
    const pathName = window.translationNamespace;
    await fetch(noi18nConfig.workerUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Pathname': pathName
        },
        body: JSON.stringify(data)
    });
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

(async function runTranslation() {
    try {
        while (!window.translationLoaded) await new Promise(r => setTimeout(r, 100));

        const { nsTranslationData = {}, allTranslationData = {} } = window;
        addTitleToI18nData();
        addTranslationKeysToElement(document.body);

        i18next.init({
            lng: 'en',
            debug: true,
            fallbackNS: 'translation',
            returnNull: false,
            returnEmptyString: false,
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