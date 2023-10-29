
import { Octokit } from "octokit";

let octokit: Octokit|null = null;

async function updateRepoJSON() {

  await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
    owner: 'OWNER',
    repo: 'REPO',
    path: 'PATH',
    message: 'my commit message',
    committer: {
      name: 'Monalisa Octocat',
      email: 'octocat@github.com'
    },
    content: 'bXkgbmV3IGZpbGUgY29udGVudHM=',
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })
}

async function getRepoJSON(): Promise<string> {
    try {
        const repoResponse = await fetch(REPO_URL);
        if (!repoResponse.ok) throw new Error("Failed to fetch repo JSON");
        return await repoResponse.text();
    } catch (error) {
        const defaultResponse = await fetch(DEFAULT_JSON_URL);
        return await defaultResponse.text();
    }
}

async function updateRepoIfNeeded(repoJSON: string) {
    const defaultResponse = await fetch(DEFAULT_JSON_URL);
    const defaultJSON = await defaultResponse.text();

    if (repoJSON !== defaultJSON) {
        // Update the repo JSON if different
        await fetch(REPO_URL, {
            method: 'PUT',
            body: defaultJSON,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export default {
    async fetch(request: Request, env:Env ): Promise<Response> {
        
        let pathname =request.headers.get('X-pathname');
        // check the first / in the pathname
        if (pathname && pathname.startsWith('/')) {
            pathname = pathname.slice(1);
        }
        // console.log(request.headers);
        // console.log(pathname);
        // console.log(request.body);
        // print the json 
        octokit = new Octokit({ auth: env.REPO_TOKEN });

        
       
          await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner: env.REPO_OWNER,
            repo: env.REPO_NAME,
            path: pathname,
            headers: {
              'X-GitHub-Api-Version': '2022-11-28'
            }
          })

          const json =  request.json();
        const repoJSON = await getRepoJSON();
        // This will start the update process but won't wait for it
        updateRepoIfNeeded(repoJSON).catch(error => {
            // Handle any errors that occur during the update process
            console.error("Error updating repo:", error);
        });
        https://api.github.com/repos/octokit/octokit.rb/contents/README.md

        return new Response(repoJSON, { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
};