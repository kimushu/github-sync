import * as fs from "fs-extra";
import * as path from "path";
import * as GithubApi from "@octokit/rest";
import { exec } from "child_process";

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

function sync(config: {source: any, auth: any, ssh_url?: string, excludes?: string[]}): Promise<void> {
    let gh = new GithubApi(Object.assign({}, config.source));
    let {excludes} = config;
    if (excludes == null) {
        excludes = [];
    }

    gh.authenticate(config.auth);
    let list = [];
    let getPage = (page: number): Promise<void> => {
        return gh.repos.getAll({page})
        .then((result) => {
            if (result.data.length > 0) {
                list.push(...result.data);
                if (result.headers.link != null) {
                    return getPage(page + 1);
                }
            }
        });
    };
    return getPage(1)
    .then(() => {
        return list.reduce(
            (promise, repo) => {
                let { name, full_name, owner, clone_url, ssh_url } = repo;
                if (excludes.indexOf(full_name) >= 0) {
                    // Skip this repository
                    return promise;
                }
                if (ssh_url == null) {
                    if (config.ssh_url == null) {
                        return Promise.reject(new Error(`No SSH URL for ${full_name}`));
                    }
                    ssh_url = config.ssh_url.replace(
                        /\{(host|owner|repo)\}/g,
                        (match, key) => {
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
                if (!ssh_url.startsWith("ssh://")) {
                    ssh_url = `ssh://${ssh_url}`;
                }
                let base_dir = path.join(REPOS_DIR, owner.login);
                let repo_dir = path.join(base_dir, `${name}.git`);
                return promise
                .then((result) => {
                    return fs.ensureDir(base_dir);
                })
                .then(() => {
                    if (fs.existsSync(repo_dir)) {
                        // Already cloned
                        console.log(`* Updating a repository: ${full_name}`);
                        return git(`fetch --all`, repo_dir);
                    } else {
                        // Newly clone
                        console.log(`* Cloning a new repository: ${full_name}`);
                        return git(`clone --mirror "${ssh_url}"`, base_dir);
                    }
                });
            },
            Promise.resolve()
        );
    });
}

sync(JSON.parse(fs.readFileSync(CONFIG_JSON, "utf8")))
.catch((reason) => {
    console.error(reason);
    process.exitCode = 1;
});
