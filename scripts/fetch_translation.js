const noi18nConfigDiv = document.getElementById("noi18n-config");
const noi18nConfig = {
    workerUrl: noi18nConfigDiv.getAttribute("data-worker-url") || 'http://127.0.0.1:8787/cf-api/',
    maxPathTags: parseInt(noi18nConfigDiv.getAttribute("data-max-path-tags")) || 5,
    allowPureAscii: noi18nConfigDiv.getAttribute("data-allow-pure-ascii") || false,
    allowPureNumbers: noi18nConfigDiv.getAttribute("data-allow-pure-numbers") || false,
    statusCode: parseInt(noi18nConfigDiv.getAttribute("data-status-code")) || 200
}

async function fetchTranslation(pathName) {
    try {
        const response = await fetch(noi18nConfig.workerUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-pathname': pathName
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log(data);
            return data;
        } else {
            throw new Error(response.statusText);
        }
    }
    catch (err) {
        console.error("Error fetching translations for pathName:", pathName, err);
        return {};
    }
}

function removeLeadingEndingSlash(str) {
    return str.replace(/^\/|\/$/g, '');
}


(async () => {
    let pathName = removeLeadingEndingSlash(window.location.pathname) || "index";

    if (noi18nConfig.statusCode >= 400)
        pathName = String(noi18nConfig.statusCode);

    window.translationNamespace = pathName;
    window.nsTranslationData = await fetchTranslation(pathName);
    window.allTranslationData = await fetchTranslation("");

    window.translationLoaded = true;

})();