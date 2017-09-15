"use strict";
exports.__esModule = true;
var fs = require("fs-extra");
var path = require("path");
var GithubApi = require("github");
var child_process_1 = require("child_process");
var CONFIG_JSON = path.join(__dirname, "..", "config.json");
var REPOS_DIR = path.join(__dirname, "..", "repos");
function git(params, cwd) {
    return new Promise(function (resolve, reject) {
        child_process_1.exec("git " + params, { cwd: cwd }, function (err, stdout, stderr) {
            if (err) {
                reject(err);
            }
            else {
                console.log(stderr);
                resolve(stdout);
            }
        });
    });
}
function sync(config) {
    var gh = new GithubApi(Object.assign({}, config.source));
    gh.authenticate(config.auth);
    return gh.repos.getAll({})
        .then(function (result) {
        var list = result.data;
        return list.reduce(function (promise, repo) {
            var name = repo.name, full_name = repo.full_name, owner = repo.owner, clone_url = repo.clone_url, ssh_url = repo.ssh_url;
            if (ssh_url == null) {
                if (config.ssh_url == null) {
                    return Promise.reject(new Error("No SSH URL for " + full_name));
                }
                ssh_url = config.ssh_url.replace(/:(owner|repo)/g, function (match, key) {
                    switch (key) {
                        case "owner":
                            return owner.login;
                        case "repo":
                            return name;
                    }
                    return ":" + key;
                });
            }
            var base_dir = path.join(REPOS_DIR, owner.login);
            var repo_dir = path.join(base_dir, name + ".git");
            return promise
                .then(function (result) {
                return fs.ensureDir(base_dir);
            })
                .then(function () {
                if (fs.existsSync(repo_dir)) {
                    // Already cloned
                    console.log("* Updating a repository: " + full_name);
                    return git("fetch", repo_dir);
                }
                else {
                    // Newly clone
                    console.log("* Cloning a new repository: " + full_name);
                    return git("clone --bare \"" + ssh_url + "\"", base_dir);
                }
            });
        }, Promise.resolve());
    });
}
sync(JSON.parse(fs.readFileSync(CONFIG_JSON, "utf8")))["catch"](function (reason) {
    console.error(reason);
    process.exitCode = 1;
});
//# sourceMappingURL=index.js.map