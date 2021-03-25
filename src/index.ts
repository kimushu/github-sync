import * as fs from "fs-extra";
import * as path from "path";
import * as GithubApi from "@octokit/rest";
import { exec } from "child_process";
import { ENGINE_METHOD_ALL } from "constants";

const CONFIG_JSON = path.join(__dirname, "..", "config.json");
const REPOS_DIR = path.join(__dirname, "..", "repos");

function git(params: string, cwd: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        exec(`git ${params}`, {cwd}, (err, stdout, stderr) => {
            if (err) {
                reject(err);
            } else {
                console.log(stderr);
                resolve(stdout);
            }
        });
    });
}

async function sync(config: {source: any, auth: any, ssh_url?: string, excludes?: string[]}): Promise<void> {
    const gh = new GithubApi(Object.assign({}, config.source));
    let { excludes } = config;
    if (excludes == null) {
        excludes = [];
    }

    gh.authenticate(config.auth);
    const repos: GithubApi.ReposListPublicResponseItem[] = [];
    for (let page = 0;; ++page) {
        const result = await (gh.repos as any).getAll({ page });
        repos.push(...result.data);
        if (result.headers.link == null) {
            break;
        }
    }
    for (const repo of repos) {
        let { name, full_name, owner, ssh_url } = repo;
        if (excludes.indexOf(full_name) >= 0) {
            // Skip this repository
            continue;
        }
        if (ssh_url == null) {
            if (config.ssh_url == null) {
                throw new Error(`No SSH URL for ${full_name}`);
            }
            ssh_url = config.ssh_url.replace(
                /\{(host|owner|repo)\}/g,
                (_match, key) => {
                    switch (key) {
                        case "host":
                            return config.source.host;
                        case "owner":
                            return owner.login;
                        case "repo":
                            return name;
                    }
                    return `{${key}}`;
                }
            );
        }
        ssh_url = ssh_url.replace(/^(git@.*):([^:\/]+)\//, (_all, server, owner) => {
            return `ssh://${server}/${owner}/`;
        });
        let base_dir = path.join(REPOS_DIR, owner.login);
        let repo_dir = path.join(base_dir, `${name}.git`);
        await fs.ensureDir(base_dir);
        if (fs.existsSync(repo_dir)) {
            // Already cloned
            console.log(`* Updating a repository: ${full_name}`);
            await git(`remote set-url origin "${ssh_url}"`, repo_dir);
            await git(`fetch --all`, repo_dir);
        } else {
            // Newly clone
            console.log(`* Cloning a new repository: ${full_name}`);
            await git(`clone --mirror "${ssh_url}"`, base_dir);
        }
    }
}

sync(JSON.parse(fs.readFileSync(CONFIG_JSON, "utf8")))
.catch((reason) => {
    console.error(reason);
    process.exitCode = 1;
});
