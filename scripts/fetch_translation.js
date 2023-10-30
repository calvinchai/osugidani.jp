const WORKER_URL = 'http://127.0.0.1:8787/cf-api/'

async function fetchTranslation(namespace) {
    try {
        const response = await fetch(WORKER_URL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-pathname': namespace
            }
        });
        //console.log(await response.json());
        if (response.ok) {
            const data = await response.json();
            console.log(data);
            return data;
        } else {
            throw new Error(response.statusText);

        }
    }
    catch (err) {
        console.error("Error fetching translations for namespace:", namespace, err);
        return {};
    }
}
// var nsTranslationsData ;
//     var allTranslationsData ;
(async () => {

    namespace = window.location.pathname;
    if (namespace == "/") {
        namespace = "index";
    }
    //check meta for status code 

    
    try{
        statusCode = parseInt(document.querySelector("meta[name='status']").content)
        if (statusCode >=400)
        namespace = String(statusCode);
    }
    catch(err){}
    window.translationNamespace = namespace;
    window.nsTranslationData = await fetchTranslation(namespace);
    window.allTranslationData = await fetchTranslation("");
    // console.log(nsTranslationsData);
    // console.log(allTranslationsData);

    window.translationLoaded = true;

})();