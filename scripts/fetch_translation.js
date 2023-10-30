/**
 * The div element containing the configuration for the noi18n library.
 * @type {HTMLElement}
 */
const noi18nConfigDiv = document.getElementById("noi18n-config");

/**
 * Configuration object for noi18n library.
 * @typedef {Object} Noi18nConfig
 * @property {string} workerUrl - The URL of the worker to use for fetching translations.
 * @property {number} maxPathTags - The maximum number of path tags to use for translation.
 * @property {boolean} allowPureAscii - Whether to allow pure ASCII strings for translation.
 * @property {boolean} allowPureNumbers - Whether to allow pure numeric strings for translation.
 * @property {number} statusCode - The HTTP status code to use for successful translations.
 */

/**
 * The configuration object for the noi18n library.
 * @type {Noi18nConfig}
 */
const noi18nConfig = {
    workerUrl: noi18nConfigDiv.getAttribute("data-worker-url") || 'http://127.0.0.1:8787/cf-api/',
    maxPathTags: parseInt(noi18nConfigDiv.getAttribute("data-max-path-tags")) || 5,
    allowPureAscii: parseBool(noi18nConfigDiv.getAttribute("data-allow-pure-ascii")) || false,
    allowPureNumbers: parseBool(noi18nConfigDiv.getAttribute("data-allow-pure-numbers")) || false,
    statusCode: parseInt(noi18nConfigDiv.getAttribute("data-status-code")) || 200
}

/**
 * Parses a boolean value from a string attribute.
 * @function parseBool
 * @param {string} attrValue - The attribute value to parse.
 * @returns {boolean} - The parsed boolean value.
 */
function parseBool(attrValue) {
    return attrValue === "true";
}

/**
 * Fetches translation data from the server for a given path.
 * @async
 * @function fetchTranslation
 * @param {string} pathName - The path for which to fetch translation data.
 * @returns {Promise<Object>} - A promise that resolves to an object containing translation data.
 */
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

/**
 * Removes leading and ending slashes from a string.
 * @function removeLeadingEndingSlash
 * @param {string} str - The string to remove slashes from.
 * @returns {string} - The string with leading and ending slashes removed.
 */
function removeLeadingEndingSlash(str) {
    return str.replace(/^\/|\/$/g, '');
}

/**
 * Initializes the noi18n library by fetching translation data for the current path.
 * @async
 * @function
 */
(async () => {
    let pathName = removeLeadingEndingSlash(window.location.pathname) || "index";

    if (noi18nConfig.statusCode >= 400)
        pathName = String(noi18nConfig.statusCode);

    window.translationNamespace = pathName;
    window.nsTranslationData = await fetchTranslation(pathName);
    window.allTranslationData = await fetchTranslation("");

    window.translationLoaded = true;

})();