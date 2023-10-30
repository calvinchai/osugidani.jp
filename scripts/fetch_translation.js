const WORKER_URL = 'http://127.0.0.1:8787/cf-api/'

async function postTranslation(namespace) {
    try {
        const response = await fetch(WORKER_URL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-pathname': namespace
            }
        });

        if (response.ok) {
            return response.json();
        } else {
            throw new Error(response.statusText);

        }
    }
    catch (err) {
        console.error("Error fetching translations for namespace:", namespace);
        return {};
    }
}

(async () => {

    namespace = window.location.pathname;
    if (namespace == "/") {
        namespace = "index";
    }

    window.nsTranslationsData = await postTranslation(namespace);
    window.allTranslationsData = await postTranslation();

})();