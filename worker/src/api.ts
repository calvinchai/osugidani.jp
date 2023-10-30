
import { Octokit } from "octokit";

const GITHUB_API_VERSION = '2022-11-28';
const GLOBAL_TRANS_PATH = 'locales/en.json';
const GLOBAL_KEYS_PATH = 'locales/jp.json';


function flattenAndDiscardTopLevel(json: { [key: string]: { [innerKey: string]: string } }): { [key: string]: string } {
    return Object.values(json)
        .flatMap(value => Object.entries(value))
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
}


function decodeBase64(base64String: string): string {
    const decodedByteString = atob(base64String);
    const uint8Array = new Uint8Array([...decodedByteString].map(char => char.charCodeAt(0)));
    return new TextDecoder().decode(uint8Array);
}

function encodeBase64(input: string): string {
    return btoa(new TextEncoder().encode(input).reduce((data, byte) => data + String.fromCharCode(byte), ""));
}



function containsAllKeys(A: Record<string, any>, B: Record<string, any>): boolean {
    if (typeof B !== 'object' || B === null || Array.isArray(B)) return true;

    return Object.keys(B).every(key => {
        if (!(key in A)) return false;
        return typeof B[key] !== 'object' || containsAllKeys(A[key], B[key]);
    });
}

function deepMerge(originalObject: Record<string, any> , newObject: Record<string, any>): Record<string, any> {
    const result = { ...originalObject };

    for (const key in newObject) {
        if (newObject.hasOwnProperty(key)) {
            if (typeof newObject[key] !== 'object' || newObject[key] === null) {
                result[key] = newObject[key];
            } else if (typeof originalObject[key] !== 'object' || originalObject[key] === null) {
                result[key] = newObject[key];
            } else {
                result[key] = deepMerge(originalObject[key], newObject[key]);
            }
        }
    }

    return result;
}


async function getRepoFile(octokit: any, env: Env, path: string) {
    const { data } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner: env.REPO_OWNER,
        repo: env.REPO_NAME,
        path,
        headers: { 'X-GitHub-Api-Version': GITHUB_API_VERSION }
    });
    const content = data.encoding === 'base64' ? JSON.parse(decodeBase64(data.content)) : JSON.parse(data.content);
    return { content, sha: data.sha };
}

async function putRepoFile(octokit: any, env: Env, path: string, newKeys: Record<string, any>, sha: string) {
   
    const contentBase64 = encodeBase64(JSON.stringify(newKeys, null, 4) + '\n');

    await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
        owner: env.REPO_OWNER,
        repo: env.REPO_NAME,
        path,
        message: `Update ${path} with missing keys`,
        committer: { name: 'Calvin Bot', email: 'dev@kchai.me' },
        content: contentBase64,
        sha,
        headers: { 'X-GitHub-Api-Version': GITHUB_API_VERSION }
    });
}

async function fetchAndUpdateRepoContent(octokit: any, env: Env, keyFilePath: string, newKeys: any) {
    let repoOldKeys, oldFileSHA;
    try {
        const result = await getRepoFile(octokit, env, keyFilePath);
        repoOldKeys = result.content;
        oldFileSHA = result.sha;
    } catch (e: any) {
        console.error(`Failed fetching the repository file: ${e.message}`);
    }

    repoOldKeys = repoOldKeys || {};

    if (!containsAllKeys(repoOldKeys, newKeys)) {
        await putRepoFile(octokit, env, keyFilePath, deepMerge(repoOldKeys, newKeys), oldFileSHA);
    }
}

async function updateRepo(env: Env, keyFilePath: string, newKeys: any) {

    let webOldKeys = {};
    try {
        webOldKeys = JSON.parse(await fetch(new URL(keyFilePath, env.GH_PAGE_URL).toString()).then(res => res.text()));
    } catch (e: any) {
        console.error(`Failed fetching old JSON from web: ${e.message}`);
    }

    if (!containsAllKeys(webOldKeys, newKeys)) {
        const octokit = new Octokit({ auth: env.REPO_TOKEN });
        await fetchAndUpdateRepoContent(octokit, env, keyFilePath, newKeys);
        await fetchAndUpdateRepoContent(octokit, env, GLOBAL_KEYS_PATH, flattenAndDiscardTopLevel(newKeys));
    }
}



export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        // remove the leading and trailing slash
        let keyFilePath = (request.headers.get('X-pathname') || '').replace(/^\/|\/$/g, '');
        
        keyFilePath = keyFilePath ? `locales/en/${keyFilePath.replace(/\//g, '_')}.json` : GLOBAL_TRANS_PATH;
        
        if (request.method === 'GET') {
            const response = await fetch(new URL(keyFilePath, env.GH_PAGE_URL).toString());

            return new Response(response.body, {});
        }

        if (keyFilePath == GLOBAL_TRANS_PATH) return new Response("Method not supported", { status: 405 });

        let newKeys: any;
        try { newKeys = await request.json(); } catch (e: any) { return new Response(`Failed parsing JSON: ${e.message}`, { status: 400 }); }
        keyFilePath = keyFilePath.replace('/en/', '/jp/');
        try {
            await updateRepo(env, keyFilePath, newKeys);
            return new Response("OK", { status: 200 });
        } catch (e: any) {
            return new Response(`Failed updating repository: ${e.message}`, { status: 500 });
        }
    }
};