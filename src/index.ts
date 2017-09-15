import * as fs from "fs-extra";
import * as path from "path";
import * as GithubApi from "github";
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

function sync(config: {source: any, auth: any, ssh_url?: string}): Promise<void> {
    let gh = new GithubApi(Object.assign({}, config.source));

    gh.authenticate(config.auth);
    return gh.repos.getAll({})
    .then((result) => {
        let list = result.data;
        return list.reduce(
            (promise, repo) => {
                let { name, full_name, owner, clone_url, ssh_url } = repo;
                if (ssh_url == null) {
                    if (config.ssh_url == null) {
                        return Promise.reject(new Error(`No SSH URL for ${full_name}`));
                    }
                    ssh_url = config.ssh_url.replace(
                        /:(owner|repo)/g,
                        (match, key) => {
                            switch (key) {
                                case "owner":
                                    return owner.login;
                                case "repo":
                                    return name;
                            }
                            return `:${key}`;
                        }
                    );
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
                        return git(`fetch`, repo_dir);
                    } else {
                        // Newly clone
                        console.log(`* Cloning a new repository: ${full_name}`);
                        return git(`clone --bare "${ssh_url}"`, base_dir);
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
