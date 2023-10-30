
import { Octokit } from "octokit";

function flattenAndDiscardTopLevel(json) {
    let result = {};

    for (let key in json) {
        if (typeof json[key] === 'object' && !Array.isArray(json[key])) {
            for (let innerKey in json[key]) {
                result[innerKey] = json[key][innerKey];
            }
        }
    }

    return result;
}

async function updateRepo(pathname: string, request: Request, env: Env) {
    // for (let i = 0; i < 10; i++)
    // {
    //     await new Promise(r => setTimeout(r, 1000));
    //     console.log('waiting for 1 second');
    // }
    let requestBody = await request.json();
    pathname = pathname.replace('/en/', '/jp/');
    console.log(env.GH_PAGE_URL + pathname);
    console.log(requestBody);
    let jpJsonURLContent = {}

    try { jpJsonURLContent = JSON.parse(await fetch(env.GH_PAGE_URL + pathname).then(response => response.text())); }
    catch (e) {
        console.log(e);
    }
    console.log(jpJsonURLContent);
    if (containsAllKeys(jpJsonURLContent, requestBody)) return;
    const octokit = new Octokit({ auth: env.REPO_TOKEN });
    let jpJsonOctokitContent = {}
    let jpSha: string | undefined;

    try {
        const result = await getOctokitContent(octokit, env, pathname);
        jpJsonOctokitContent = result.content;
        jpSha = result.sha;
    }
    catch (e) {
        console.log(e);
    }
    if (jpJsonOctokitContent === undefined) jpJsonOctokitContent = {};

    if (containsAllKeys(jpJsonOctokitContent, requestBody)) return;

    let result = await updateOctokitContent(octokit, env, pathname, jpJsonOctokitContent, requestBody, jpSha);
    console.log(result);
    let allKeysContent = {}
    let allKeysSha: string | undefined;

    try {
        const result = await getOctokitContent(octokit, env, 'locales/jp.json');
        allKeysContent = result.content;
        allKeysSha = result.sha;
    }
    catch (e) {
        console.log(e);
    }
    if (allKeysContent === undefined) allKeysContent = {};
    console.log(requestBody);
    requestBody = flattenAndDiscardTopLevel(requestBody);
    console.log(requestBody);
    if (containsAllKeys(allKeysContent, requestBody)) return;

    result = await updateOctokitContent(octokit, env, 'locales/jp.json', allKeysContent, requestBody, allKeysSha);
    console.log(result);


}
function decodeBase64(base64String) {
    // Decode Base64 string into byte string
    let decodedByteString = atob(base64String);

    // Convert byte string into a Uint8Array
    let uint8Array = new Uint8Array(decodedByteString.split("").map(char => char.charCodeAt(0)));

    // Decode Uint8Array into a string using TextDecoder
    let decoder = new TextDecoder();
    return decoder.decode(uint8Array);
}

async function getOctokitContent(octokit: any, env: Env, path: string) {
    let response = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner: env.REPO_OWNER,
        repo: env.REPO_NAME,
        path: path,
        headers: {
            'X-GitHub-Api-Version': '2022-11-28',
            // 'accept': 'application/vnd.github.raw'
        }
    });
    response = response.data;
    console.log(response);
    if (response.encoding === 'base64')
        {console.log(decodeBase64(response.content));
            return {
            content: JSON.parse(decodeBase64(response.content)),
            
            sha: response.sha
        }}
    return {
        content: JSON.parse(response.data),
        sha: response.sha
    };
}


function containsAllKeys(A, B) {
    // If B is not an object or is an array, return true (nothing to check against)
    if (typeof B !== 'object' || B === null || Array.isArray(B)) {
        return true;
    }

    for (let key in B) {
        // Check if A has the key
        if (!(key in A)) {
            return false;
        }

        // If the value of the current key in B is an object, recursively check its keys
        if (typeof B[key] === 'object' && B[key] !== null) {
            if (!containsAllKeys(A[key], B[key])) {
                return false;
            }
        }
    }

    return true;
}

async function updateOctokitContent(octokit: any, env: Env, path: string, content: any, updates: any, sha: string) {
    for (const ns in updates) {
        if (typeof updates[ns] !== 'object')
            {
                content[ns] = updates[ns];
                continue;
            }
        if (!content[ns]) content[ns] = {};
        Object.assign(content[ns], updates[ns]);
    }

    const contentBase64 = toBase64(JSON.stringify(content, null, 4) + '\n');
    const requestBody = {
        owner: env.REPO_OWNER,
        repo: env.REPO_NAME,
        path: path,
        message: `Update ${path} with missing keys`,
        committer: {
            name: 'Calvin Bot',
            email: 'dev@kchai.me'
        },
        content: contentBase64,
        sha: sha,
        headers: {
            'X-GitHub-Api-Version': '2022-11-28'
        }
    }
    console.log(requestBody);
    await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', requestBody);
}


function toBase64(input: string): string {
    const encoder = new TextEncoder();
    return btoa(String.fromCharCode(...encoder.encode(input)));
}
// async function updateRepo(pathname: string, request: Request, env: Env) {
//     pathname = pathname.replace('en.json', 'jp.json')
//     const jpJson = JSON.parse(await fetch(env.GH_PAGE_URL + pathname).then(response => response.text()))
//     let allFound = true;

//     const octokit = new Octokit({ auth: env.REPO_TOKEN });

//     const response = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
//         owner: env.REPO_OWNER,
//         repo: env.REPO_NAME,
//         path: pathname!,
//         headers: {
//             'X-GitHub-Api-Version': '2022-11-28',
//             'accept': 'application/vnd.github.raw'
//         }
//     });



//     await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
//         owner: 'OWNER',
//         repo: 'REPO',
//         path: 'PATH',
//         message: 'a new commit message',
//         committer: {
//           name: 'Monalisa Octocat',
//           email: 'octocat@github.com'
//         },
//         content: '',
//         sha: '',
//         headers: {
//           'X-GitHub-Api-Version': '2022-11-28'
//         }
//       })
//       const encoder = new TextEncoder();
// const utf8Array = encoder.encode(inputString);

// // Convert the UTF-8 byte array to a Base64-encoded string
// const base64String = btoa(String.fromCharCode(...utf8Array));
// }
export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        // console.log(request.headers);
        let pathname = request.headers.get('X-pathname');
        // console.log(pathname);
        // check the first / in the pathname
        if (!pathname)
            pathname = ''

        else
            if (pathname == '/')

                pathname = 'index'

            else if (pathname[0] == '/')

                pathname = pathname.slice(1)
        if (pathname === '') {
            pathname = 'locales/en.json'
        }
        else {
            if (pathname.endsWith('/'))
                pathname = pathname.slice(0, -1)

            pathname = 'locales/en/' + pathname.replace('/', '_') + '.json'
        }
        if (request.method == 'GET') {
            //env.GH_PAGE_URL+pathname
            return new Response(await fetch(env.GH_PAGE_URL + pathname).then(response => response.text()), { headers: { 'Content-Type': 'application/json' } });
        }
        if (pathname === 'locales/en.json') {
            return new Response("OK");
        }
        await updateRepo(pathname, request, env);
        return new Response("OK");
    }
};